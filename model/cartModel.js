const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    variant: {
      type: Schema.Types.ObjectId,
      ref: "Variant",
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: [1, "Quantity cannot be less than 1"],
    },
    price: {
      type: Number,
      required: true,
    },
    offerPrice: {
      type: Number,
    },
  },
  { _id: false }
);

// Ensure that either 'product' or 'variant' is present
cartItemSchema.pre("validate", function (next) {
  if (!this.product && !this.variant) {
    next(
      new Error("A cart item must reference either a product or a variant.")
    );
  } else {
    next();
  }
});

const cartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    couponApplied: {
      couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
      code: String,
      discountType: String,
      discountAmount: Number,
      originalAmount: Number,
      finalAmount: Number,
    },
    coupon: {
      code: String,
      discountType: String,
      discountAmount: Number,
      originalAmount: Number,
      finalAmount: Number,
    },
    totalQuantity: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

cartSchema.methods.calculateTotalQuantity = function () {
  this.totalQuantity = this.items.reduce(
    (total, item) => total + item.quantity,
    0
  );
  return this.totalQuantity;
};

module.exports = mongoose.model("Cart", cartSchema);
