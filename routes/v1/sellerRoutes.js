const { sellerRegister, sellerLogin, sellerLogOut } = require("../../controllers/sellerController")

const sellerRouter = require("express").Router()


sellerRouter.post("/register", sellerRegister)
sellerRouter.post("/login", sellerLogin)
sellerRouter.post("/logout", sellerLogOut)

module.exports = sellerRouter