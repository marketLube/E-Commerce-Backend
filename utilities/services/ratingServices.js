const Rating = require('../../model/ratingModel')
const Product = require("../../model/productModel");


const updateAverageRating = async (productId) => {
    const ratings = await Rating.find({ productId });

    const totalRatings = ratings.length;
    const sumRatings = ratings.reduce((sum, r) => sum + r.rating, 0);
    const average = totalRatings > 0 ? (sumRatings / totalRatings).toFixed(2) : 0;

    await Product.findByIdAndUpdate(productId, { averageRating: average, totalRatings });
};


const addOrUpdateRating = async (productId, userId, rating, review) => {
    const existingRating = await Rating.findOne({ productId, userId });

    if (existingRating) {
        existingRating.rating = rating;
        existingRating.review = review;
        await existingRating.save();
    } else {
        await Rating.create({ productId, userId, rating, review });
    }

    await updateAverageRating(productId);
};

module.exports = { addOrUpdateRating };
