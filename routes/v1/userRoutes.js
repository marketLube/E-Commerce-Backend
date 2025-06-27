const {
  register,
  sendOtp,
  userLogOut,
  listUsers,
  searchUser,
  checkUser,
  updateUser,
  deleteUserAddress,
  submitUserDetails,
  getAllSubscribers,
  verifyOtp,
  resendOtp,
} = require("../../controllers/userController");
const autheticateToken = require("../../middlewares/authMiddleware");
const userRouter = require("express").Router();

userRouter.post("/register", register);
userRouter.post("/login", sendOtp);
userRouter.post("/verify-otp", verifyOtp);
userRouter.post("/resend-otp", resendOtp);
userRouter.post("/logout", userLogOut);
userRouter.get("/list", autheticateToken(["admin"]), listUsers);
userRouter.get("/search", autheticateToken(["admin"]), searchUser);
userRouter.get("/check-user", autheticateToken(["user"]), checkUser);
userRouter.patch("/update-user", autheticateToken(["user"]), updateUser);
userRouter.patch(
  "/delete-address/:id",
  autheticateToken(["user"]),
  deleteUserAddress
);

userRouter.post("/submit-user-details", submitUserDetails);
userRouter.get("/subscribers", getAllSubscribers);
module.exports = userRouter;
