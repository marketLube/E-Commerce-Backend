const {
  getProductReviews,
  addOrUpdateRating,
  getAllReviews,
  deleteReview,
} = require("../../controllers/reviewController");
const autheticateToken = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/multer");

const reviewRouter = require("express").Router();

reviewRouter.get("/get-reviews/:productId", getProductReviews);
reviewRouter.post("/add-review", autheticateToken(["user"]), upload.any(), addOrUpdateRating);
reviewRouter.get("/get-all-reviews", getAllReviews);
reviewRouter.delete("/delete-review/:reviewId", deleteReview);
module.exports = reviewRouter;
