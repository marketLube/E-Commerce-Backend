const { formatCartResponse } = require("../helpers/cartHelpers/cartHelper");
const cartModel = require("../model/cartModel");
const Coupon = require("../model/couponModel");
const productModel = require("../model/productModel");
const Variant = require("../model/variantsModel");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const { checkCoupon } = require("../helpers/cartHelpers/cartHelper");

// Helper function to recalculate total price
const recalcTotalPrice = (cart) => {
  cart.totalPrice = cart.items.reduce((total, item) => {
    return total + item.offerPrice * item.quantity;
  }, 0);

  return cart;
};


const addToCart = catchAsync(async (req, res, next) => {
  const { productId, variantId, quantity = 1 } = req.body;

  const userId = req.user;

  let product, variant;

  if (variantId) {
    // Validate that the variant exists
    variant = await Variant.findById(variantId).populate("product");
    if (!variant) {
      return next(new AppError("Variant not found", 404));
    }
    product = variant.product;
  } else if (productId) {
    // Validate that the product exists
    product = await productModel.findById(productId);
    if (!product) {
      return next(new AppError("Product not found", 404));
    }
  } else {
    return next(new AppError("Product or Variant ID must be provided", 400));
  }

  let cart = await cartModel.findOne({ user: userId });

  if (!cart) {
    cart = new cartModel({ user: userId, items: [] });
  }

  // Check if the product/variant is already in the cart
  const existingItemIndex = cart.items.findIndex(
    (item) =>
      (variantId && item.variant && item.variant.toString() === variantId) ||
      (productId &&
        !variantId &&
        item.product &&
        item.product.toString() === productId)
  );

  if (existingItemIndex > -1) {
    // If exists, increase the quantity
    cart.items[existingItemIndex].quantity += quantity;
  } else {
    // Otherwise, add as a new item

    const newItem = {
      quantity,
      price: variant ? variant.price : product.price,
      offerPrice: variant ? variant.offerPrice : product.offerPrice,
      product: productId,
      variant: variantId,
    };

    cart.items.push(newItem);
  }

  // Recalculate total price
  cart.totalPrice = cart.items.reduce((total, item) => {
    return total + (item.offerPrice || item.price) * item.quantity;
  }, 0);

  // After recalculating total price
  cart = await checkCoupon(cart);
  await cart.save();

  // Fetch the populated cart to format the response
  const populatedCart = await cartModel
    .findById(cart._id)
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

  const formattedCart = formatCartResponse(populatedCart);

  res.status(200).json({
    success: true,
    message: "Item added to cart successfully",
    data: formattedCart,
  });
});

const removeFromCart = catchAsync(async (req, res, next) => {
  const { productId, variantId } = req.body;
  const userId = req.user;

  let cart = await cartModel.findOne({ user: userId });
  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  // Updated filter logic to correctly handle variant and non-variant products
  cart.items = cart.items.filter((item) => {
    if (variantId) {
      // If removing a variant product, only remove the specific variant
      return !(item.variant && item.variant.toString() === variantId);
    } else if (productId) {
      // If removing a non-variant product, only remove products without variants
      return !(item.product.toString() === productId && !item.variant);
    }
    return true;
  });

  // Recalculate total price;
  recalcTotalPrice(cart);
  // Replace the existing coupon check with this
  cart = await checkCoupon(cart);
  const updatedCart = await cart.save();
  // console.log(updatedCart ,"cart",variant.offerPrice,"<u></u>");
  // updatedCart.couponApplied.finalAmount -= variant ? variant.offerPrice : product.offerPrice;
  // await updatedCart.save();

  if (updatedCart.couponApplied) {
    if (updatedCart.items.length === 0) {
      updatedCart.couponApplied = null;
      await updatedCart.save();
    } else if (updatedCart.items.length > 0 ) {

      // const isCouponApplied = await Coupon.findOne({_id: updatedCart.couponApplied.couponId});

      // if (isCouponApplied && isCouponApplied.minCartAmount > updatedCart.totalPrice) {
      //   updatedCart.couponApplied = null;
      //   updatedCart.coupon.finalAmount = 0;
      //   await updatedCart.save();
      // }
    }
  }



  // Fetch the populated cart to format the response
  const populatedCart = await cartModel
    .findById(cart._id)
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

  const formattedCart = formatCartResponse(populatedCart);

  res.status(200).json({
    success: true,
    message: "Item removed from cart successfully",
    data: formattedCart,
  });
});

