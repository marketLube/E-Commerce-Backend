const AWS = require('aws-sdk');
const cloudinary = require('../config/cloudinaryConfig');
const mongoose = require('mongoose');
const Category = require('../model/categoryModel');
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
    const tempFilePath = path.join(__dirname, 'temp', `category_${Date.now()}_${Math.random()}.jpg`);
    
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
    return `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Helper function to generate S3 key
const generateS3Key = (originalUrl, categoryId, categoryName) => {
  const filename = extractFilenameFromUrl(originalUrl);
  const timestamp = Date.now();
  const safeCategoryName = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `Millstore/categories/${categoryId}_${safeCategoryName}/${filename}_${timestamp}.jpg`;
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

// Function to migrate a single category image
const migrateCategoryImage = async (imageUrl, categoryId, categoryName) => {
  let tempFilePath = null;
  
  try {
    console.log(`Processing image for category: ${categoryName} (${categoryId})`);
    
    // Skip if not a Cloudinary URL or no image
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      console.log(`Skipping: No image or not a Cloudinary URL`);
      return null;
    }
    
    // Download image from Cloudinary
    tempFilePath = await downloadImage(imageUrl);
    
    // Generate S3 key
    const s3Key = generateS3Key(imageUrl, categoryId, categoryName);
    
    // Upload to S3
    const s3Url = await uploadToS3(tempFilePath, s3Key);
    
    // Log success
    migrationLog.push({
      categoryId,
      categoryName,
      originalUrl: imageUrl,
      newUrl: s3Url,
      status: 'success',
      timestamp: new Date().toISOString(),
    });
    
    successfulMigrations++;
    console.log(`✅ Successfully migrated image for category: ${categoryName}`);
    
    return s3Url;
    
  } catch (error) {
    // Log failure
    migrationLog.push({
      categoryId,
      categoryName,
      originalUrl: imageUrl,
      error: error.message,
      status: 'failed',
      timestamp: new Date().toISOString(),
    });
    
    failedMigrations++;
    console.error(`❌ Failed to migrate image for category ${categoryName}:`, error.message);
    
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

// Function to migrate all category images
const migrateAllCategoryImages = async () => {
  try {
    console.log('🚀 Starting Category Images Migration...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    // Get all categories with images
    const categories = await Category.find({
      image: { $exists: true, $ne: null }
    });
    
    console.log(`Found ${categories.length} categories with images`);
    
    // Calculate total images
    totalImages = categories.length;
    console.log(`Total images to migrate: ${totalImages}\n`);
    
    // Process categories
    for (const category of categories) {
      console.log(`\n🔄 Processing category: ${category.name}`);
      
      const newImageUrl = await migrateCategoryImage(category.image, category._id, category.name);
      
      if (newImageUrl) {
        // Update category with new URL
        try {
          category.image = newImageUrl;
          await category.save();
          console.log(`✅ Updated category ${category.name} with new image URL`);
        } catch (error) {
          console.error(`❌ Failed to update category ${category.name}:`, error.message);
        }
      }
      
      // Small delay between categories
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Category migration completed!');
    console.log(`📊 Summary:`);
    console.log(`   Total categories: ${categories.length}`);
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
  const logFileName = `category_migration_log_${Date.now()}.json`;
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
    console.log('🔍 Running dry run for category migration...\n');
    
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    const categories = await Category.find({
      image: { $exists: true, $ne: null }
    });
    
    console.log(`Found ${categories.length} categories with images`);
    
    let totalImages = 0;
    let cloudinaryImages = 0;
    let s3Images = 0;
    
    categories.forEach(category => {
      if (category.image) {
        totalImages++;
        if (category.image.includes('amazonaws.com')) {
          s3Images++;
        } else if (category.image.includes('cloudinary.com')) {
          cloudinaryImages++;
        }
      }
    });
    
    console.log(`\n📊 Dry run results:`);
    console.log(`   Total categories: ${categories.length}`);
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
  migrateAllCategoryImages();
} else {
  console.log(`
Usage:
  node migrateCategoryImages.js dry-run    # Run analysis without migrating
  node migrateCategoryImages.js migrate    # Start the category migration process
  `);
}

module.exports = {
  migrateAllCategoryImages,
  dryRun,
}; 