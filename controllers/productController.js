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
const Rating = require("../model/ratingModel");
const mongoose = require("mongoose");

const addProduct = catchAsync(async (req, res, next) => {
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
    stockStatus,
  } = req.body;

  if (stockStatus === "outofstock" && stock > 0) {
    return next(
      new AppError(
        "Stock status cannot be out of stock when stock quantity is greater than 0",
        400
      )
    );
  }

  const queryConditions = [];

  if (sku !== undefined) {
    queryConditions.push({ sku });
  }

  if (name !== undefined) {
    queryConditions.push({ name });
  }

  const productExists = await Product.findOne({
    $or: queryConditions,
  });

  if (productExists) {
    return next(new AppError("Product already exists", 400));
  }

  if (variantsArray && variantsArray.length > 0) {
    try {
      await Promise.all(
        variantsArray.map(async (variant) => {
          const skuExists =
            (await Variant.findOne({
              $or: [
                { sku: variant.sku },
                { "attributes.title": variant.attributes.title },
              ],
            })) ||
            (await Product.findOne({
              $or: [{ sku: variant.sku }],
            }));
          if (skuExists) {
            if (skuExists.sku === variant.sku) {
              return Promise.reject(
                `${variant?.attributes?.title}'s SKU ${variant.sku} already exists`
              );
            } else {
              return Promise.reject(`Variant Title already exists`);
            }
          }
        })
      );
    } catch (err) {
      console.log("err", err);
      return next(new AppError(err, 400));
    }
  }

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
    stockStatus,
  };

  if (variantsArray && variantsArray.length > 0) {
    // Add variant stock validation
    for (const variant of variantsArray) {
      if (variant.stockStatus === "outofstock" && variant.stock > 0) {
        return next(
          new AppError(
            "Variant stock status cannot be out of stock when stock quantity is greater than 0",
            400
          )
        );
      }
    }

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
  const variants = product.variantsData || product.variants || [];
  if (Array.isArray(variants) && variants.length > 0) {
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
    description: hasVariants
      ? variants[0]?.attributes?.description || product.description
      : product.description,
    hasVariants: hasVariants,
    sku: hasVariants ? variants[0]?.sku : product.sku,
    price: hasVariants ? variants[0]?.price : product.price,
    offerPrice: hasVariants ? variants[0]?.offerPrice : product.offerPrice,
    stock: hasVariants ? variants[0]?.stock : product.stock,
    mainImage:
      hasVariants &&
      Array.isArray(variants[0]?.images) &&
      variants[0]?.images.length > 0
        ? variants[0].images[0]
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
  let {
    page,
    limit,
    categoryId,
    subcategoryId,
    minPrice,
    maxPrice,
    sort,
    search,
    labelId,
    brandId,
  } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const skip = (page - 1) * limit;

  // Build base filter object
  const filter = {
    isDeleted: { $ne: true },
  };

  if (categoryId) {
    filter.category = new mongoose.Types.ObjectId(categoryId);
  }

  if (subcategoryId) {
    filter.category = new mongoose.Types.ObjectId(subcategoryId);
  }

  if (brandId) {
    filter.brand = new mongoose.Types.ObjectId(brandId);
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (labelId) {
    filter.label = {
      $in: labelId.split(",").map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  // Use aggregation pipeline for proper price handling
  const aggregationPipeline = [
    {
      $lookup: {
        from: "variants",
        localField: "variants",
        foreignField: "_id",
        as: "variantsData",
      },
    },
    {
      $addFields: {
        effectivePrice: {
          $cond: {
            if: { $gt: [{ $size: "$variantsData" }, 0] },
            then: { $min: "$variantsData.offerPrice" },
            else: "$offerPrice",
          },
        },
      },
    },
    {
      $match: {
        ...filter,
        ...(minPrice || maxPrice
          ? {
              effectivePrice: {
                ...(minPrice && { $gte: parseInt(minPrice) }),
                ...(maxPrice && { $lte: parseInt(maxPrice) }),
              },
            }
          : {}),
      },
    },
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brand",
      },
    },
    {
      $lookup: {
        from: "labels",
        localField: "label",
        foreignField: "_id",
        as: "label",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$label", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
    {
      $sort:
        sort === "price-low"
          ? { effectivePrice: 1 }
          : sort === "price-high"
          ? { effectivePrice: -1 }
          : { createdAt: -1 },
    },
    { $skip: skip },
    { $limit: limit },
  ];

  const countPipeline = [
    {
      $lookup: {
        from: "variants",
        localField: "variants",
        foreignField: "_id",
        as: "variantsData",
      },
    },
    {
      $addFields: {
        effectivePrice: {
          $cond: {
            if: { $gt: [{ $size: "$variantsData" }, 0] },
            then: { $min: "$variantsData.price" },
            else: "$price",
          },
        },
      },
    },
    {
      $match: {
        ...filter,
        ...(minPrice || maxPrice
          ? {
              effectivePrice: {
                ...(minPrice && { $gte: parseInt(minPrice) }),
                ...(maxPrice && { $lte: parseInt(maxPrice) }),
              },
            }
          : {}),
      },
    },
    { $count: "total" },
  ];

  const [products, countResult] = await Promise.all([
    Product.aggregate(aggregationPipeline),
    Product.aggregate(countPipeline),
  ]);

  // Use the count from countResult instead of products.length
  const totalProducts = countResult[0]?.total || 0;
  const formattedProducts = products.map((product) => {
    const formatted = formatProductResponse(product);
    // Add variants data separately
    formatted.variants = product.variantsData || [];
    return formatted;
  });

  res.status(200).json({
    success: true,
    data: {
      products: formattedProducts,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      filters: {
        categoryId,
        subcategoryId,
        minPrice,
        maxPrice,
        sort,
      },
    },
  });
});

const getProductDetails = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  // Get product details with populated fields
  const productDetails = await Product.findById(productId)
    .populate("category")
    .populate("createdBy", "username email role")
    .populate("variants")
    .populate("brand")
    .populate("label");

  if (!productDetails) {
    return next(new AppError("Product not found", 404));
  }

  // Get rating distribution
  const ratingDistribution = await Rating.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productDetails._id) } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  // Get all ratings with user details
  const ratings = await Rating.find({ productId: productDetails._id })
    .populate("userId", "username email profileImage") // Add the fields you want from the user
    .sort({ createdAt: -1 }); // Sort by newest first

  // Convert rating distribution to an object with all ratings (1-5)
  const ratingCounts = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  ratingDistribution.forEach((rating) => {
    ratingCounts[rating._id] = rating.count;
  });

  // Calculate rating statistics
  const totalRatings = ratings.length;
  const averageRating =
    totalRatings > 0
      ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / totalRatings
      : 0;

  const updated = productDetails.toObject();
  updated.ratingDistribution = ratingCounts;
  updated.ratings = ratings;
  updated.ratingStats = {
    totalRatings,
    averageRating: Number(averageRating.toFixed(1)),
    ratingCounts,
  };

  res.status(200).json(updated);
});

