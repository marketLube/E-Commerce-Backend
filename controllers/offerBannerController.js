const OfferBanner = require("../model/offerBannerModel");
const uploadToCloudinary = require("../utilities/cloudinaryUpload");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");
const path = require("path");
const fs = require("fs");


const createOfferBanner = catchAsync(async (req, res, next) => {
  const { title, subtitle, description, offerValue, offerType, link, image } = req.body;

  const bannerData = {
    title,
    subtitle,
    description,
    offerValue,
    offerType,
    link,
    image,
  };

  if (req.files && req.files.length > 0) {
    const imageFile = req.files[0];
    const uploadedImage = await uploadToCloudinary(imageFile.buffer);
    bannerData.image = uploadedImage;
  }

  const newBanner = await OfferBanner.create(bannerData);

  res.status(201).json({
    status: "success",
    data: newBanner,
  });
});

const getAllOfferBanners = catchAsync(async (req, res, next) => {
  const banners = await OfferBanner.find();
  res.status(200).json({
    status: "success",
    data: banners,
  });
});

const deleteOfferBanner = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const banner = await OfferBanner.findById(id);

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

const updateOfferBanner = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { title, subtitle, description, offerValue, offerType, link, image } = req.body;

  const banner = await OfferBanner.findById(id);
  if (!banner) {
    return next(new AppError("Banner not found", 404));
  }

  if (req.files && req.files.length > 0) {
    const imageFile = req.files[0];
    const uploadedImage = await uploadToCloudinary(imageFile.buffer);
    banner.image = uploadedImage;
  }

  banner.title = title || banner.title;
  banner.subtitle = subtitle || banner.subtitle;
  banner.description = description || banner.description;
  banner.offerValue = offerValue || banner.offerValue;
  banner.offerType = offerType || banner.offerType;
  banner.link = link || banner.link;
  banner.image = image || banner.image;

  await banner.save();

  res.status(200).json({
    status: "success",
    data: banner,
  });
});

module.exports = { createOfferBanner, getAllOfferBanners, deleteOfferBanner, updateOfferBanner };
