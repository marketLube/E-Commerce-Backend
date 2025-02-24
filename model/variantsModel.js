const mongoose = require('mongoose');
const { Schema } = mongoose;

const variantSchema = new Schema({
    sku: { type: String, required: true, unique: true },
    attributes: {
        color: { type: String },
        size: { type: String },
        // Add other attributes as needed
    },
    price: { type: Number, required: true },
    offerPrice: { type: Number },
    stock: { type: Number, required: true },
    images: [String], // Array of image URLs or paths
}, { timestamps: true });

const Variant = mongoose.model('Variant', variantSchema);
module.exports = Variant