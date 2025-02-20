const { addCategory, getAllCategories, updateCategoryOffer, editCategory, removeOfferFromCategory } = require("../../controllers/categoryController")
const autheticateToken = require("../../middlewares/authMiddleware")

const categoryRouter = require("express").Router()


categoryRouter.post("/addcategory", autheticateToken(["admin"]), addCategory)
categoryRouter.get("/allcategories", getAllCategories)
categoryRouter.patch("/addoffer/:categoryId", autheticateToken(["admin"]), updateCategoryOffer)
categoryRouter.patch("/editcategory/:categoryId", autheticateToken(["admin"]), editCategory)
categoryRouter.patch("/removeoffer/:categoryId", autheticateToken(["admin"]), removeOfferFromCategory)

module.exports = categoryRouter