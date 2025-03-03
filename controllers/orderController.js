const mongoose = require("mongoose");
const AppError = require("../utilities/errorHandlings/appError");
const orderModel = require("../model/orderModel");
const productModel = require("../model/productModel");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const { getOrderStats } = require("../helpers/aggregation/aggregations");

// const placeOrder = catchAsync(async (req, res, next) => {
//     const userId = req.user
//     const { products, address, paymentMethod, transactionId } = req.body
//     if (!products) {
//         return next(new AppError("All fields are required", 400))
//     }
//     const productIds = products.map(p => new mongoose.Types.ObjectId(p.productId));
//     const productDetails = await productModel.aggregate([
//         { $match: { _id: { $in: productIds } } },
//         {
//             $project: {
//                 name: 1,
//                 offerPrice: 1,
//                 stock: 1,
//             }
//         }
//     ]);

//     if (productDetails.length !== products.length) return next(new AppError("Invalid product selection", 400));

//     let totalAmount = 0;
//     const orderProducts = [];

//     const bulkOperations = productDetails.map(product => {
//         const item = products.find(p => p.productId === product._id.toString());

//         if (!item) next(new AppError(`Product not found: ${product._id}`));
//         if (product.quantity < item.quantity) next(new AppError(`Insufficient stock for ${product.name}`));

//         totalAmount += product.offerPrice * item.quantity;
//         orderProducts.push({ productId: product._id, quantity: item.quantity, price: product.offerPrice });

//         // Reduce stock using bulk update
//         return {
//             updateOne: {
//                 filter: { _id: product._id },
//                 update: { $inc: { stock: -item.quantity } }
//             }
//         };
//     });

//     // Perform bulk stock update
//     await productModel.bulkWrite(bulkOperations);

//     const newOrder = new orderModel({
//         userId,
//         products: orderProducts,
//         // address,
//         totalAmount,
//         // paymentDetails: {
//         //     method: paymentMethod,
//         //     status: paymentMethod === "cod" ? "pending" : "completed",
//         // }
//     })

//     const orderPlaced = await newOrder.save()

//     res.status(201).json({ message: "Order Placed", orderPlaced })

// });

const placeOrder = catchAsync(async (req, res, next) => {
  const { userId, products } = req.body;

  // Calculate total amount
  let totalAmount = 0;
  products.forEach((item) => {
    totalAmount += item.price * item.quantity;
  });

  const newOrder = new orderModel({
    user: userId,
    products,
    totalAmount,
  });

  await newOrder.save();

  res.status(201).json({
    message: "Order created successfully",
    order: newOrder,
  });
});

const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { status, type } = req.body; // type can be 'order' or 'payment'
  console.log(status, type);

  // Define valid statuses for both order and payment
  const validStatuses = {
    order: [
      "pending",
      "processed",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "onrefund",
    ],
    payment: ["pending", "paid", "failed", "refunded", "onrefund"],
  };

  // Validate the status type
  if (!type || !["order", "payment"].includes(type)) {
    return next(
      new AppError("Invalid status type. Must be 'order' or 'payment'.", 400)
    );
  }

  // Validate the status value
  if (!validStatuses[type].includes(status)) {
    return next(
      new AppError(
        `Invalid ${type} status provided. Valid statuses are: ${validStatuses[
          type
        ].join(", ")}`,
        400
      )
    );
  }

  // Create update object based on type
  const updateField = type === "order" ? { status } : { paymentStatus: status };

  const updatedOrder = await orderModel
    .findByIdAndUpdate(orderId, updateField, { new: true })
    .populate({
      path: "products.productId",
      select: "name images price category",
      populate: {
        path: "category",
        select: "name",
      },
    })
    .populate("user", "username phonenumber address");

  if (!updatedOrder) {
    return next(new AppError("Order not found.", 404));
  }

  return res.status(200).json({
    success: true,
    message: `Order ${type} status updated successfully.`,
    order: updatedOrder,
  });
});

