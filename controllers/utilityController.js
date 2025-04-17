const utilitesModel = require("../model/utilitesModel");

const getUtilites = async (req, res, next) => {
  const utilites = await utilitesModel.find();
  console.log(utilites, "log");
  res.status(200).json(utilites);
};

const deliveryCharges = async (req, res, next) => {
  console.log(req.body, "log");
  // Find the existing document
  let utilites = await utilitesModel.find();
  console.log(utilites, "log");

  if (utilites.length > 0) {
    // Update the existing document
    let updateUtilites = await utilitesModel.updateOne(
      { _id: utilites[0]._id },
      {
        $set: {
          deliveryCharges: req.body.deliveryCharges,
          minimumOrderAmount: req.body.minimumOrderAmount,
        },
      },
      { new: true }
    );
    console.log(updateUtilites, "log");
    utilites = updateUtilites;
  } else {
    const newUtilites = new utilitesModel({
      deliveryCharges: req.body.deliveryCharges,
      minimumOrderAmount: req.body.minimumOrderAmount,
    });
    utilites = await newUtilites.save();
  }
  return res.status(200).json({
    message: "Delivery charges updated successfully",
    utilites,
    success: true,
  });
};

module.exports = { getUtilites, deliveryCharges };