const clearCart = catchAsync(async (req, res, next) => {
  const userId = req.user;

  let cart = await cartModel.findOne({ user: userId });
  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  cart.items = [];
  cart.totalPrice = 0;
  await cart.save();

  const formattedCart = formatCartResponse(cart);

  res.status(200).json({
    success: true,
    message: "Cart cleared successfully",
    data: formattedCart,
  });
});

const getCart = catchAsync(async (req, res, next) => {
  const userId = req.user;

  // Find the user's cart and populate necessary fields
  const cart = await cartModel
    .findOne({ user: userId })
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
    })
    .populate({
      path: "couponApplied.couponId",
      select: "code discountType description",
    });

  if (!cart) {
    const newCart = new cartModel({ user: userId, items: [] });
    await newCart.save();
    return res.status(200).json({
      success: true,
      message: "Cart retrieved successfully",
      data: newCart,
    });
    // return next(new AppError("Cart not found", 404));
  }

  const formattedCart = formatCartResponse(cart);

  // Add coupon details to the response if a coupon is applied
  let responseData = { formattedCart };

  if (cart.couponApplied) {
    responseData.couponDetails = {
      _id: cart?.couponApplied?.couponId?._id,
      code: cart?.couponApplied?.couponId?.code,
      discountType: cart?.couponApplied?.discountType,
      originalAmount: cart?.couponApplied?.originalAmount,
      discountAmount: cart?.couponApplied?.discountAmount,
      finalAmount: cart?.couponApplied?.finalAmount,
      savings: cart?.couponApplied?.discountAmount,
      description: cart?.couponApplied?.couponId?.description,
    };
    responseData.finalAmount = cart?.couponApplied?.finalAmount;
  } else {
    responseData.finalAmount = cart?.totalPrice;
  }

  res.status(200).json({
    success: true,
    message: "Cart retrieved successfully",
    data: responseData,
  });
});

const updateCartItem = catchAsync(async (req, res, next) => {
  const { productId, variantId, action } = req.body;
  const userId = req.user;

  if (!productId && variantId) {
    return next(
      new AppError("Invalid request: variantId provided without productId", 400)
    );
  }

  // Find the user's cart
  let cart = await cartModel.findOne({ user: userId });
  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  // Find the index of the item to update
  const itemIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === productId &&
      ((variantId && item.variant && item.variant.toString() === variantId) ||
        (!variantId && !item.variant))
  );

  if (itemIndex === -1) {
    return next(new AppError("Item not found in cart", 404));
  }

  // Update quantity based on action
  if (action === "increment") {
    cart.items[itemIndex].quantity += 1;
  } else if (action === "decrement") {
    if (cart.items[itemIndex].quantity === 1) {
      cart.items.splice(itemIndex, 1); // Remove item if quantity is 1
    } else {
      cart.items[itemIndex].quantity -= 1;
    }
  } else {
    return next(
      new AppError("Invalid action. Use 'increment' or 'decrement'", 400)
    );
  }

  // Recalculate total price
  recalcTotalPrice(cart);
  // Add coupon check before saving
  cart = await checkCoupon(cart);
  await cart.save();

  // Fetch the populated cart to format the response
  const populatedCart = await cartModel
    .findById(cart._id)
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

  const formattedCart = formatCartResponse(populatedCart);

  res.status(200).json({
    success: true,
    message: "Cart item updated successfully",
    data: formattedCart,
  });
});

module.exports = {
  addToCart,
  clearCart,
  removeFromCart,
  getCart,
  updateCartItem,
};
