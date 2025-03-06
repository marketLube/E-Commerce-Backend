const {
  createBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  searchBrand,
} = require("../../controllers/brandController");
const autheticateToken = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/multer");

const brandRouter = require("express").Router();

brandRouter
  .route("/")
  .post(autheticateToken(["admin", "seller"]), upload.any(), createBrand) // Create a new brand
  .get(getAllBrands); // Get all brands

brandRouter.route("/search").get(searchBrand);
brandRouter
  .route("/:id")
  .get(getBrandById) // Get a brand by ID
  .patch(autheticateToken(["admin", "seller"]), upload.any(), updateBrand) // Update a brand by ID
  .delete(autheticateToken(["admin", "seller"]), deleteBrand); // Delete a brand by ID

module.exports = brandRouter;
