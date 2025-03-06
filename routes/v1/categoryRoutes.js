const {
  addCategory,
  getAllCategories,
  updateCategoryOffer,
  editCategory,
  removeOfferFromCategory,
  searchCategory,
  deleteCategory,
} = require("../../controllers/categoryController");
const autheticateToken = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/multer");

const categoryRouter = require("express").Router();

categoryRouter.post(
  "/addcategory",
  autheticateToken(["admin"]),
  upload.any(),
  addCategory
);
categoryRouter.get("/allcategories", getAllCategories);
categoryRouter.patch(
  "/addoffer/:categoryId",
  autheticateToken(["admin"]),
  updateCategoryOffer
);
categoryRouter.patch(
  "/editcategory/:categoryId",
  autheticateToken(["admin"]),
  upload.any(),
  editCategory
);
categoryRouter.patch(
  "/removeoffer/:categoryId",
  autheticateToken(["admin"]),
  removeOfferFromCategory
);
categoryRouter.get("/search", searchCategory);
categoryRouter.delete(
  "/deletecategory/:categoryId",
  autheticateToken(["admin"]),
  deleteCategory
);

module.exports = categoryRouter;
