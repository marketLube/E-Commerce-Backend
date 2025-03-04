const Product = require("../model/productModel");
const Rating = require("../model/ratingModel");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");

const getProductReviews = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const reviews = await Rating.find({ productId }).populate(
    "userId",
    "name email"
  );

  res.status(200).json(reviews);
});

const updateAverageRating = async (productId) => {
  try {
    const ratings = await Rating.find({ productId });

    const totalRatings = ratings.length;
    const sumRatings = ratings.reduce((sum, r) => sum + r.rating, 0);
    const average =
      totalRatings > 0 ? (sumRatings / totalRatings).toFixed(2) : 0;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { averageRating: average, totalRatings },
      { new: true }
    );

    console.log(`✅ Average rating updated for product: ${productId}`);
    return updatedProduct;
  } catch (error) {
    console.error("❌ Error updating average rating:", error);
    return false;
  }
};

const addOrUpdateRating = catchAsync(async (req, res, next) => {
  const { productId, rating, review } = req.body;
  const userId = req.user;

  if (!productId || !rating || !review) {
    return next(new AppError("All Fields are required", 400));
  }
  const existingRating = await Rating.findOne({ productId, userId });

  let latestRating;
  if (existingRating) {
    existingRating.rating = rating;
    existingRating.review = review;
    latestRating = await existingRating.save();
  } else {
    const newRating = new Rating({ productId, userId, rating, review });
    latestRating = await newRating.save();
  }

  const updated = await updateAverageRating(productId);
  if (!updated) {
    return next(new AppError("Something went wrong", 500));
  }

  res.status(201).json({ message: "rating added", latestRating });
});

const getAllReviews = catchAsync(async (req, res) => {
  const reviews = await Rating.find()
    .populate("userId", "username email")
    .populate("productId", "name");
  console.log(reviews);
  res.status(200).json({ reviews });
});

const deleteReview = catchAsync(async (req, res) => {
  const { reviewId } = req.params;
  await Rating.findByIdAndDelete(reviewId);
  res.status(200).json({ message: "Review deleted" });
});

module.exports = {
  getProductReviews,
  addOrUpdateRating,
  getAllReviews,
  deleteReview,
};
