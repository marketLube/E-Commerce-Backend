const mongoose = require("mongoose");
const productModel = require("./productModel");
const { Schema } = mongoose;

const offerSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Offer title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    startDate: {
      type: Date,
      required: [true, "Offer start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "Offer end date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    offer: offerSchema,
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isSubcategory: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String, // This will store the image URL
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for subcategories
categorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

categorySchema.pre("save", async function (next) {
  if (this.isModified("offer")) {
    const categoryId = this._id;
    const offer = this.offer;

    if (offer && offer.isActive) {
      await productModel.updateMany({ category: categoryId }, [
        {
          $set: {
            offerPrice: {
              $multiply: ["$originalPrice", 1 - offer.discountPercentage / 100],
            },
          },
        },
      ]);
    } else {
      await productModel.updateMany({ category: categoryId }, [
        {
          $set: {
            offerPrice: { $toDouble: "$originalPrice" }, // Convert originalPrice to a number
          },
        },
      ]);
    }
  }
  next();
});

// Add helper methods
categorySchema.methods.getAllSubcategories = async function () {
  return await this.model("Category").find({ parent: this._id });
};

categorySchema.methods.getFullPath = async function () {
  const path = [this.name];
  let currentCategory = this;

  while (currentCategory.parent) {
    currentCategory = await this.model("Category").findById(
      currentCategory.parent
    );
    if (currentCategory) {
      path.unshift(currentCategory.name);
    }
  }

  return path.join(" > ");
};

module.exports = mongoose.model("Category", categorySchema);
