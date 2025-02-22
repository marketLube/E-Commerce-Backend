const mongoose = require('mongoose')


const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        min: 3,
        trim: true,
    },
    productCode: {
        type: String,
        required: true,
        unique: true
    },
    productDescription: {
        type: String
    },

    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    originalPrice: { type: Number, required: true }, // Always store original price
    offerPrice: { type: Number },
    productImages: {
        type: [String],
        required: true,
        validate: {
            validator: function (value) {
                return value.length > 0;
            },
            message: 'At least one product image is required.'
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    label: { type: mongoose.Schema.Types.ObjectId, ref: "Label" },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 } ,
    stock: { type: Number, min: 0 },
}, { timestamps: true })






module.exports = new mongoose.model("Product", productSchema)