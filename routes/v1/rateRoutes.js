const { getProductRatings, addOrUpdateRating } = require("../../controllers/ratingController")
const autheticateToken = require("../../middlewares/authMiddleware")

const ratingRouter = require("express").Router()



ratingRouter.get("/get-ratings/:productId", getProductRatings)
ratingRouter.post("/add-ratings", autheticateToken(["user"]), addOrUpdateRating)



module.exports = ratingRouter