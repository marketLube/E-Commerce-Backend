const { User, Admin } = require("../model/userModel");
const createToken = require("../utilities/createToken");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");

const adminRegister = catchAsync(async (req, res, next) => {
    const { username, email, phonenumber, password } = req.body
    if (!username || !email || !phonenumber || !password) {
        return next(new AppError("All fields are required", 400))
    }
    const newAdmin = new Admin({ username, email, phonenumber, password })
    const admin = await newAdmin.save()

    const adminObj = admin.toObject();
    delete adminObj.password;
    return res.status(201).json({ message: "Admin created", adminObj })
})

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

    const token = createToken(admin._id, "admin")

    res.cookie("admin-auth-token", token);
    const adminObj = admin.toObject();
    delete adminObj.password;
    res.status(200).json({
        message: "Logged in successfully",
        adminObj
    });
})


const adminLogout = catchAsync(async (req, res, next) => {
    res.clearCookie("admin-auth-token");

    res.status(200).json({
        message: "Logged out successfully",
    });
});





module.exports = {
    adminRegister,
    AdminLogin,
    adminLogout
}