const paymentRouter = require("express").Router();
const { createOrder } = require("../../controllers/paymentController");

paymentRouter.post("/create-order", createOrder);

module.exports = paymentRouter;
