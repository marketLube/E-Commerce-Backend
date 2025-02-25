// models/brandModel.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const brandSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

const Brand = mongoose.model('Brand', brandSchema);
module.exports = Brand;
