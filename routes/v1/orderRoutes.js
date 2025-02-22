const { placeOrder, updateOrderStatus, filterOrders, getOrderById, getUserOrders, cancelOrder } = require("../../controllers/orderController")
const autheticateToken = require("../../middlewares/authMiddleware")

const orderRouter = require("express").Router()



orderRouter.post("/placeorder", autheticateToken(["user"]), placeOrder)
orderRouter.patch("/change-status/:orderId", autheticateToken(["admin", "seller"]), updateOrderStatus)
orderRouter.get("/get-orders", autheticateToken(["admin", "seller"]), filterOrders)
orderRouter.get("/get-order/:orderId", autheticateToken(["admin", "seller"]), getOrderById)
orderRouter.get("/get-user-orders", autheticateToken(["user"]), getUserOrders)
orderRouter.post("/cancel-order/:orderId", autheticateToken(["user"]), cancelOrder)



module.exports = orderRouter