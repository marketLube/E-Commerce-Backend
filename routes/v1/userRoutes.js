const {
  register,
  login,
  userLogOut,
  listUsers,
} = require("../../controllers/userController");
const autheticateToken = require("../../middlewares/authMiddleware");
const userRouter = require("express").Router();

userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/logout", userLogOut);
userRouter.get("/list", autheticateToken(["admin"]), listUsers);

module.exports = userRouter;
