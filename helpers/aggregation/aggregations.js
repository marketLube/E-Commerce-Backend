const categoryModel = require("../../model/categoryModel");
const orderModel = require("../../model/orderModel");
const productModel = require("../../model/productModel");
const mongoose = require("mongoose");
const catchAsync = require("../../utilities/errorHandlings/catchAsync");
const { ObjectId } = mongoose.Types;

const groupProductsByLabel = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await productModel.aggregate([
        {
          $lookup: {
            from: "labels",
            localField: "label",
            foreignField: "_id",
            as: "labelDetails",
          },
        },
        {
          $unwind: {
            path: "$labelDetails",
            preserveNullAndEmptyArrays: true, // Keeps products even if they have no label
          },
        },
        {
          $group: {
            _id: "$labelDetails.name",
            products: { $push: "$$ROOT" },
          },
        },
        {
          $project: {
            label: "$_id",
            products: 1,
            _id: 0,
          },
        },
      ]);

      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};
const groupProductsByRating = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await productModel.aggregate([
        {
          $group: {
            _id: "$averageRating",
            averageRating: { $first: "$averageRating" }, // Rename _id to averageRating
            products: { $push: "$$ROOT" },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { averageRating: -1 },
        },
        {
          $project: {
            _id: 0,
            averageRating: 1,
            products: 1,
            count: 1,
          },
        },
      ]);

      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

const getTotalSales = (startDate, endDate) => {
  return new Promise(async (resolve, reject) => {
    try {
      const matchStage = {};

      if (startDate && endDate) {
        matchStage.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const aggregateQuery = [
        { $match: matchStage },
        {
          $group: {
            _id: "$status", // ✅ Group orders by status
            totalSalesAmount: { $sum: "$totalAmount" },
            totalNumberOfOrders: { $sum: 1 }, // ✅ Correctly counts total orders
            totalProductsOrdered: { $sum: { $sum: "$products.quantity" } }, // ✅ Sums product quantity correctly
            productSales: { $push: "$products" },
          },
        },
        {
          $group: {
            _id: null,
            totalSalesAmount: { $sum: "$totalSalesAmount" },
            totalNumberOfOrders: { $sum: "$totalNumberOfOrders" },
            totalQuantityOfProductsOrdered: { $sum: "$totalProductsOrdered" },
            orderBreakdownByStatus: {
              $push: {
                status: "$_id",
                count: "$totalNumberOfOrders",
              },
            },
            productSales: { $push: "$productSales" },
          },
        },
      ];

      // Execute the aggregation query
      const salesData = await orderModel.aggregate(aggregateQuery);

      // Flatten productSales array
      const allProductSales =
        salesData.length > 0 ? salesData[0].productSales.flat() : [];

      // Find the most sold product
      const productCounts = {};
      allProductSales.forEach((products) => {
        products.forEach(({ productId, quantity }) => {
          productCounts[productId] = (productCounts[productId] || 0) + quantity;
        });
      });

      const mostOrderedProductId = Object.keys(productCounts).reduce(
        (a, b) => (productCounts[a] > productCounts[b] ? a : b),
        null
      );

      let mostOrderedProduct = null;

      if (mostOrderedProductId) {
        mostOrderedProduct = await productModel
          .findById(mostOrderedProductId)
          .lean();
        if (mostOrderedProduct && mostOrderedProduct.category) {
          const category = await categoryModel
            .findById(mostOrderedProduct.category)
            .lean();
          mostOrderedProduct.category = category
            ? category.name
            : "Unknown Category";
        }
      }

      // **Calculate total revenue only from 'delivered' orders**
      const deliveredOrders = await orderModel.aggregate([
        { $match: { ...matchStage, status: "delivered" } },
        {
          $group: {
            _id: null,
            totalRevenueFromDeliveredOrders: { $sum: "$totalAmount" },
          },
        },
      ]);

      resolve({
        totalSalesAmount:
          salesData.length > 0 ? salesData[0].totalSalesAmount : 0,
        totalNumberOfOrders:
          salesData.length > 0 ? salesData[0].totalNumberOfOrders : 0,
        totalQuantityOfProductsOrdered:
          salesData.length > 0
            ? salesData[0].totalQuantityOfProductsOrdered
            : 0,
        totalRevenueFromDeliveredOrders:
          deliveredOrders.length > 0
            ? deliveredOrders[0].totalRevenueFromDeliveredOrders
            : 0,
        orderBreakdownByStatus:
          salesData.length > 0 ? salesData[0].orderBreakdownByStatus : [],
        mostOrderedProduct: mostOrderedProduct
          ? {
              name: mostOrderedProduct.productName,
              code: mostOrderedProduct.productCode,
              category: mostOrderedProduct.category,
              totalUnitsOrdered: productCounts[mostOrderedProductId] || 0,
            }
          : null,
      });
    } catch (error) {
      reject(error);
    }
  });
};

const getMonthlySalesReport = (startDate, endDate) => {
  return new Promise(async (resolve, reject) => {
    try {
      const matchStage = {};

      if (startDate && endDate) {
        matchStage.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const aggregateQuery = [
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalSalesAmount: { $sum: "$totalAmount" },
            totalNumberOfOrders: { $sum: 1 },
            totalProductsOrdered: { $sum: { $sum: "$products.quantity" } },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 }, // Sorting by year and month
        },
      ];

      const monthlySalesData = await orderModel.aggregate(aggregateQuery);

      // **Revenue from delivered orders**
      const deliveredOrdersAggregation = [
        { $match: { ...matchStage, status: "delivered" } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalRevenueFromDeliveredOrders: { $sum: "$totalAmount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ];

      const deliveredOrdersData = await orderModel.aggregate(
        deliveredOrdersAggregation
      );

      // **Merge delivered revenue into the monthly report**
      const deliveredRevenueMap = new Map();
      deliveredOrdersData.forEach((entry) => {
        const key = `${entry._id.year}-${String(entry._id.month).padStart(
          2,
          "0"
        )}`;
        deliveredRevenueMap.set(key, entry.totalRevenueFromDeliveredOrders);
      });

      const formattedSalesData = monthlySalesData.map((data) => {
        const monthKey = `${data._id.year}-${String(data._id.month).padStart(
          2,
          "0"
        )}`;
        return {
          month: monthKey,
          totalSalesAmount: data.totalSalesAmount,
          totalNumberOfOrders: data.totalNumberOfOrders,
          totalQuantityOfProductsOrdered: data.totalProductsOrdered,
          totalRevenueFromDeliveredOrders:
            deliveredRevenueMap.get(monthKey) || 0,
        };
      });

      resolve({ monthlySalesReport: formattedSalesData });
    } catch (error) {
      reject(error);
    }
  });
};

const getDashBoardDetails = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // Aggregation for total orders, total deliveries, and total revenue
      const orderStats = await orderModel.aggregate([
        {
          $match: {
            isDeleted: false, // Exclude soft-deleted orders
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalDeliveries: {
              $sum: {
                $cond: [{ $eq: ["$status", "delivered"] }, 1, 0],
              },
            },
            totalRevenue: {
              $sum: {
                $cond: [{ $eq: ["$status", "delivered"] }, "$totalAmount", 0],
              },
            },
          },
        },
      ]);

      // Default values if no orders are found
      const stats =
        orderStats.length > 0
          ? orderStats[0]
          : {
              totalOrders: 0,
              totalDeliveries: 0,
              totalRevenue: 0,
            };

      // Aggregation for top 4 products based on order placements
      const topProducts = await orderModel.aggregate([
        { $unwind: "$products" }, // Flatten product arrays in orders
        {
          $group: {
            _id: "$products.productId",
            totalOrdered: { $sum: "$products.quantity" },
          },
        },
        { $sort: { totalOrdered: -1 } }, // Sort in descending order
        { $limit: 4 }, // Get top 4 products
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        {
          $lookup: {
            from: "variants",
            let: { productId: { $toObjectId: "$_id" } }, // Convert productId to ObjectId
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$product", "$$productId"] }],
                  },
                },
              },
            ],
            as: "variantDetails",
          },
        },
        {
          $addFields: {
            displayName: "$productDetails.name",
            displayImage: {
              $cond: {
                if: { $gt: [{ $size: "$variantDetails" }, 0] },
                then: { $arrayElemAt: ["$variantDetails.images", 0] },
                else: { $arrayElemAt: ["$productDetails.images", 0] },
              },
            },
            displayPrice: {
              $cond: {
                if: { $gt: [{ $size: "$variantDetails" }, 0] },
                then: { $arrayElemAt: ["$variantDetails.price", 0] },
                else: "$productDetails.price",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            productId: "$_id",
            name: "$displayName",
            image: "$displayImage",
            price: "$displayPrice",
            totalOrdered: 1,
          },
        },
      ]);

      // Return results in separate arrays
      resolve({
        summary: [
          { data: "Total Orders", count: stats.totalOrders },
          { data: "Total Deliveries", count: stats.totalDeliveries },
          {
            data: "Total Revenue",
            count: `₹${stats.totalRevenue.toLocaleString()}`,
          },
        ],
        topProducts: topProducts,
      });
    } catch (error) {
      reject(error);
    }
  });
};

// const getMonthlyReport = catchAsync(async (req, res, next) => {
//     const { year, month } = req.query;

//     const startDate = new Date(year, month - 1, 1);
//     const endDate = new Date(year, month, 0, 23, 59, 59);

//     const report = await OrderModel.aggregate([
//         { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
//         {
//             $group: {
//                 _id: "$product",
//                 totalSales: { $sum: "$quantity" },
//                 totalRevenue: { $sum: "$totalPrice" },
//             },
//         },
//     ]);

//     res.status(200).json({ success: true, data: report });
// });

const getOrderStats = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const statusCounts = await orderModel.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const stats = {
        statusCounts: statusCounts.reduce(
          (acc, stat) => {
            acc[stat._id || "pending"] = stat.count;
            return acc;
          },
          {
            pending: 0,
            processed: 0,
            shipped: 0,
            delivered: 0,
            onrefund: 0,
            refunded: 0,
            cancelled: 0,
          }
        ), // Initialize all statuses with 0
      };

      resolve(stats);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  groupProductsByLabel,
  groupProductsByRating,
  getTotalSales,
  getMonthlySalesReport,
  getDashBoardDetails,
  getOrderStats,
};
