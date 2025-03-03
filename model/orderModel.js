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
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "processed",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "onrefund",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "onrefund", "processed"],
      default: "pending",
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Middleware to exclude soft-deleted orders from queries by default
orderSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  next();
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
