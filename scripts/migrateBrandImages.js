const AWS = require('aws-sdk');
const cloudinary = require('../config/cloudinaryConfig');
const mongoose = require('mongoose');
const Brand = require('../model/brandModel');
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
    const tempFilePath = path.join(__dirname, 'temp', `brand_${Date.now()}_${Math.random()}.jpg`);
    
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
    return `brand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Helper function to generate S3 key
const generateS3Key = (originalUrl, brandId, brandName, imageType) => {
  const filename = extractFilenameFromUrl(originalUrl);
  const timestamp = Date.now();
  const safeBrandName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // Different paths for different image types
  const imagePath = {
    logo: `Millstore/brands/${brandId}_${safeBrandName}/logo`,
    image: `Millstore/brands/${brandId}_${safeBrandName}/image`,
    banner: `Millstore/brands/${brandId}_${safeBrandName}/banner`,
    mobileBanner: `Millstore/brands/${brandId}_${safeBrandName}/mobile-banner`,
  }[imageType] || `Millstore/brands/${brandId}_${safeBrandName}`;
  
  return `${imagePath}/${filename}_${timestamp}.jpg`;
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

// Function to migrate a single brand image
const migrateBrandImage = async (imageUrl, brandId, brandName, imageType) => {
  let tempFilePath = null;
  
  try {
    console.log(`Processing ${imageType} for brand: ${brandName} (${brandId})`);
    
    // Skip if not a Cloudinary URL or no image
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      console.log(`Skipping: No image or not a Cloudinary URL`);
      return null;
    }
    
    // Download image from Cloudinary
    tempFilePath = await downloadImage(imageUrl);
    
    // Generate S3 key
    const s3Key = generateS3Key(imageUrl, brandId, brandName, imageType);
    
    // Upload to S3
    const s3Url = await uploadToS3(tempFilePath, s3Key);
    
    // Log success
    migrationLog.push({
      brandId,
      brandName,
      imageType,
      originalUrl: imageUrl,
      newUrl: s3Url,
      status: 'success',
      timestamp: new Date().toISOString(),
    });
    
    successfulMigrations++;
    console.log(`✅ Successfully migrated ${imageType} for brand: ${brandName}`);
    
    return s3Url;
    
  } catch (error) {
    // Log failure
    migrationLog.push({
      brandId,
      brandName,
      imageType,
      originalUrl: imageUrl,
      error: error.message,
      status: 'failed',
      timestamp: new Date().toISOString(),
    });
    
    failedMigrations++;
    console.error(`❌ Failed to migrate ${imageType} for brand ${brandName}:`, error.message);
    
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

// Function to migrate all brand images
const migrateAllBrandImages = async () => {
  try {
    console.log('🚀 Starting Brand Images Migration...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    // Get all brands with any type of image
    const brands = await Brand.find({
      $or: [
        { logoUrl: { $exists: true, $ne: null } },
        { image: { $exists: true, $ne: null } },
        { bannerImage: { $exists: true, $ne: null } },
        { mobileBannerImage: { $exists: true, $ne: null } }
      ]
    });
    
    console.log(`Found ${brands.length} brands with images`);
    
    // Calculate total images
    totalImages = brands.reduce((total, brand) => {
      return total + 
        (brand.logoUrl ? 1 : 0) +
        (brand.image ? 1 : 0) +
        (brand.bannerImage ? 1 : 0) +
        (brand.mobileBannerImage ? 1 : 0);
    }, 0);
    
    console.log(`Total images to migrate: ${totalImages}\n`);
    
    // Process brands
    for (const brand of brands) {
      console.log(`\n🔄 Processing brand: ${brand.name}`);
      
      // Migrate logo
      if (brand.logoUrl) {
        const newLogoUrl = await migrateBrandImage(brand.logoUrl, brand._id, brand.name, 'logo');
        if (newLogoUrl) brand.logoUrl = newLogoUrl;
      }
      
      // Migrate main image
      if (brand.image) {
        const newImageUrl = await migrateBrandImage(brand.image, brand._id, brand.name, 'image');
        if (newImageUrl) brand.image = newImageUrl;
      }
      
      // Migrate banner image
      if (brand.bannerImage) {
        const newBannerUrl = await migrateBrandImage(brand.bannerImage, brand._id, brand.name, 'banner');
        if (newBannerUrl) brand.bannerImage = newBannerUrl;
      }
      
      // Migrate mobile banner image
      if (brand.mobileBannerImage) {
        const newMobileBannerUrl = await migrateBrandImage(brand.mobileBannerImage, brand._id, brand.name, 'mobileBanner');
        if (newMobileBannerUrl) brand.mobileBannerImage = newMobileBannerUrl;
      }
      
      // Save updated brand
      try {
        await brand.save();
        console.log(`✅ Updated brand ${brand.name} with new image URLs`);
      } catch (error) {
        console.error(`❌ Failed to update brand ${brand.name}:`, error.message);
      }
      
      // Small delay between brands
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Brand migration completed!');
    console.log(`📊 Summary:`);
    console.log(`   Total brands: ${brands.length}`);
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
  const logFileName = `brand_migration_log_${Date.now()}.json`;
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
    console.log('🔍 Running dry run for brand migration...\n');
    
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    const brands = await Brand.find({
      $or: [
        { logoUrl: { $exists: true, $ne: null } },
        { image: { $exists: true, $ne: null } },
        { bannerImage: { $exists: true, $ne: null } },
        { mobileBannerImage: { $exists: true, $ne: null } }
      ]
    });
    
    console.log(`Found ${brands.length} brands with images`);
    
    let totalImages = 0;
    let cloudinaryImages = 0;
    let s3Images = 0;
    let imageTypeStats = {
      logo: { total: 0, cloudinary: 0, s3: 0 },
      image: { total: 0, cloudinary: 0, s3: 0 },
      banner: { total: 0, cloudinary: 0, s3: 0 },
      mobileBanner: { total: 0, cloudinary: 0, s3: 0 }
    };
    
    brands.forEach(brand => {
      // Check logo
      if (brand.logoUrl) {
        totalImages++;
        imageTypeStats.logo.total++;
        if (brand.logoUrl.includes('amazonaws.com')) {
          s3Images++;
          imageTypeStats.logo.s3++;
        } else if (brand.logoUrl.includes('cloudinary.com')) {
          cloudinaryImages++;
          imageTypeStats.logo.cloudinary++;
        }
      }
      
      // Check main image
      if (brand.image) {
        totalImages++;
        imageTypeStats.image.total++;
        if (brand.image.includes('amazonaws.com')) {
          s3Images++;
          imageTypeStats.image.s3++;
        } else if (brand.image.includes('cloudinary.com')) {
          cloudinaryImages++;
          imageTypeStats.image.cloudinary++;
        }
      }
      
      // Check banner image
      if (brand.bannerImage) {
        totalImages++;
        imageTypeStats.banner.total++;
        if (brand.bannerImage.includes('amazonaws.com')) {
          s3Images++;
          imageTypeStats.banner.s3++;
        } else if (brand.bannerImage.includes('cloudinary.com')) {
          cloudinaryImages++;
          imageTypeStats.banner.cloudinary++;
        }
      }
      
      // Check mobile banner image
      if (brand.mobileBannerImage) {
        totalImages++;
        imageTypeStats.mobileBanner.total++;
        if (brand.mobileBannerImage.includes('amazonaws.com')) {
          s3Images++;
          imageTypeStats.mobileBanner.s3++;
        } else if (brand.mobileBannerImage.includes('cloudinary.com')) {
          cloudinaryImages++;
          imageTypeStats.mobileBanner.cloudinary++;
        }
      }
    });
    
    console.log(`\n📊 Dry run results:`);
    console.log(`   Total brands: ${brands.length}`);
    console.log(`   Total images: ${totalImages}`);
    console.log(`   Cloudinary images: ${cloudinaryImages}`);
    console.log(`   S3 images: ${s3Images}`);
    console.log(`   Images to migrate: ${cloudinaryImages}`);
    
    console.log('\n   Breakdown by image type:');
    for (const [type, stats] of Object.entries(imageTypeStats)) {
      console.log(`   ${type}:`);
      console.log(`     Total: ${stats.total}`);
      console.log(`     On Cloudinary: ${stats.cloudinary}`);
      console.log(`     On S3: ${stats.s3}`);
    }
    
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
  migrateAllBrandImages();
} else {
  console.log(`
Usage:
  node migrateBrandImages.js dry-run    # Run analysis without migrating
  node migrateBrandImages.js migrate    # Start the brand migration process
  `);
}

module.exports = {
  migrateAllBrandImages,
  dryRun,
}; 