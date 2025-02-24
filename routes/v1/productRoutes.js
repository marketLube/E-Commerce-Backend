const { addProduct, listProducts, getProductDetails, updateProduct, deleteProduct, getProductsByLabel, getGroupedProductsByLabel, getGroupedProductsByRating, searchProducts } = require('../../controllers/productController');
const autheticateToken = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/multer');

const productRouter = require('express').Router();

productRouter.get("/get-products", listProducts);
productRouter.get("/get-product/:productId", autheticateToken(["admin", "seller"]), getProductDetails);
productRouter.get("/get-product-bylabel/:labelId", getProductsByLabel);
productRouter.get("/get-grouped-products-label", getGroupedProductsByLabel);
productRouter.get("/get-grouped-products-rating", getGroupedProductsByRating);
productRouter.get("/search", searchProducts);


productRouter.post("/addproduct", autheticateToken(["admin", "seller"]), upload.any(), addProduct);

productRouter.patch("/update-product/:id", autheticateToken(["admin", "seller"]), updateProduct);

productRouter.delete("/delete-product/:id", autheticateToken(["admin", "seller"]), deleteProduct);

module.exports = productRouter;
