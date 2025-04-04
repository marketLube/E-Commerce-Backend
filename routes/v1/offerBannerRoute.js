const {
  createOfferBanner,
  getAllOfferBanners,
  deleteOfferBanner,
  updateOfferBanner,
} = require("../../controllers/offerBannerController");
const autheticateToken = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/multer");

const offerBannerRouter = require("express").Router();

offerBannerRouter
  .route("/")
  .post(autheticateToken(["admin"]), upload.any(), createOfferBanner)
  .get(getAllOfferBanners);

offerBannerRouter
  .route("/:id")
  .delete(autheticateToken(["admin"]), deleteOfferBanner)
  .patch(autheticateToken(["admin"]), upload.any(), updateOfferBanner);

module.exports = offerBannerRouter;
