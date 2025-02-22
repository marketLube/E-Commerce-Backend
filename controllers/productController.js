const { groupProductsByLabel, groupProductsByRating } = require("../helpers/aggregation/aggregations");
const { updateOne, deleteOne } = require("../helpers/handlerFactory/handlerFactory");
const categoryModel = require("../model/categoryModel");
const productModel = require("../model/productModel");
const uploadToCloudinary = require("../utilities/cloudinaryUpload");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");




const uploadProductImages = (files) => {
    return new Promise((resolve, reject) => {
        if (!files || files.length === 0) {
            return resolve([]);
        }

        Promise.all(files.map((file) => uploadToCloudinary(file.buffer)))
            .then((uploadedImages) => resolve(uploadedImages))
            .catch((error) => reject(error));
    });
};


const addProduct = catchAsync(async (req, res, next) => {

    const createdBy = req.user

    const { productName, productCode, productDescription, category, originalPrice, label, stock } = req.body;

    if (!productName || !productCode || !productDescription || !category || !originalPrice || !label || !stock) {
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
    const productImages = await uploadProductImages(req.files);
    const newProduct = new productModel({
        productName,
        productCode,
        productDescription,
        category,
        originalPrice,
        offerPrice,
        productImages,
        createdBy,
        label,
        stock
    });


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


    if (updatedData.originalPrice && updatedData.originalPrice !== product.originalPrice) {
        const category = await categoryModel.findById(product.category);

        if (category && category.offer && category.offer.isActive) {
            const currentDate = new Date();

            if (currentDate >= category.offer.startDate && currentDate <= category.offer.endDate) {
                const discount = (updatedData.originalPrice * category.offer.discountPercentage) / 100;
                updatedData.offerPrice = (updatedData.originalPrice - discount).toFixed(2);
            } else {
                updatedData.offerPrice = updatedData.originalPrice;
            }
        } else {
            updatedData.offerPrice = updatedData.originalPrice;
        }
    }


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

const getGroupedProductsByLabel = catchAsync(async (req, res, next) => {
    const result = await groupProductsByLabel()
    res.status(200).json(result)
})
const getGroupedProductsByRating = catchAsync(async (req, res, next) => {
    const result = await groupProductsByRating()
    res.status(200).json(result)
})

const searchProducts = catchAsync(async (req, res, next) => {
    let { keyword, category, minPrice, maxPrice, sortBy, page, limit } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (keyword) query.productName = { $regex: keyword, $options: "i" };
    if (category) query.category = category;
    if (minPrice || maxPrice) {
        query.originalPrice = {};
        if (minPrice) query.originalPrice.$gte = parseFloat(minPrice);
        if (maxPrice) query.originalPrice.$lte = parseFloat(maxPrice);
    }

    let sortOption = {};
    if (sortBy === "priceAsc") sortOption.originalPrice = 1;
    if (sortBy === "priceDesc") sortOption.originalPrice = -1;

    const products = await productModel.find(query).skip(skip).limit(limit).sort(sortOption);
    const totalProducts = await productModel.countDocuments(query);

    res.status(200).json({
        success: true,
        data: { products, totalProducts, totalPages: Math.ceil(totalProducts / limit), currentPage: page }
    });
});






module.exports = {
    addProduct,
    listProducts,
    getProductDetails,
    updateProduct,
    deleteProduct,
    getProductsByLabel,
    getGroupedProductsByLabel,
    getGroupedProductsByRating,
    searchProducts
}