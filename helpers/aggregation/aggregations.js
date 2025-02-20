
const Product = require("../../model/productModel");

const groupProductsByLabel = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await Product.aggregate([
                {
                    $lookup: {
                        from: "labels",
                        localField: "label",
                        foreignField: "_id",
                        as: "labelDetails"
                    }
                },
                {
                    $unwind: {
                        path: "$labelDetails",
                        preserveNullAndEmptyArrays: true // Keeps products even if they have no label
                    }
                },
                {
                    $group: {
                        _id: "$labelDetails.name",
                        products: { $push: "$$ROOT" }
                    }
                },
                {
                    $project: {
                        label: "$_id",
                        products: 1,
                        _id: 0
                    }
                }
            ]);

            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { groupProductsByLabel };
