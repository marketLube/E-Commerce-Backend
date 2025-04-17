const mongoose = require("mongoose");

const utilitesSchema = new mongoose.Schema({
  deliveryCharges: { type: Number, default: 99 },
  minimumOrderAmount: { type: Number, default: 2500 },
});

module.exports = mongoose.model("Utilites", utilitesSchema);
