const couponRouter = require("express").Router();
const {
  applyCoupon,
  createCoupon,
  editCoupon,
  removeCoupon,
  searchCoupon,
  getAllCoupons,
} = require("../../controllers/couponController");
const authenticateToken = require("../../middlewares/authMiddleware");

couponRouter.post("/apply", authenticateToken(["user"]), applyCoupon);
couponRouter.route("/search").get(searchCoupon);
couponRouter
  .route("/")
  .post(authenticateToken(["admin"]), createCoupon)
  .get(getAllCoupons);
couponRouter
  .route("/:id")
  .patch(authenticateToken(["admin"]), editCoupon)
  .delete(authenticateToken(["admin"]), removeCoupon);
module.exports = couponRouter;
