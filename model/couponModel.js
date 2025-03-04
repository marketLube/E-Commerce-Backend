const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    discountType: { type: String, required: true },
    discountAmount: { type: Number, required: true },
    minPurchase: { type: Number, required: true },
    maxDiscount: { type: Number },
    expiryDate: { type: Date, required: true },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
