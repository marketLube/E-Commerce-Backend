const {
  addProduct,
  listProducts,
  getProductDetails,
  updateProduct,
  deleteProduct,
  getProductsByLabel,
  getGroupedProductsByLabel,
  getGroupedProductsByRating,
  searchProducts,
  softDeleteProduct,
} = require("../../controllers/productController");
const autheticateToken = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/multer");

const productRouter = require("express").Router();

productRouter.get("/get-products", listProducts);
productRouter.get("/get-product/:productId", getProductDetails);
productRouter.get("/get-product-bylabel/:labelId", getProductsByLabel);
productRouter.get("/get-grouped-products-label", getGroupedProductsByLabel);
productRouter.get("/get-grouped-products-rating", getGroupedProductsByRating);

productRouter.get("/search", searchProducts);

productRouter.post(
  "/addproduct",
  autheticateToken(["admin", "seller"]),
  upload.any(),
  addProduct
);

productRouter.patch(
  "/update-product",
  autheticateToken(["admin", "seller"]),
  upload.any(),
  updateProduct
);

productRouter.delete(
  "/delete-product",
  autheticateToken(["admin", "seller"]),
  deleteProduct
);

productRouter.patch(
  "/soft-delete",
  autheticateToken(["admin"]),
  softDeleteProduct
);
module.exports = productRouter;
