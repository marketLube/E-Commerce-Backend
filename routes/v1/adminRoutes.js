const {
  adminRegister,
  AdminLogin,
  adminLogout,
  getSalesDetails,
  monthlyReport,
  AdminDashboard,
  fetchCategoriesAndBrands,
  checkAdmin,
} = require("../../controllers/adminController");
const autheticateToken = require("../../middlewares/authMiddleware");

const adminRouter = require("express").Router();

adminRouter.get("/salesreport", autheticateToken(["admin"]), getSalesDetails);
adminRouter.get("/monthlyreport", autheticateToken(["admin"]), monthlyReport);
adminRouter.get("/dashboard", autheticateToken(["admin"]), AdminDashboard);
adminRouter.get(
  "/getcategoriesbrands",
  autheticateToken(["admin"]),
  fetchCategoriesAndBrands
);
adminRouter.post("/register", adminRegister);
adminRouter.post("/login", AdminLogin);
adminRouter.post("/logout", adminLogout);
adminRouter.get("/checkadmin", autheticateToken(["admin"]), checkAdmin);

//sales

module.exports = adminRouter;
