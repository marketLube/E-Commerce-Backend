const {
  register,
  login,
  userLogOut,
  listUsers,
  searchUser,
  checkUser,
} = require("../../controllers/userController");
const autheticateToken = require("../../middlewares/authMiddleware");
const userRouter = require("express").Router();

userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/logout", userLogOut);
userRouter.get("/list", autheticateToken(["admin"]), listUsers);
userRouter.get("/search", autheticateToken(["admin"]), searchUser);
userRouter.get("/check-user", autheticateToken(["user"]), checkUser);

module.exports = userRouter;
