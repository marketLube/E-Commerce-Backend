const { adminRegister, AdminLogin, adminLogout } = require("../../controllers/adminController")

const adminRoutes = require("express").Router()



adminRoutes.post("/register", adminRegister)
adminRoutes.post("/login", AdminLogin)
adminRoutes.post("/logout", adminLogout)



module.exports = adminRoutes