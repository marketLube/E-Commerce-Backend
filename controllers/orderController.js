

const mongoose = require("mongoose");
const AppError = require("../utilities/errorHandlings/appError");
const orderModel = require("../model/orderModel");
const productModel = require("../model/productModel");
const catchAsync = require("../utilities/errorHandlings/catchAsync");

const placeOrder = catchAsync(async (req, res, next) => {
    const userId = req.user
    const { products, address, paymentMethod, transactionId } = req.body
    if (!products) {
        return next(new AppError("All fields are required", 400))
    }
    const productIds = products.map(p => new mongoose.Types.ObjectId(p.productId));
    const productDetails = await productModel.aggregate([
        { $match: { _id: { $in: productIds } } },
        {
            $project: {
                name: 1,
                offerPrice: 1,
                stock: 1,
            }
        }
    ]);

    if (productDetails.length !== products.length) return next(new AppError("Invalid product selection", 400));


    let totalAmount = 0;
    const orderProducts = [];

    const bulkOperations = productDetails.map(product => {
        const item = products.find(p => p.productId === product._id.toString());

        if (!item) next(new AppError(`Product not found: ${product._id}`));
        if (product.quantity < item.quantity) next(new AppError(`Insufficient stock for ${product.name}`));

        totalAmount += product.offerPrice * item.quantity;
        orderProducts.push({ productId: product._id, quantity: item.quantity, price: product.offerPrice });

        // Reduce stock using bulk update
        return {
            updateOne: {
                filter: { _id: product._id },
                update: { $inc: { stock: -item.quantity } }
            }
        };
    });

    // Perform bulk stock update
    await productModel.bulkWrite(bulkOperations);



    const newOrder = new orderModel({
        userId,
        products: orderProducts,
        // address,
        totalAmount,
        // paymentDetails: {
        //     method: paymentMethod,
        //     status: paymentMethod === "cod" ? "pending" : "completed",
        // }
    })

    const orderPlaced = await newOrder.save()

    res.status(201).json({ message: "Order Placed", orderPlaced })

});


const updateOrderStatus = catchAsync(async (req, res, next) => {

    const { orderId } = req.params;
    const { status } = req.body;

    // Validate the status
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
        return next(new AppError("Invalid status provided.", 400))
    }

    const updatedOrder = await orderModel.findByIdAndUpdate(
        orderId,
        { status },
        { new: true }
    );

    if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found." });
    }

    return res.status(200).json({
        message: "Order status updated successfully.",
        order: updatedOrder,
    });

});

const filterOrders = catchAsync(async (req, res, next) => {
    const { status, startDate, endDate, category, userId } = req.query;

    let filterCriteria = {};


    if (status) {
        filterCriteria.status = status;
    }


    if (userId) {
        filterCriteria.userId = userId;
    }


    if (startDate || endDate) {
        filterCriteria.createdAt = {};
        if (startDate) filterCriteria.createdAt.$gte = new Date(startDate);
        if (endDate) filterCriteria.createdAt.$lte = new Date(endDate);
    }

    // Filter by category (join with productModel)
    let orders;
    if (category) {
        const categoryId = new mongoose.Types.ObjectId(category)
        orders = await orderModel.aggregate([
            {
                $lookup: {
                    from: "products",
                    localField: "products.productId",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },

            {
                $match: {
                    "productDetails.category": categoryId,
                    ...filterCriteria
                },
            },
        ]);
    } else {
        orders = await orderModel.find(filterCriteria).populate("products.productId");
    }

    if (orders.length === 0) {
        return res.status(404).json({ message: "No orders found matching the criteria." });
    }

    res.status(200).json({
        message: "Filtered orders retrieved successfully.",
        orders,
    });
});

const getOrderById = catchAsync(async (req, res, next) => {
    const { orderId } = req.params;

    const order = await orderModel.findById(orderId).populate({
        path: "products.productId",
        populate: {
            path: "category",
            model: "Category",
            select: "name description"
        }
    }).populate("userId", "username email");

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
            select: "name description"
        }
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

    if (order.userId.toString() !== userId) {
        return next(new AppError("You are not authorized to cancel this order", 403));
    }

    if (order.status !== "pending") {
        return next(new AppError("Only pending orders can be cancelled", 400));
    }

    // Restore stock for cancelled order
    const bulkOperations = order.products.map(product => ({
        updateOne: {
            filter: { _id: product.productId },
            update: { $inc: { stock: product.quantity } }
        }
    }));

    await productModel.bulkWrite(bulkOperations);

    order.status = "cancelled";
    await order.save();

    res.status(200).json({
        message: "Order cancelled successfully",
        order,
    });
});


module.exports = { placeOrder, updateOrderStatus, filterOrders, getOrderById, getUserOrders, cancelOrder };
