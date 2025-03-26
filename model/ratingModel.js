const mongoose = require("mongoose");
const { Schema } = mongoose;

const ratingSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String },
    image: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Rating", ratingSchema);
