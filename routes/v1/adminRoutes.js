const { adminRegister, AdminLogin, adminLogout, getSalesDetails, monthlyReport, AdminDashboard, fetchCategoriesAndBrands } = require("../../controllers/adminController")
const autheticateToken = require("../../middlewares/authMiddleware")

const adminRouter = require("express").Router()



adminRouter.get("/salesreport", autheticateToken(["admin"]), getSalesDetails)
adminRouter.get("/monthlyreport", autheticateToken(["admin"]), monthlyReport)
adminRouter.get("/dashboard", autheticateToken(["admin"]), AdminDashboard)
adminRouter.get("/getcategoriesbrands", autheticateToken(["admin"]), fetchCategoriesAndBrands)
adminRouter.post("/register", adminRegister)
adminRouter.post("/login", AdminLogin)
adminRouter.post("/logout", adminLogout)


//sales



module.exports = adminRouter