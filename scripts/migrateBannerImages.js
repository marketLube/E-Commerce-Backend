const AWS = require('aws-sdk');
const cloudinary = require('../config/cloudinaryConfig');
const mongoose = require('mongoose');
const Banner = require('../model/bannerModel');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
require('dotenv').config();

// AWS S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Migration progress tracking
let totalImages = 0;
let processedImages = 0;
let successfulMigrations = 0;
let failedMigrations = 0;
const migrationLog = [];

// Helper function to download image from URL
const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const tempFilePath = path.join(__dirname, 'temp', `banner_${Date.now()}_${Math.random()}.jpg`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const file = fs.createWriteStream(tempFilePath);
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(tempFilePath);
      });
      
      file.on('error', (err) => {
        fs.unlink(tempFilePath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

// Helper function to upload to S3
const uploadToS3 = async (filePath, key) => {
  const fileContent = fs.readFileSync(filePath);
  const contentType = getContentType(filePath);
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

// Helper function to get content type
const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return contentTypes[ext] || 'image/jpeg';
};

// Helper function to extract filename from Cloudinary URL
const extractFilenameFromUrl = (url) => {
  try {
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const nameWithoutExt = filename.split('.')[0];
    return nameWithoutExt;
  } catch (error) {
    return `banner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Helper function to generate S3 key
const generateS3Key = (originalUrl, bannerId, isMobile = false) => {
  const filename = extractFilenameFromUrl(originalUrl);
  const timestamp = Date.now();
  const type = isMobile ? 'mobile' : 'desktop';
  return `Millstore/banners/${type}/${bannerId}/${filename}_${timestamp}.jpg`;
};

// Helper function to clean up temp files
const cleanupTempFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to cleanup temp file: ${filePath}`, error);
  }
};

// Function to migrate a single banner image
const migrateBannerImage = async (imageUrl, bannerId, isMobile = false) => {
  let tempFilePath = null;
  
  try {
    console.log(`Processing ${isMobile ? 'mobile' : 'desktop'} image for banner ${bannerId}`);
    
    // Skip if not a Cloudinary URL or no image
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      console.log(`Skipping: No image or not a Cloudinary URL`);
      return null;
    }
    
    // Download image from Cloudinary
    tempFilePath = await downloadImage(imageUrl);
    
    // Generate S3 key
    const s3Key = generateS3Key(imageUrl, bannerId, isMobile);
    
    // Upload to S3
    const s3Url = await uploadToS3(tempFilePath, s3Key);
    
    // Log success
    migrationLog.push({
      bannerId,
      imageType: isMobile ? 'mobile' : 'desktop',
      originalUrl: imageUrl,
      newUrl: s3Url,
      status: 'success',
      timestamp: new Date().toISOString(),
    });
    
    successfulMigrations++;
    console.log(`✅ Successfully migrated ${isMobile ? 'mobile' : 'desktop'} image for banner ${bannerId}`);
    
    return s3Url;
    
  } catch (error) {
    // Log failure
    migrationLog.push({
      bannerId,
      imageType: isMobile ? 'mobile' : 'desktop',
      originalUrl: imageUrl,
      error: error.message,
      status: 'failed',
      timestamp: new Date().toISOString(),
    });
    
    failedMigrations++;
    console.error(`❌ Failed to migrate ${isMobile ? 'mobile' : 'desktop'} image for banner ${bannerId}:`, error.message);
    
    return null;
  } finally {
    // Cleanup temp file
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }
    
    processedImages++;
    console.log(`Progress: ${processedImages}/${totalImages} images processed`);
  }
};

