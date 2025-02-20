const { addToCart, removeFromCart, clearCart, getCart } = require('../../controllers/cartController')
const autheticateToken = require('../../middlewares/authMiddleware')

const cartRouter = require('express').Router()


cartRouter.post("/add-to-cart", autheticateToken(["user"]), addToCart)
cartRouter.post("/remove-from-cart/:productId", autheticateToken("user"), removeFromCart)
cartRouter.post("/clear-cart", autheticateToken("user"), clearCart)
cartRouter.get("/get-cart", autheticateToken("user"), getCart)


module.exports = cartRouter