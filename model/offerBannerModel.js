const mongoose = require("mongoose");

const offerBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    subtitle: {
      type: String,
    },
    description: {
      type: String,
    },
    offerValue: {
      type: String,
      required: [true, "Offer value is required"],
    },
    offerType: {
      type: String,
      required: [true, "Offer type is required"],
    },
    link: {
      type: String,
    },
    image: {
      type: String,
      required: [true, "Banner image is required"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("OfferBanner", offerBannerSchema);