const { NormalUser } = require("../model/userModel");
const createToken = require("../utilities/createToken");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");

const register = catchAsync(async (req, res, next) => {
    const { username, email, phonenumber, password } = req.body
    if (!username || !email || !phonenumber || !password) {
        return next(new AppError("All fields are required", 400))
    }

    const newUser = new NormalUser({ username, email, phonenumber, password })
    const user = await newUser.save()
    const userObj = user.toObject()
    delete userObj.password
    return res.status(201).json({ message: "user created", userObj })

})


const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;


    if (!email || !password) {
        return next(new AppError("Email and password are required", 400));
    }


    const user = await NormalUser.findOne({ email });
    if (!user) {
        return next(new AppError("Invalid email or password", 401));
    }

    const isMatch = await user.comparePassword(password.toString());
    if (!isMatch) {
        return next(new AppError("Invalid email or password", 401));
    }


    const token = createToken(user._id, "user")


    res.cookie("user-auth-token", token);


    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
        message: "Logged in successfully",
        user: userObj,
    });
})



const userLogOut = catchAsync(async (req, res, next) => {
    res.clearCookie("user-auth-token");

    res.status(200).json({
        message: "Logged out successfully",
    });
});

module.exports = {
    register,
    login,
    userLogOut
}