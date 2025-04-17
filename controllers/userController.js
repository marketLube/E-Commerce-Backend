const Subscribers = require("../model/subscribersModel");
const { NormalUser } = require("../model/userModel");
const createToken = require("../utilities/createToken");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");

const register = catchAsync(async (req, res, next) => {
  const { username, email, phonenumber, password } = req.body;
  if (!username || !email || !phonenumber || !password) {
    return next(new AppError("All fields are required", 400));
  }
  const isUserExist = await NormalUser.findOne({ email });
  const isPhoneNumberExist = await NormalUser.findOne({ phonenumber });
  if (isUserExist) {
    return next(new AppError("User already exists", 400));
  }
  if (isPhoneNumberExist) {
    return next(new AppError("Phone number already exists", 400));
  }
  const newUser = new NormalUser({ username, email, phonenumber, password });
  const user = await newUser.save();
  const userObj = user.toObject();
  delete userObj.password;
  const token = createToken(user._id, "user");
  res.cookie("user-auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
  });
  return res
    .status(201)
    .json({ message: "user created", user: userObj, token });
});

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

  const token = createToken(user._id, "user");

  const userObj = user.toObject();
  delete userObj.password;

  res.status(200).json({
    message: "Logged in successfully",
    user: userObj,
    token,
  });
});

const userLogOut = catchAsync(async (req, res, next) => {
  res.clearCookie("user-auth-token");

  res.status(200).json({
    message: "Logged out successfully",
  });
});

const listUsers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [users, totalUsers] = await Promise.all([
    NormalUser.find()
      .skip(skip)
      .limit(limit)
      .select("username email phonenumber address createdAt isBlocked"),
    NormalUser.countDocuments(),
  ]);

  const totalPages = Math.ceil(totalUsers / limit);

  res.status(200).json({
    users,
    pagination: {
      currentPage: page,
      totalPages,
      totalUsers,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

const searchUser = catchAsync(async (req, res, next) => {
  const { search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const users = await NormalUser.find({
    $or: [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phonenumber: { $regex: search, $options: "i" } },
    ],
  });
  const totalUsers = users.length;
  const totalPages = Math.ceil(totalUsers / limit);

  res.status(200).json({
    users,
    pagination: {
      currentPage: page,
      totalPages,
      totalUsers,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

const checkUser = catchAsync(async (req, res, next) => {
  const userId = req.user;
  const user = await NormalUser.findById(userId);
  res.status(200).json({ user });
});

const updateUser = catchAsync(async (req, res, next) => {
  const userId = req.user;
  const updateData = req.body;

  let updatedUser;
  if (updateData.address) {
    updatedUser = await NormalUser.findByIdAndUpdate(
      userId,
      {
        $push: { address: updateData.address },
      },
      { new: true }
    );
  } else {
    updatedUser = await NormalUser.findByIdAndUpdate(userId, updateData, {
      new: true,
    });
  }

  const userObj = updatedUser.toObject();
  delete userObj.password;
  res.status(200).json(userObj);
});

const deleteUserAddress = catchAsync(async (req, res, next) => {
  const userId = req.user;
  const addressId = req.params.id;

  const updatedUser = await NormalUser.findByIdAndUpdate(
    userId,
    { $pull: { address: { _id: addressId } } },
    { new: true }
  );

  if (!updatedUser) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Address deleted successfully",
    data: updatedUser,
  });
});

const submitUserDetails = catchAsync(async (req, res, next) => {
  const { name, email, phone } = req.body;
  const newSubscriber = new Subscribers({ name, email, phone });
  await newSubscriber.save();
  res.status(200).json({
    status: "success",
    message: "Subscriber added successfully",
    data: newSubscriber,
  });
});

const getAllSubscribers = catchAsync(async (req, res, next) => {
  const subscribers = await Subscribers.find();
  res.status(200).json({ subscribers });
});

module.exports = {
  register,
  login,
  userLogOut,
  listUsers,
  searchUser,
  checkUser,
  updateUser,
  deleteUserAddress,
  submitUserDetails,
  getAllSubscribers,
};
