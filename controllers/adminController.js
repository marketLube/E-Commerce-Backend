const {
  getTotalSales,
  getMonthlySalesReport,
  getDashBoardDetails,
} = require("../helpers/aggregation/aggregations");
const Brand = require("../model/brandModel");
const categoryModel = require("../model/categoryModel");
const orderModel = require("../model/orderModel");
const { User, Admin } = require("../model/userModel");
const createToken = require("../utilities/createToken");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const Label = require("../model/labelModel");

const adminRegister = catchAsync(async (req, res, next) => {
  const { username, email, phonenumber, password } = req.body;
  if (!username || !email || !phonenumber || !password) {
    return next(new AppError("All fields are required", 400));
  }
  const newAdmin = new Admin({ username, email, phonenumber, password });
  const admin = await newAdmin.save();

  const adminObj = admin.toObject();
  delete adminObj.password;
  return res.status(201).json({ message: "Admin created", adminObj });
});

const AdminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Email and password are required", 400));
  }

  const admin = await Admin.findOne({ email });
  if (!admin) {
    return next(new AppError("Invalid email or password", 401));
  }

  const isMatch = await admin.comparePassword(password.toString());
  if (!isMatch) {
    return next(new AppError("Invalid password", 401));
  }

  const token = createToken(admin._id, "admin");

  // res.cookie("admin-auth-token", token, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === "production",
  //   maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
  // });
  const adminObj = admin.toObject();
  delete adminObj.password;
  res.status(200).json({
    message: "Logged in successfully",
    adminObj,
    token,
  });
});

const AdminDashboard = catchAsync(async (req, res, next) => {
  const dashboardDetails = await getDashBoardDetails();
  res.status(200).json(dashboardDetails);
});

const adminLogout = catchAsync(async (req, res, next) => {
  res.clearCookie("admin-auth-token");

  res.status(200).json({
    message: "Logged out successfully",
  });
});

const fetchCategoriesAndBrands = catchAsync(async (req, res) => {
  // Fetch categories
  const categories = await categoryModel.find({}, "_id name");

  // Fetch brands
  const brands = await Brand.find({}, "_id name");

  // Fetch labels
  const labels = await Label.find({}, "_id name");

  res.status(200).json({ categories, brands, labels });
});

//sales related controllers

const getSalesDetails = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const salesDetails = await getTotalSales(startDate, endDate, orderModel);
  res.status(200).json(salesDetails);
});

const monthlyReport = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const report = await getMonthlySalesReport(startDate, endDate);

  res.status(200).json(report);
});

const checkAdmin = catchAsync(async (req, res, next) => {
  const admin = await Admin.findById(req.user);
  if (!admin) {
    return next(new AppError("Admin not found", 404));
  }
  res.status(200).json({ admin });
});

module.exports = {
  adminRegister,
  AdminLogin,
  adminLogout,
  getSalesDetails,
  monthlyReport,
  AdminDashboard,
  fetchCategoriesAndBrands,
  checkAdmin,
};
