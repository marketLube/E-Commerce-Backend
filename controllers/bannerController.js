const Banner = require("../model/bannerModel");
const uploadToCloudinary = require("../utilities/cloudinaryUpload");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const path = require("path");
const fs = require("fs");


const createBanner = catchAsync(async (req, res, next) => {
  const { title, bannerFor, image } = req.body;

  const bannerData = { title, bannerFor, image };

  
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
  console.log("delete banner", id);
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
  const { title, bannerFor, image } = req.body;

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

  await banner.save();

  res.status(200).json({
    status: "success",
    data: banner,
  });
});

module.exports = { createBanner, getAllBanners, deleteBanner, updateBanner };
