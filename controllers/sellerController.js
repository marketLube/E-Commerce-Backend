const { Seller } = require("../model/userModel");
const createToken = require("../utilities/createToken");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");

const sellerRegister = catchAsync(async (req, res, next) => {
    const { username, email, phonenumber, password } = req.body
    if (!username || !email || !phonenumber || !password) {
        return next(new AppError("All fields are required", 400))
    }
    const newSeller = new Seller({ username, email, phonenumber, password })
    const seller = await newSeller.save()

    const sellerObj = seller.toObject();
    delete sellerObj.password;
    return res.status(201).json({ message: "Seller created", sellerObj })
})


const sellerLogin = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;


    if (!email || !password) {
        return next(new AppError("Email and password are required", 400));
    }


    const seller = await Seller.findOne({ email });
    if (!seller) {
        return next(new AppError("Invalid email or password", 401));
    }

    const isMatch = await seller.comparePassword(password.toString());
    if (!isMatch) {
        return next(new AppError("Invalid email or password", 401));
    }


    const token = createToken(seller._id, "seller")


    res.cookie("seller-auth-token", token);


    const sellerObj = seller.toObject();
    delete sellerObj.password;

    res.status(200).json({
        message: "Logged in successfully",
        user: sellerObj,
    });
})





const sellerLogOut = catchAsync(async (req, res, next) => {
    res.clearCookie("seller-auth-token");

    res.status(200).json({
        message: "Logged out successfully",
    });
});

module.exports = {
    sellerRegister,
    sellerLogin,
    sellerLogOut
}