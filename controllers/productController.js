const { groupProductsByLabel } = require("../helpers/aggregation/aggregations");
const { updateOne, deleteOne } = require("../helpers/handlerFactory/handlerFactory");
const categoryModel = require("../model/categoryModel");
const productModel = require("../model/productModel");
const uploadToCloudinary = require("../utilities/cloudinaryUpload");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");




const uploadProductImages = catchAsync(async (files) => {

    if (!files || files.length === 0) {
        return [];
    }

    const uploadedImages = await Promise.all(
        files.map((file) => uploadToCloudinary(file.buffer))
    );

    return uploadedImages;

});

const addProduct = catchAsync(async (req, res, next) => {

    const createdBy = req.user

    const { productName, productCode, productDescription, category, originalPrice, quantity, label } = req.body;

    if (!productName || !productCode || !productDescription || !category || !originalPrice || !quantity || !label) {
        return next(new AppError("All fields are required", 400));
    }

    const existingProduct = await productModel.findOne({
        $or: [{ productName }, { productCode }]
    });

    if (existingProduct) {
        if (existingProduct.productName === productName) {
            return next(new AppError("Product Name Already Exists", 400));
        }
        if (existingProduct.productCode === productCode) {
            return next(new AppError("Product Code Already Exists", 400));
        }
    }
    // Fetch the category with its offer details
    const categoryExist = await categoryModel.findById(category);


    if (!categoryExist) {
        return next(new AppError("Category not found", 404))
    }

    let offerPrice = originalPrice;

    if (categoryExist.offer && categoryExist.offer.isActive) {
        const currentDate = new Date();

        if (currentDate >= categoryExist.offer.startDate && currentDate <= categoryExist.offer.endDate) {
            const discount = (originalPrice * categoryExist.offer.discountPercentage) / 100;
            offerPrice = (originalPrice - discount).toFixed(2);
        }
    }

    // Handle file uploads
    const productImages = await uploadProductImages(req.files);


    // Create a new product
    const newProduct = new productModel({
        productName,
        productCode,
        productDescription,
        category,
        originalPrice,
        offerPrice,
        quantity,
        productImages,
        createdBy,
        label
    });

    // Save the product to the database
    await newProduct.save();
    res.status(201).json({ message: "Product added successfully", product: newProduct });
});

const listProducts = catchAsync(async (req, res, next) => {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;


    const skip = (page - 1) * limit;


    const productsPromise = productModel.find().skip(skip).limit(limit).populate("category", "name description").populate("createdBy", "username email role");
    const countPromise = productModel.countDocuments();

    const [products, totalProducts] = await Promise.all([productsPromise, countPromise]);

    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / limit);

    res.status(200).json({
        success: true,
        data: {
            products,
            totalProducts,
            totalPages,
            currentPage: page,
        }
    });
});


const getProductDetails = catchAsync(async (req, res, next) => {
    const { productId } = req.params

    const productDetails = await productModel.findById(productId).populate("category").populate("createdBy", "username email role")
    if (!productDetails) {
        return next(new AppError("Product Not found", 404))
    }

    res.status(200).json(productDetails)
})


const updateProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user;
    const userRole = req.role;


    const product = await productModel.findById(id);


    if (!product) {
        return next(new AppError("Product not found", 404));
    }


    if (userRole === "seller" && product.createdBy.toString() !== userId) {
        return next(new AppError("You are not authorized to update this product", 403));
    }


    const updatedData = req.body;


    const updatedProduct = await productModel.findByIdAndUpdate(id, updatedData, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        message: "Product updated successfully",
        product: updatedProduct,
    });
});



// const deleteProduct = catchAsync(async (req, res, next) => {
//     const { id } = req.params;

//     const product = await productModel.findByIdAndDelete(id);

//     if (!product) {
//         return next(new AppError("Product not found", 404));
//     }

//     res.status(200).json({
//         message: "Product deleted successfully",
//     });
// })

const deleteProduct = deleteOne(productModel)


const getProductsByLabel = catchAsync(async (req, res, next) => {

    const { labelId } = req.params;
    const products = await productModel.find({ label: labelId }).populate("label");

    res.status(200).json(products);

});

const getGroupedProducts = catchAsync(async (req, res, next) => {
    const result = await groupProductsByLabel()
    res.status(200).json(result)
})





module.exports = {
    addProduct,
    listProducts,
    getProductDetails,
    updateProduct,
    deleteProduct,
    getProductsByLabel,
    getGroupedProducts
}