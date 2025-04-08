const mongoose = require("mongoose");
const { Schema } = mongoose;

const variantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
  },
  price: {
    type: Number,
    required: true,
  },
  offerPrice: {
    type: Number,
  },
  stock: {
    type: Number,
    required: true,
  },
  stockStatus: {
    type: String,
    enum: ["instock", "outofstock"],
    default: "instock",
  },
  attributes: {
    title: String,
    description: String,
  },
  images: [String],
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
});

const Variant = mongoose.model("Variant", variantSchema);
module.exports = Variant;
