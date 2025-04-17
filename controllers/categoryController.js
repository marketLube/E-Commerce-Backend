const { getAll } = require("../helpers/handlerFactory/handlerFactory");
const categoryModel = require("../model/categoryModel");
const Category = require("../model/categoryModel");
const uploadToCloudinary = require("../utilities/cloudinaryUpload");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const mongoose = require("mongoose");
const Product = require("../model/productModel");

const addCategory = catchAsync(async (req, res, next) => {
  const { name, description, offer, parent } = req.body;

  if (!name || !description) {
    return next(new AppError("All fields are required", 400));
  }

  const categoryData = { name, description };

  // Handle parent category if provided
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return next(new AppError("Parent category not found", 404));
    }
    categoryData.parent = parent;
    categoryData.isSubcategory = true;
  }

  // Handle offer if provided
  if (offer) {
    if (
      !offer.title ||
      !offer.discountPercentage ||
      !offer.startDate ||
      !offer.endDate
    ) {
      return next(new AppError("All offer fields are required", 400));
    }
    categoryData.offer = offer;
  }

  if (req.files[0]) {
    const uploadedImage = await uploadToCloudinary(req.files[0].buffer);
    categoryData.image = uploadedImage;
  }

  const newCategory = new Category({ ...categoryData });
  await newCategory.save();

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    category: newCategory,
  });
});

const getAllCategories = catchAsync(async (req, res) => {
  const { brandId } = req.query;

  // If brandId is provided, find categories through products
  if (brandId) {
    // First get all product categories for this brand
    const brandProducts = await Product.find({ brand: brandId }).distinct(
      "category"
    );

    // Then get these categories with their subcategories
    const categories = await Category.find({
      $or: [
        { _id: { $in: brandProducts } },
        { parent: { $in: brandProducts } },
      ],
    }).populate({
      path: "subcategories",
      populate: {
        path: "subcategories",
      },
    });

    const rootCategories = categories.filter((cat) => !cat.parent);

    return res.status(200).json({
      success: true,
      envelop: {
        data: rootCategories,
      },
    });
  }

  // If no brandId, return all categories (existing logic)
  const categories = await Category.find().populate({
    path: "subcategories",
    populate: {
      path: "subcategories",
    },
  });

  const rootCategories = categories.filter((cat) => !cat.parent);

  res.status(200).json({
    success: true,
    envelop: {
      data: rootCategories,
    },
  });
});

const updateCategoryOffer = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;
  const { offer } = req.body;

  if (
    !offer ||
    !offer.title ||
    !offer.discountPercentage ||
    !offer.startDate ||
    !offer.endDate
  ) {
    return next(new AppError("All offer fields are required", 400));
  }

  const category = await Category.findById(categoryId);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  category.offer = offer;
  await category.save();

  res
    .status(200)
    .json({ success: true, message: "Offer updated successfully", category });
});

const editCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;
  const { name, description, offer, parent } = req.body;

  const category = await Category.findById(categoryId);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  // Update basic fields
  if (name) category.name = name;
  if (description) category.description = description;
  if (req.files[0]) {
    const uploadedImage = await uploadToCloudinary(req.files[0].buffer);
    category.image = uploadedImage;
  }

  // Handle parent category update
  if (parent) {
    // Prevent setting parent to itself or its own subcategory
    if (parent === categoryId) {
      return next(new AppError("Category cannot be its own parent", 400));
    }

    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return next(new AppError("Parent category not found", 404));
    }

    // Check if new parent is not one of its own subcategories
    const subcategories = await category.getAllSubcategories();
    if (subcategories.some((sub) => sub._id.toString() === parent)) {
      return next(new AppError("Cannot set a subcategory as parent", 400));
    }

    category.parent = parent;
    category.isSubcategory = true;
  }

  // Handle offer update
  if (offer) {
    if (
      !offer.title ||
      !offer.discountPercentage ||
      !offer.startDate ||
      !offer.endDate
    ) {
      return next(new AppError("All offer fields are required", 400));
    }
    category.offer = offer;
  }

  await category.save();

  // Fetch updated category with populated fields
  const updatedCategory = await Category.findById(categoryId)
    .populate("parent")
    .populate("subcategories");

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    category: updatedCategory,
  });
});

const removeOfferFromCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  category.offer = null;

  await category.save();

  res
    .status(200)
    .json({ success: true, message: "Offer removed from category", category });
});

const searchCategory = catchAsync(async (req, res, next) => {
  const { keyword } = req.query;
  const isObjectId = mongoose.Types.ObjectId.isValid(keyword);

  const searchQuery = isObjectId
    ? { _id: keyword }
    : {
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      };

  const categories = await Category.find(searchQuery)
    .populate("parent")
    .populate("subcategories");

  res.status(200).json({
    success: true,
    category: categories,
    searchType: isObjectId ? "id" : "text",
  });
});

const getCategoryHierarchy = catchAsync(async (req, res) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId).populate({
    path: "subcategories",
    populate: { path: "subcategories" },
  });

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  const fullPath = await category.getFullPath();
  const allSubcategories = await category.getAllSubcategories();

  res.status(200).json({
    success: true,
    category: {
      ...category.toObject(),
      fullPath,
      allSubcategories,
    },
  });
});

const createCategoryWithSubs = catchAsync(async (req, res) => {
  const { name, description, offer, subcategories } = req.body;

  // Create main category
  const mainCategory = await Category.create({
    name,
    description,
    offer,
  });

  // If subcategories exist, create them with parent reference
  if (subcategories && subcategories.length > 0) {
    const subcategoryPromises = subcategories.map(async (sub) => {
      return Category.create({
        name: sub.name,
        description: sub.description,
        offer: sub.offer,
        parent: mainCategory._id,
        isSubcategory: true,
      });
    });

    const createdSubcategories = await Promise.all(subcategoryPromises);

    // Update main category with subcategory references
    mainCategory.subcategories = createdSubcategories.map((sub) => sub._id);
    await mainCategory.save();
  }

  // Fetch the complete category with populated subcategories
  const populatedCategory = await Category.findById(mainCategory._id).populate(
    "subcategories"
  );

  res.status(201).json({
    status: "success",
    data: populatedCategory,
  });
});

const deleteCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  // Check if category has subcategories
  const subcategories = await Category.find({ parent: categoryId });
  if (subcategories.length > 0) {
    return next(
      new AppError(
        "Cannot delete category with subcategories. Please delete subcategories first.",
        400
      )
    );
  }

  await Category.findByIdAndDelete(categoryId);

  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
});

module.exports = {
  addCategory,
  getAllCategories,
  updateCategoryOffer,
  editCategory,
  removeOfferFromCategory,
  searchCategory,
  createCategoryWithSubs,
  getCategoryHierarchy,
  deleteCategory,
};
