const {
  groupProductsByLabel,
  groupProductsByRating,
} = require("../helpers/aggregation/aggregations");
const {
  updateOne,
  deleteOne,
} = require("../helpers/handlerFactory/handlerFactory");
const categoryModel = require("../model/categoryModel");
const Product = require("../model/productModel");
const productModel = require("../model/productModel");
const Variant = require("../model/variantsModel");
const uploadToCloudinary = require("../utilities/cloudinaryUpload");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");

const addProduct = catchAsync(async (req, res) => {
  console.log(req.body);
  const {
    name,
    brand,
    category,
    description,
    variants: variantsArray,
    sku,
    price,
    offerPrice,
    stock,
    label,
    units,
  } = req.body;

  const createdBy = req.user;
  const productImages = [];
  const variantImagesMap = {};

  // Process uploaded files
  for (const file of req.files) {
    const { fieldname } = file;

    if (fieldname.startsWith("productImages")) {
      const imageIndex = parseInt(fieldname.match(/\[(\d+)\]/)[1]);
      const imageUrl = await uploadToCloudinary(file.buffer);

      productImages[imageIndex] = imageUrl;
    } else if (fieldname.startsWith("variants")) {
      const match = fieldname.match(/variants\[(\d+)\]\[images\]\[(\d+)\]/);
      if (match) {
        const variantIndex = match[1];
        const imageIndex = parseInt(match[2]);

        if (!variantImagesMap[variantIndex]) {
          variantImagesMap[variantIndex] = [];
        }
        const imageUrl = await uploadToCloudinary(file.buffer);
        variantImagesMap[variantIndex][imageIndex] = imageUrl;
      }
    }
  }

  // Clean up variant images
  Object.keys(variantImagesMap).forEach((variantIndex) => {
    variantImagesMap[variantIndex] = variantImagesMap[variantIndex].filter(
      (img) => img
    );
  });

  // Prepare product data
  const productData = {
    name,
    brand,
    category,
    description,
    images: productImages,
    createdBy,
    label,
    units,
  };

  if (variantsArray && variantsArray.length > 0) {
    // Parse the variants from strings to objects
    const parsedVariants = variantsArray;

    // Create variants with proper data structure
    const variantIds = await Promise.all(
      parsedVariants.map(async (variant, index) => {
        const variantData = {
          sku: variant.sku,
          price: variant.price,
          offerPrice: variant.offerPrice,
          stock: variant.stock,
          stockStatus: variant.stockStatus,
          attributes: variant.attributes,
          product: null, // Will be updated after product creation
          images: variantImagesMap[index] || [],
        };

        const newVariant = new Variant(variantData);
        await newVariant.save();
        return newVariant._id;
      })
    );
    productData.variants = variantIds;
  } else {
    // Handle products without variants
    productData.sku = sku;
    productData.price = price;
    productData.offerPrice = offerPrice;
    productData.stock = stock;
  }

  // Create and save the product
  const newProduct = new Product(productData);
  await newProduct.save();

  // Update variants with the product reference
  if (newProduct.variants && newProduct.variants.length > 0) {
    await Variant.updateMany(
      { _id: { $in: newProduct.variants } },
      { $set: { product: newProduct._id } }
    );
  }

  res.status(201).json({
    message: "Product added successfully",
    product: newProduct,
  });
});

const formatProductResponse = (product) => {
  let hasVariants = false;
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    hasVariants = true;
  }
  return {
    _id: product._id,
    name: product.name,
    brand: product.brand
      ? {
          _id: product.brand._id,
          name: product.brand.name,
          createdAt: product.brand.createdAt,
          updatedAt: product.brand.updatedAt,
        }
      : null,
    category: product.category
      ? {
          _id: product.category._id,
          name: product.category.name,
          description: product.category.description,
        }
      : null,
    description: product.description,
    hasVariants: hasVariants,
    sku: hasVariants ? product.variants[0].sku : product.sku,
    price: hasVariants ? product.variants[0].price : product.price,
    offerPrice: hasVariants
      ? product.variants[0].offerPrice
      : product.offerPrice,
    stock: hasVariants ? product.variants[0].stock : product.stock,
    mainImage:
      hasVariants &&
      Array.isArray(product.variants[0].images) &&
      product.variants[0].images.length > 0
        ? product.variants[0].images[0]
        : Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : null,
    createdBy: product.createdBy
      ? {
          _id: product.createdBy._id,
          username: product.createdBy.username,
          email: product.createdBy.email,
          role: product.createdBy.role,
        }
      : null,
    label: product.label,
    averageRating: product.averageRating,
    totalRatings: product.totalRatings,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

const listProducts = catchAsync(async (req, res, next) => {
  let { page, limit } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const skip = (page - 1) * limit;

  const productsPromise = Product.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("brand")
    .populate("variants")
    .populate("category", "name description")
    .populate("createdBy", "username email role");

  const countPromise = Product.countDocuments();

  const [products, totalProducts] = await Promise.all([
    productsPromise,
    countPromise,
  ]);

  const formattedProducts = products.map(formatProductResponse);

  res.status(200).json({
    success: true,
    data: {
      products: formattedProducts,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
    },
  });
});

const getProductDetails = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const productDetails = await Product.findById(productId)
    .populate("category")
    .populate("createdBy", "username email role")
    .populate("variants")
    .populate("brand")
    .populate("label");
  if (!productDetails) {
    return next(new AppError("Product not found", 404));
  }

  res.status(200).json(productDetails);
});

