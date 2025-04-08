const Product = require("../model/productModel");
const Rating = require("../model/ratingModel");
const uploadToCloudinary = require("../utilities/cloudinaryUpload");
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
    // Get all ratings for the product
    const ratings = await Rating.find({ productId });

    // Calculate total ratings and average
    const totalRatings = ratings.length;
    const sumRatings = ratings.reduce((sum, r) => sum + r.rating, 0);
    const average =
      totalRatings > 0 ? Math.round((sumRatings / totalRatings) * 10) / 10 : 0;

    // Update rating distribution
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    ratings.forEach((r) => {
      ratingDistribution[r.rating]++;
    });

    // Update rating stats
    const ratingStats = {
      totalRatings,
      averageRating: average,
      ratingCounts: ratingDistribution,
    };

    // Update the product with all rating information
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        averageRating: average,
        totalRatings,
        ratingDistribution,
        ratingStats,
        ratings: ratings, // Include all ratings
      },
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
  let image;

  if (req.files && req.files.length > 0) {
    // Handle main brand image

    const imageFile = req.files.find((file) => file.fieldname === "image");

    if (imageFile) {
      const uploadedImage = await uploadToCloudinary(imageFile.buffer);
      image = uploadedImage;
    }
  }

  let latestRating;
  if (existingRating) {
    existingRating.rating = rating;
    existingRating.review = review;
    existingRating.image = image;
    latestRating = await existingRating.save();
  } else {
    const newRating = new Rating({ productId, userId, rating, review, image });
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
  res.status(200).json({ reviews });
});

const deleteReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;

  // Find the review first to get the productId
  const review = await Rating.findById(reviewId);
  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  // Delete the review
  await Rating.findByIdAndDelete(reviewId);

  // Get all remaining ratings for the product
  const remainingRatings = await Rating.find({ productId: review.productId });

  // Calculate new rating values
  const totalRatings = remainingRatings.length;
  const sumRatings = remainingRatings.reduce((sum, r) => sum + r.rating, 0);
  const average =
    totalRatings > 0 ? Math.round((sumRatings / totalRatings) * 10) / 10 : 0;

  // Update the product directly
  const updatedProduct = await Product.findByIdAndUpdate(
    review.productId,
    {
      averageRating: average,
      totalRatings: totalRatings,
      ratings: remainingRatings,
    },
    { new: true }
  );

  if (!updatedProduct) {
    return next(new AppError("Error updating product rating", 500));
  }

  res.status(200).json({
    message: "Review deleted",
    updatedRating: {
      average,
      totalRatings,
    },
  });
});

module.exports = {
  getProductReviews,
  addOrUpdateRating,
  getAllReviews,
  deleteReview,
};
