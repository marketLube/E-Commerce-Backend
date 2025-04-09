const razorpayInstance = require("../config/razorPay");
const catchAsync = require("../utilities/errorHandlings/catchAsync");

const createOrder = catchAsync(async (req, res) => {
  const { amount, currency } = req.body;

  const options = {
    amount: amount * 100, // Convert amount to smallest currency unit
    currency: currency || "INR",
  };

  const order = await razorpayInstance.orders.create(options);
  res.status(200).json(order);
});

module.exports = { createOrder };