const updateProduct = catchAsync(async (req, res, next) => {
  const { productId } = req.query;
  const updateData = req.body;
  03;
  const product = await Product.findById(productId).populate("variants");

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  const variantImagesMap = {};
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const { fieldname } = file;

      if (fieldname.startsWith("productImages")) {
        const imageIndex = parseInt(fieldname.match(/\[(\d+)\]/)[1]);
        const imageUrl = await uploadToCloudinary(file.buffer);
        if (!updateData.images) updateData.images = [...product.images];
        updateData.images[imageIndex] = imageUrl;
      } else if (fieldname.startsWith("variants")) {
        const match = fieldname.match(/variants\[(\d+)\]\[images\]\[(\d+)\]/);
        if (match) {
          const variantIndex = match[1];
          const imageIndex = parseInt(match[2]);

          if (!variantImagesMap[variantIndex]) {
            // Initialize with existing images if it's an existing variant
            const existingVariant = product.variants[variantIndex];
            variantImagesMap[variantIndex] = existingVariant
              ? [...existingVariant.images]
              : [];
          }
          const imageUrl = await uploadToCloudinary(file.buffer);
          variantImagesMap[variantIndex][imageIndex] = imageUrl;
        }
      }
    }
  }

  let variantIds = [];
  let newVariants = [];
  if (updateData.variants) {
    // Use Promise.all to handle async operations properly
    await Promise.all(
      updateData.variants.map(async (variant, index) => {
        if (variant._id) {
          variantIds.push(variant._id);
          const variantId = variant._id;
          delete variant._id;

          // Update existing variant with new images if any
          if (variantImagesMap[index]) {
            variant.images = variantImagesMap[index].filter((img) => img);
          }

          await Variant.findByIdAndUpdate(variantId, variant, {
            new: true,
            runValidators: true,
          });
        } else {
          // For new variants
          variant.product = productId;
          // Add images from variantImagesMap if any
          if (variantImagesMap[index]) {
            variant.images = variantImagesMap[index].filter((img) => img);
          }
          newVariants.push(variant);
        }
      })
    );
  }

  // Create new variants
  const newVariantIds = await Promise.all(
    newVariants.map(async (variant) => {
      const newVariant = new Variant(variant);
      await newVariant.save();
      return newVariant._id;
    })
  );

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    {
      ...updateData,
      variants: [...variantIds, ...newVariantIds],
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    message: "Product updated successfully",
    product: updatedProduct,
  });
});

const deleteProduct = catchAsync(async (req, res, next) => {
  const { productId, variantId } = req.query;

  if (variantId) {
    const variant = await Variant.findOneAndDelete({
      _id: variantId,
      product: productId,
    });

    if (!variant) {
      return next(
        new AppError(
          "Variant not found or does not belong to the specified product",
          404
        )
      );
    }
    await productModel.findByIdAndUpdate(productId, {
      $pull: { variants: variantId },
    });
    res.status(200).json({
      message: "Variant deleted successfully",
    });
  } else {
    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    await Variant.deleteMany({ product: productId });

    res.status(200).json({
      message: "Product and its variants deleted successfully",
    });
  }
});

const getProductsByLabel = catchAsync(async (req, res, next) => {
  const { labelId } = req.params;
  const products = await productModel
    .find({ label: labelId })
    .populate("label");

  res.status(200).json(products);
});

const getGroupedProductsByLabel = catchAsync(async (req, res, next) => {
  const result = await groupProductsByLabel();
  res.status(200).json(result);
});
const getGroupedProductsByRating = catchAsync(async (req, res, next) => {
  const result = await groupProductsByRating();
  res.status(200).json(result);
});

const searchProducts = catchAsync(async (req, res, next) => {
  let { keyword, page, limit } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 3;

  const skip = (page - 1) * limit;

  const query = keyword ? { name: { $regex: keyword, $options: "i" } } : {};

  const productsPromise = Product.find(query)
    .skip(skip)
    .limit(limit)
    .populate("brand")
    .populate("category", "name description")
    .populate("createdBy", "username email role");

  const countPromise = Product.countDocuments(query);

  const [products, totalProducts] = await Promise.all([
    productsPromise,
    countPromise,
  ]);

  const formattedProducts = products.map(formatProductResponse);

  res.status(200).json({
    success: true,
    data: {
      products: formattedProducts,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
    },
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
  searchProducts,
};
