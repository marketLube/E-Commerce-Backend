const {
  placeOrder,
  updateOrderStatus,
  filterOrders,
  getOrderById,
  getUserOrders,
  cancelOrder,
  orderStats,
  payment,
  verifyPayment,
} = require("../../controllers/orderController");
const autheticateToken = require("../../middlewares/authMiddleware");

const orderRouter = require("express").Router();
orderRouter.get("/get-user-orders", autheticateToken(["user"]), getUserOrders);
orderRouter.post("/paymentIntent", autheticateToken(["user"]), payment);
orderRouter.post("/paymentVerify", autheticateToken(["user"]), verifyPayment);
orderRouter.post("/placeorder", autheticateToken(["user"]), placeOrder);
orderRouter.patch(
  "/change-status/:orderId",
  autheticateToken(["admin", "seller", "user"]),
  updateOrderStatus
);
orderRouter.get(
  "/get-orders",
  autheticateToken(["admin", "seller"]),
  filterOrders
);

orderRouter.get(
  "/get-order-stats",
  autheticateToken(["admin", "seller"]),
  orderStats
);
orderRouter.get(
  "/get-order/:orderId",
  autheticateToken(["admin", "seller"]),
  getOrderById
);
orderRouter.post(
  "/cancel-order/:orderId",
  autheticateToken(["user"]),
  cancelOrder
);

module.exports = orderRouter;