const filterOrders = catchAsync(async (req, res, next) => {
  const { status, startDate, endDate, category } = req.query;

  let filterCriteria = {};

  if (status) {
    filterCriteria.status = status;
  }

  if (startDate || endDate) {
    filterCriteria.createdAt = {};
    if (startDate) filterCriteria.createdAt.$gte = new Date(startDate);
    if (endDate) filterCriteria.createdAt.$lte = new Date(endDate);
  }

  let orders = await orderModel
    .find(filterCriteria)
    .populate({
      path: "products.productId",
      select: "name images price category",
      populate: {
        path: "category",
        select: "name",
      },
    })
    .populate("user", "username phonenumber address")
    .sort({ createdAt: -1 });

  if (category) {
    orders = orders.filter((order) =>
      order.products.some(
        (product) => product.productId?.category?._id.toString() === category
      )
    );
  }

  if (orders.length === 0) {
    return res
      .status(404)
      .json({ message: "No orders found matching the criteria." });
  }

  res.status(200).json({
    message: "Orders retrieved successfully",
    orders,
  });
});

const getOrderById = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await orderModel
    .findById(orderId)
    .populate({
      path: "products.productId",
      populate: {
        path: "category",
        model: "Category",
        select: "name description",
      },
    })
    .populate("userId", "username email");

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  res.status(200).json({
    message: "Order details retrieved successfully",
    order,
  });
});

const getUserOrders = catchAsync(async (req, res, next) => {
  const userId = req.user;
  const orders = await orderModel.find({ userId }).populate({
    path: "products.productId",
    populate: {
      path: "category",
      model: "Category",
      select: "name description",
    },
  });

  if (!orders.length) {
    return next(new AppError("No orders found for this user", 404));
  }

  res.status(200).json({
    message: "User orders retrieved successfully",
    orders,
  });
});

const cancelOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const userId = req.user;

  const order = await orderModel.findById(orderId);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.user.toString() !== userId) {
    return next(
      new AppError("You are not authorized to cancel this order", 403)
    );
  }

  if (order.status !== "pending") {
    return next(new AppError("Only pending orders can be cancelled", 400));
  }

  // Restore stock for cancelled order
  const bulkOperations = order.products.map((product) => ({
    updateOne: {
      filter: { _id: product.productId },
      update: { $inc: { stock: product.quantity } },
    },
  }));

  await productModel.bulkWrite(bulkOperations);

  order.status = "cancelled";
  await order.save();

  res.status(200).json({
    message: "Order cancelled successfully",
    order,
  });
});

// const getAllOrders = catchAsync(async (req, res, next) => {
//   // Get page and limit from query params, set defaults if not provided
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 10;
//   const skip = (page - 1) * limit;

//   try {
//     // Get total count for pagination
//     const totalOrders = await orderModel.countDocuments();
//     const totalPages = Math.ceil(totalOrders / limit);

//     // Fetch orders with pagination and populate necessary fields
//     const orders = await orderModel
//       .find()
//       .populate({
//         path: "user",
//         select: "username email phone", // Add the fields you want from user
//       })
//       .populate({
//         path: "products.productId",
//         select: "name images price offerPrice variant", // Add the fields you want from product
//         populate: {
//           path: "category",
//           select: "name",
//         },
//       })
//       .populate({
//         path: "products.variantId",
//       })
//       .sort({ createdAt: -1 }) // Sort by newest first
//       .skip(skip)
//       .limit(limit);

//     // Calculate pagination info
//     const paginationInfo = {
//       currentPage: page,
//       totalPages,
//       totalOrders,
//       hasNextPage: page < totalPages,
//       hasPrevPage: page > 1,
//       nextPage: page < totalPages ? page + 1 : null,
//       prevPage: page > 1 ? page - 1 : null,
//       limit,
//     };

//     // Group orders by status for analytics
//     const orderAnalytics = {
//       total: totalOrders,
//       completed: await orderModel.countDocuments({ status: "delivered" }),
//       confirmed: await orderModel.countDocuments({ status: "processing" }),
//       cancelled: await orderModel.countDocuments({ status: "cancelled" }),
//       refunded: await orderModel.countDocuments({ status: "refunded" }),
//     };

//     res.status(200).json({
//       status: "success",
//       message: "Orders fetched successfully",
//       data: {
//         orders,
//         pagination: paginationInfo,
//         analytics: orderAnalytics,
//       },
//     });
//   } catch (error) {
//     return next(new AppError("Error fetching orders", 500));
//   }
// });

const orderStats = catchAsync(async (req, res, next) => {
  const stats = await getOrderStats();
  res.status(200).json({
    message: "Order statistics retrieved successfully",
    stats,
  });
});

module.exports = {
  placeOrder,
  updateOrderStatus,
  filterOrders,
  getOrderById,
  getUserOrders,
  cancelOrder,
  orderStats,
};
