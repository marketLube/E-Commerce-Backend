const Banner = require("../model/bannerModel");
const uploadToCloudinary = require("../utilities/cloudinaryUpload");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const path = require("path");
const fs = require("fs");

const createBanner = catchAsync(async (req, res, next) => {
  const { title, bannerFor, image, category, percentage } = req.body;

  const bannerData = { title, bannerFor, image };

  if (bannerFor === "category") {
    const alreadyExist = await Banner.findOne({
      category: category,
      bannerFor: "category",
    });
    if (alreadyExist) {
      return next(new AppError("Banner For this category already exists", 400));
    }

    bannerData.category = category;
    bannerData.percentage = percentage;
  }

  if (req.files && req.files.length > 0) {
    const imageFile = req.files[0];
    const uploadedImage = await uploadToCloudinary(imageFile.buffer);
    bannerData.image = uploadedImage;
  }

  const newBanner = await Banner.create(bannerData);

  res.status(201).json({
    status: "success",
    data: newBanner,
  });
});

const getAllBanners = catchAsync(async (req, res, next) => {
  const banners = await Banner.find();
  res.status(200).json({
    status: "success",
    data: banners,
  });
});

const deleteBanner = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const banner = await Banner.findById(id);

  if (!banner) {
    return next(new AppError("Banner not found", 404));
  }

  if (banner.image) {
    const imagePath = path.join("public", banner.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  await banner.deleteOne();

  res.status(200).json({
    status: "success",
    message: "Banner deleted successfully",
  });
});

const updateBanner = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { title, bannerFor, image, category, percentage } = req.body;

  const banner = await Banner.findById(id);
  if (!banner) {
    return next(new AppError("Banner not found", 404));
  }

  if (req.files && req.files.length > 0) {
    const imageFile = req.files[0];
    const uploadedImage = await uploadToCloudinary(imageFile.buffer);
    banner.image = uploadedImage;
  }

  banner.title = title || banner.title;
  banner.bannerFor = bannerFor || banner.bannerFor;
  banner.image = image || banner.image;
  if (bannerFor === "category") {
    const alreadyExist = await Banner.findOne({
      category: category,
      bannerFor: "category",
      _id: { $ne: id },
    });
    if (alreadyExist) {
      return next(new AppError("Banner For this category already exists", 400));
    }
    banner.category = category || banner.category;
    banner.percentage = percentage || banner.percentage;
  }

  await banner.save();

  res.status(200).json({
    status: "success",
    data: banner,
    message: "Banner updated successfully",
  });
});

const getAllBannersByCategory = catchAsync(async (req, res, next) => {
  const banners = await Banner.find({ bannerFor: "category" }).populate(
    "category"
  );
  res.status(200).json({ status: "success", data: banners });
});

module.exports = {
  createBanner,
  getAllBanners,
  deleteBanner,
  updateBanner,
  getAllBannersByCategory,
};