const updateProduct = catchAsync(async (req, res, next) => {
  console.log(req.body, req.query, "req.body");
  const { productId } = req.query;
  const updateData = req.body;

  if (updateData.variants) {
    try {
      await Promise.all(
        updateData.variants.map(async (variant) => {
          const skuExists =
            (await Variant.findOne({
              $or: [
                { sku: variant.sku },
                { "attributes.title": variant.attributes.title },
              ],
            })) ||
            (await Product.findOne({
              $or: [{ sku: variant.sku }],
            }));
          if (skuExists) {
            if (skuExists.sku === variant.sku) {
              return Promise.reject(
                `${variant?.attributes?.title}'s SKU ${variant.sku} already exists`
              );
            } else {
              return Promise.reject(`Variant Title already exists`);
            }
          }
        })
      );
    } catch (err) {
      console.log("err", err);
      return next(new AppError(err, 400));
    }
  }

  // Add stock validation for main product
  if (updateData.stockStatus === "outofstock" && updateData.stock > 0) {
    return next(
      new AppError(
        "Stock status cannot be out of stock when stock quantity is greater than 0",
        400
      )
    );
  }

  // Add stock validation for variants
  if (updateData.variants) {
    for (const variant of updateData.variants) {
      if (variant.stockStatus === "outofstock" && variant.stock > 0) {
        return next(
          new AppError(
            "Variant stock status cannot be out of stock when stock quantity is greater than 0",
            400
          )
        );
      }
    }
  }

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

  // Create aggregation pipeline for better search
  const aggregationPipeline = [
    {
      $lookup: {
        from: "variants",
        localField: "variants",
        foreignField: "_id",
        as: "variantsData",
      },
    },
    {
      $match: keyword
        ? {
            $or: [
              { name: { $regex: keyword, $options: "i" } },
              // { description: { $regex: keyword, $options: "i" } },
              { "variantsData.sku": { $regex: keyword, $options: "i" } },
            ],
          }
        : {},
    },
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brand",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
    { $skip: skip },
    { $limit: limit },
  ];

  const countPipeline = [
    {
      $lookup: {
        from: "variants",
        localField: "variants",
        foreignField: "_id",
        as: "variantsData",
      },
    },
    {
      $match: keyword
        ? {
            $or: [
              { name: { $regex: keyword, $options: "i" } },
              // { description: { $regex: keyword, $options: "i" } },
              { "variantsData.sku": { $regex: keyword, $options: "i" } },
            ],
          }
        : {},
    },
    { $count: "total" },
  ];

  const [products, countResult] = await Promise.all([
    Product.aggregate(aggregationPipeline),
    Product.aggregate(countPipeline),
  ]);

  const totalProducts = countResult[0]?.total || 0;
  const formattedProducts = products.map((product) => {
    const formatted = formatProductResponse(product);
    // Add variants data separately
    formatted.variants = product.variantsData || [];
    return formatted;
  });

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

const softDeleteProduct = catchAsync(async (req, res, next) => {
  const { productId } = req.query;

  const product = await Product.findById(productId);

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // Update the product status to indicate it's deleted
  await Product.findByIdAndUpdate(productId, {
    isDeleted: true,
    deletedAt: new Date(),
  });

  res.status(200).json({
    status: "success",
    message: "Product has been soft deleted",
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
  softDeleteProduct,
};
