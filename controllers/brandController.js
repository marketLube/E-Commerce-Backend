

const Brand = require('../model/brandModel');
const AppError = require('../utilities/errorHandlings/appError');
const catchAsync = require('../utilities/errorHandlings/catchAsync');


// Create a new brand
const createBrand = catchAsync(async (req, res, next) => {
    const { name, description, logoUrl } = req.body;

    if (!name) {
        return next(new AppError("All fields are reqiured", 400))
    }

    const newBrand = await Brand.create({ name, description, logoUrl });

    res.status(201).json({
        status: 'success',
        data: {
            brand: newBrand,
        },
    });
});

// Get all brands
const getAllBrands = catchAsync(async (req, res, next) => {
    const brands = await Brand.find();

    res.status(200).json({
        status: 'success',
        results: brands.length,
        data: {
            brands,
        },
    });
});

// Get a single brand by ID
const getBrandById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const brand = await Brand.findById(id);

    if (!brand) {
        return next(new AppError('Brand not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            brand,
        },
    });
});

// Update a brand by ID
const updateBrand = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, description, logoUrl } = req.body;

    const updatedBrand = await Brand.findByIdAndUpdate(
        id,
        { name, description, logoUrl },
        { new: true, runValidators: true }
    );

    if (!updatedBrand) {
        return next(new AppError('Brand not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            brand: updatedBrand,
        },
    });
});

// Delete a brand by ID
const deleteBrand = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const brand = await Brand.findByIdAndDelete(id);

    if (!brand) {
        return next(new AppError('Brand not found', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null,
    });
});

module.exports = {
    createBrand,
    getAllBrands,
    getBrandById,
    updateBrand,
    deleteBrand,
};
