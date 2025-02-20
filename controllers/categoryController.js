



const { getAll } = require("../helpers/handlerFactory/handlerFactory");
const categoryModel = require("../model/categoryModel");
const Category = require("../model/categoryModel");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");


const addCategory = catchAsync(async (req, res, next) => {
    const { name, description, offer } = req.body;

    if (!name || !description) {
        return next(new AppError("All fields are required", 400));
    }

    const categoryData = { name, description };


    if (offer) {
        if (!offer.title || !offer.discountPercentage || !offer.startDate || !offer.endDate) {
            return next(new AppError("All offer fields are required", 400));
        }
        categoryData.offer = offer;
    }

    const newCategory = new Category(categoryData);
    await newCategory.save();

    res.status(201).json({ success: true, message: "Category created successfully", category: newCategory });
});


const getAllCategories = getAll(categoryModel)


const updateCategoryOffer = catchAsync(async (req, res, next) => {
    const { categoryId } = req.params;
    const { offer } = req.body;

    if (!offer || !offer.title || !offer.discountPercentage || !offer.startDate || !offer.endDate) {
        return next(new AppError("All offer fields are required", 400));
    }

    const category = await Category.findById(categoryId);
    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    category.offer = offer;
    await category.save();

    res.status(200).json({ success: true, message: "Offer updated successfully", category });
});


const editCategory = catchAsync(async (req, res, next) => {
    const { categoryId } = req.params;
    const { name, description, offer } = req.body;

    const category = await Category.findById(categoryId);
    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    if (name) category.name = name;
    if (description) category.description = description;


    if (offer) {
        if (!offer.title || !offer.discountPercentage || !offer.startDate || !offer.endDate) {
            return next(new AppError("All offer fields are required", 400));
        }
        category.offer = offer;
    }

    await category.save();
    res.status(200).json({ success: true, message: "Category updated successfully", category });
});


const removeOfferFromCategory = catchAsync(async (req, res, next) => {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    category.offer = null;

    await category.save();

    res.status(200).json({ success: true, message: "Offer removed from category", category });
});

module.exports = {
    addCategory,
    getAllCategories,
    updateCategoryOffer,
    editCategory,
    removeOfferFromCategory
};
