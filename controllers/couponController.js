const Coupon = require("../model/couponModel");
const Cart = require("../model/cartModel");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const { formatCartResponse } = require("../helpers/cartHelpers/cartHelper");

const createCoupon = catchAsync(async (req, res) => {
  const {
    code,
    discountType,
    discountAmount,
    minPurchase,
    maxDiscount,
    expiryDate,
    description,
  } = req.body;

  const coupon = new Coupon({
    code,
    discountType,
    discountAmount,
    minPurchase,
    maxDiscount,
    expiryDate,
    description,
  });

  const savedCoupon = await coupon.save();

  res.status(201).json({ coupon: savedCoupon });
});

const editCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  const {
    code,
    discountType,
    discountAmount,
    minPurchase,
    maxDiscount,
    expiryDate,
    description,
  } = req.body;

  const coupon = await Coupon.findByIdAndUpdate(
    id,
    {
      code,
      discountType,
      discountAmount,
      minPurchase,
      maxDiscount,
      expiryDate,
      description,
    },
    { new: true }
  );
  res.status(200).json({ coupon });
});

const searchCoupon = catchAsync(async (req, res) => {
  const { q } = req.query;

  const coupons = await Coupon.find({
    code: { $regex: q, $options: "i" },
    isActive: true,
    expiryDate: { $gt: new Date() },
  });

  res.status(200).json({
    status: "success",
    count: coupons.length,
    data: {
      coupons,
    },
  });
});

const removeCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  await Coupon.findByIdAndDelete(id);
  res.status(200).json({ message: "Coupon removed successfully" });
});

const getAllCoupons = catchAsync(async (req, res) => {
  const coupons = await Coupon.find({
    isActive: true,
    expiryDate: { $gt: new Date() },
  });
  res.status(200).json({ coupons });
});

const applyCoupon = catchAsync(async (req, res, next) => {
  const { couponId } = req.body;
  const userId = req.user;

  // Find the cart for the user
  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: "items.product",
      select: "name description images brand category",
    })
    .populate({
      path: "items.variant",
      select: "sku price offerPrice stock stockStatus attributes images",
    });

  if (!cart || cart.items.length === 0) {
    return next(new AppError("Cart not found or empty", 404));
  }

  // Find the coupon
  const coupon = await Coupon.findOne({
    _id: couponId,
    isActive: true,
    expiryDate: { $gt: new Date() },
  });

  if (!coupon) {
    return next(new AppError("Invalid or expired coupon", 400));
  }

  // Calculate cart total (using the existing totalPrice)
  const cartTotal = cart.totalPrice;

  // Check minimum purchase requirement
  if (cartTotal < coupon.minPurchase) {
    return next(
      new AppError(
        `Minimum purchase of ₹${coupon.minPurchase} required to use this coupon`,
        400
      )
    );
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = Math.floor((cartTotal * coupon.discountAmount) / 100);
    // Apply maximum discount limit if set
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else if (coupon.discountType === "fixed") {
    discountAmount = coupon.discountAmount;
  }

  // Calculate final amount
  const finalAmount = cartTotal - discountAmount;

  // Update cart with coupon details
  cart.couponApplied = {
    couponId: coupon._id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountAmount: discountAmount,
    originalAmount: cartTotal,
    finalAmount: finalAmount,
  };
  cart.couponStatus = true;

  const updatedCart = await cart.save();

  // Format the response using your existing cart formatter
  const formattedCart = {
    ...formatCartResponse(updatedCart),
    couponDetails: {
      code: coupon.code,
      discountType: coupon.discountType,
      originalAmount: cartTotal,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      savings: discountAmount,
      description: coupon.description,
    },
  };

  res.status(200).json({
    success: true,
    message: "Coupon applied successfully",
    data: { formattedCart, finalAmount },
  });
});

const removeCouponFromCart = catchAsync(async (req, res, next) => {
  const userId = req.user;

  // Find the cart and populate necessary fields
  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: "items.product",
      select: "name description images brand category",
      populate: [
        { path: "brand", select: "name" },
        { path: "category", select: "name" },
      ],
    })
    .populate({
      path: "items.variant",
      select: "sku price offerPrice stock stockStatus attributes images",
    });

  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  if (!cart.couponApplied) {
    return next(new AppError("No coupon applied to remove", 400));
  }

  // Remove coupon details
  cart.couponApplied = undefined;
  cart.couponStatus = false;
  const updatedCart = await cart.save();

  // Format the response using your existing cart formatter
  const formattedCart = formatCartResponse(updatedCart);

  // Structure response data to match other cart operations
  const responseData = {
    formattedCart,
    finalAmount: updatedCart.totalPrice,
  };

  res.status(200).json({
    success: true,
    message: "Coupon removed successfully",
    data: responseData,
  });
});

module.exports = {
  createCoupon,
  editCoupon,
  searchCoupon,
  removeCoupon,
  getAllCoupons,
  applyCoupon,
  removeCouponFromCart,
};
