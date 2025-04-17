const mongoose = require("mongoose");
const { Schema } = mongoose;

const bannerSchema = new Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
  },
  bannerFor: {
    type: String,
  },
  image: {
    type: String,
    default: null,
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    default: null,
  },
  percentage: {
    type: Number,
    default: null,
  },
});

const Banner = mongoose.model("Banner", bannerSchema);

module.exports = Banner;
