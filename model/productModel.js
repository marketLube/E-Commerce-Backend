const { default: mongoose } = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema({
    name: { type: String, required: true, unique: true },
    brandName: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String },
    variants: [{ type: Schema.Types.ObjectId, ref: 'Variant' }], // References to Variant documents
    // Fields for non-variant products
    sku: { type: String, unique: true, sparse: true },
    price: { type: Number },
    offerPrice: { type: Number },
    stock: { type: Number },
    size: { type: String },
    images: [String],
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product
