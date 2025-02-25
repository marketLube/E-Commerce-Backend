const { createBrand, getAllBrands, getBrandById, updateBrand, deleteBrand } = require("../../controllers/brandController");
const autheticateToken = require("../../middlewares/authMiddleware");

const brandRouter = require("express").Router();

brandRouter
    .route('/')
    .post(autheticateToken(["admin", "seller"]), createBrand)    // Create a new brand
    .get(getAllBrands);   // Get all brands

brandRouter
    .route('/:id')
    .get(getBrandById)    // Get a brand by ID
    .patch(autheticateToken(["admin", "seller"]), updateBrand)   // Update a brand by ID
    .delete(autheticateToken(["admin", "seller"]), deleteBrand); // Delete a brand by ID

module.exports = brandRouter;
