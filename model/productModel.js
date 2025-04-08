const { default: mongoose } = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    brand: { type: Schema.Types.ObjectId, ref: "Brand" },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    description: { type: String },
    variants: [{ type: Schema.Types.ObjectId, ref: "Variant" }], // References to Variant documents
    // Fields for non-variant products
    sku: { type: String, unique: true, sparse: true },
    price: { type: Number },
    offerPrice: { type: Number },
    stock: { type: Number },
    size: { type: String },
    images: [String],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    label: { type: Schema.Types.ObjectId, ref: "Label" },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    stockStatus: {
      type: String,
      enum: ["instock", "outofstock"],
      default: "instock",
    },
  },
  { timestamps: true }
);

const Product = new mongoose.model("Product", productSchema);
module.exports = Product;
