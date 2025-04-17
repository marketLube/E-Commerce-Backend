const express = require("express");
const utilitesRouter = express.Router();
const {
  getUtilites,
  deliveryCharges,
} = require("../../controllers/utilityController");

utilitesRouter.get("/get-utilites", getUtilites);
utilitesRouter.post("/update-delivery-charges", deliveryCharges);

module.exports = utilitesRouter;
