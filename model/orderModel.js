const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variantId: { type: Schema.Types.ObjectId, ref: "Variant" }, // Optional, if variants are used
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    deliveryAddress: { type: Object },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "processed",
        "shipped",
        "delivered",
        "cancelled",
        // "refunded",
        // "onrefund",
      ],
      default: "pending",
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    couponApplied: { type: Object },
    expectedDelivery: {
      type: Date,
      default: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    paymentMethod: { type: String, enum: ["COD", "ONLINE"], default: "COD" },
    paymentId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

orderSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  next();
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