// Function to migrate all banner images
const migrateAllBannerImages = async () => {
  try {
    console.log('🚀 Starting Banner Images Migration...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    // Get all banners with images
    const banners = await Banner.find({
      $or: [
        { image: { $exists: true, $ne: null } },
        { mobileImage: { $exists: true, $ne: null } }
      ]
    });
    
    console.log(`Found ${banners.length} banners with images`);
    
    // Calculate total images
    totalImages = banners.reduce((total, banner) => {
      if (banner.image) total++;
      if (banner.mobileImage) total++;
      return total;
    }, 0);
    
    console.log(`Total images to migrate: ${totalImages}\n`);
    
    // Process banners
    for (const banner of banners) {
      console.log(`\n🔄 Processing banner: ${banner._id}`);
      
      // Migrate desktop image
      if (banner.image) {
        const newDesktopUrl = await migrateBannerImage(banner.image, banner._id, false);
        if (newDesktopUrl) {
          banner.image = newDesktopUrl;
        }
      }
      
      // Migrate mobile image
      if (banner.mobileImage) {
        const newMobileUrl = await migrateBannerImage(banner.mobileImage, banner._id, true);
        if (newMobileUrl) {
          banner.mobileImage = newMobileUrl;
        }
      }
      
      // Update banner with new URLs
      try {
        await banner.save();
        console.log(`✅ Updated banner ${banner._id} with new image URLs`);
      } catch (error) {
        console.error(`❌ Failed to update banner ${banner._id}:`, error.message);
      }
      
      // Small delay between banners
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Banner migration completed!');
    console.log(`📊 Summary:`);
    console.log(`   Total images: ${totalImages}`);
    console.log(`   Successful migrations: ${successfulMigrations}`);
    console.log(`   Failed migrations: ${failedMigrations}`);
    console.log(`   Success rate: ${((successfulMigrations / totalImages) * 100).toFixed(2)}%`);
    
    // Save migration log
    saveMigrationLog();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Cleanup temp directory
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
};

// Function to save migration log
const saveMigrationLog = () => {
  const logFileName = `banner_migration_log_${Date.now()}.json`;
  const logPath = path.join(__dirname, 'logs', logFileName);
  
  // Ensure logs directory exists
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logData = {
    summary: {
      totalImages,
      processedImages,
      successfulMigrations,
      failedMigrations,
      successRate: ((successfulMigrations / totalImages) * 100).toFixed(2) + '%',
      startTime: new Date().toISOString(),
    },
    details: migrationLog,
  };
  
  fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
  console.log(`\n📊 Migration log saved to: ${logPath}`);
};

// Function to run a dry run
const dryRun = async () => {
  try {
    console.log('🔍 Running dry run for banner migration...\n');
    
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    const banners = await Banner.find({
      $or: [
        { image: { $exists: true, $ne: null } },
        { mobileImage: { $exists: true, $ne: null } }
      ]
    });
    
    console.log(`Found ${banners.length} banners with images`);
    
    let totalImages = 0;
    let cloudinaryImages = 0;
    let s3Images = 0;
    
    banners.forEach(banner => {
      if (banner.image) {
        totalImages++;
        if (banner.image.includes('amazonaws.com')) {
          s3Images++;
        } else if (banner.image.includes('cloudinary.com')) {
          cloudinaryImages++;
        }
      }
      
      if (banner.mobileImage) {
        totalImages++;
        if (banner.mobileImage.includes('amazonaws.com')) {
          s3Images++;
        } else if (banner.mobileImage.includes('cloudinary.com')) {
          cloudinaryImages++;
        }
      }
    });
    
    console.log(`\n📊 Dry run results:`);
    console.log(`   Total banners: ${banners.length}`);
    console.log(`   Total images: ${totalImages}`);
    console.log(`   Cloudinary images: ${cloudinaryImages}`);
    console.log(`   S3 images: ${s3Images}`);
    console.log(`   Images to migrate: ${cloudinaryImages}`);
    
  } catch (error) {
    console.error('❌ Dry run failed:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Command line interface
const command = process.argv[2];

if (command === 'dry-run') {
  dryRun();
} else if (command === 'migrate') {
  migrateAllBannerImages();
} else {
  console.log(`
Usage:
  node migrateBannerImages.js dry-run    # Run analysis without migrating
  node migrateBannerImages.js migrate    # Start the banner migration process
  `);
}

module.exports = {
  migrateAllBannerImages,
  dryRun,
}; 