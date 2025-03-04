const Coupon = require("../model/couponModel");
const catchAsync = require("../utilities/errorHandlings/catchAsync");

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

  const coupons = await Coupon.find({ code: { $regex: q, $options: "i" } });

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
  const coupons = await Coupon.find();
  res.status(200).json({ coupons });
});

module.exports = {
  createCoupon,
  editCoupon,
  searchCoupon,
  removeCoupon,
  getAllCoupons,
};
