const couponRouter = require("express").Router();
const {
  createCoupon,
  editCoupon,
  searchCoupon,
  removeCoupon,
  getAllCoupons,
} = require("../../controllers/couponController");

couponRouter.route("/search").get(searchCoupon);
couponRouter.route("/").post(createCoupon).get(getAllCoupons);
couponRouter.route("/:id").patch(editCoupon).delete(removeCoupon);
module.exports = couponRouter;
