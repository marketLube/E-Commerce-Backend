const AWS = require('aws-sdk');
const cloudinary = require('../config/cloudinaryConfig');
const mongoose = require('mongoose');
const Variant = require('../model/variantsModel');
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
const BATCH_SIZE = 10; // Process 10 images at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between batches

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
    const tempFilePath = path.join(__dirname, 'temp', `temp_${Date.now()}_${Math.random()}.jpg`);
    
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
    return `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Helper function to generate S3 key
const generateS3Key = (originalUrl, variantId) => {
  const filename = extractFilenameFromUrl(originalUrl);
  const timestamp = Date.now();
  return `Northlux/products/variants/${variantId}/${filename}_${timestamp}.jpg`;
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

// Function to migrate a single image
const migrateImage = async (imageUrl, variantId, imageIndex) => {
  let tempFilePath = null;
  
  try {
    console.log(`Processing image ${imageIndex + 1} for variant ${variantId}`);
    
    // Download image from Cloudinary
    tempFilePath = await downloadImage(imageUrl);
    
    // Generate S3 key
    const s3Key = generateS3Key(imageUrl, variantId);
    
    // Upload to S3
    const s3Url = await uploadToS3(tempFilePath, s3Key);
    
    // Log success
    migrationLog.push({
      variantId,
      imageIndex,
      originalUrl: imageUrl,
      newUrl: s3Url,
      status: 'success',
      timestamp: new Date().toISOString(),
    });
    
    successfulMigrations++;
    console.log(`✅ Successfully migrated image ${imageIndex + 1} for variant ${variantId}`);
    
    return s3Url;
    
  } catch (error) {
    // Log failure
    migrationLog.push({
      variantId,
      imageIndex,
      originalUrl: imageUrl,
      error: error.message,
      status: 'failed',
      timestamp: new Date().toISOString(),
    });
    
    failedMigrations++;
    console.error(`❌ Failed to migrate image ${imageIndex + 1} for variant ${variantId}:`, error.message);
    
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

// Function to migrate images for a single variant
const migrateVariantImages = async (variant) => {
  if (!variant.images || variant.images.length === 0) {
    console.log(`No images to migrate for variant ${variant._id}`);
    return;
  }

  console.log(`\n🔄 Migrating ${variant.images.length} images for variant ${variant._id}`);
  
  const newImageUrls = [];
  
  for (let i = 0; i < variant.images.length; i++) {
    const imageUrl = variant.images[i];
    
    // Skip if already an S3 URL
    if (imageUrl.includes('amazonaws.com')) {
      console.log(`Skipping already migrated image: ${imageUrl}`);
      newImageUrls.push(imageUrl);
      continue;
    }
    
    const newUrl = await migrateImage(imageUrl, variant._id, i);
    
    if (newUrl) {
      newImageUrls.push(newUrl);
    } else {
      // Keep original URL if migration failed
      newImageUrls.push(imageUrl);
    }
    
    // Small delay between images
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Update variant with new image URLs
  try {
    await Variant.findByIdAndUpdate(variant._id, {
      images: newImageUrls,
    });
    
    console.log(`✅ Updated variant ${variant._id} with new image URLs`);
  } catch (error) {
    console.error(`❌ Failed to update variant ${variant._id}:`, error.message);
  }
};

// Function to save migration log
const saveMigrationLog = () => {
  const logFileName = `migration_log_${Date.now()}.json`;
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

// Main migration function
const migrateAllImages = async () => {
  try {
    console.log('🚀 Starting Cloudinary to S3 migration...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/northlux');
    console.log('✅ Connected to MongoDB');
    
    // Get all variants with images
    const variants = await Variant.find({
      images: { $exists: true, $ne: [] },
      isDeleted: { $ne: true }
    }).select('_id images');
    
    console.log(`Found ${variants.length} variants with images`);
    
    // Calculate total images
    totalImages = variants.reduce((total, variant) => total + variant.images.length, 0);
    console.log(`Total images to migrate: ${totalImages}\n`);
    
    // Process variants in batches
    for (let i = 0; i < variants.length; i += BATCH_SIZE) {
      const batch = variants.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(variants.length / BATCH_SIZE)}`);
      
      // Process variants in parallel within the batch
      await Promise.all(batch.map(variant => migrateVariantImages(variant)));
      
      // Delay between batches to avoid overwhelming the services
      if (i + BATCH_SIZE < variants.length) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log('\n🎉 Migration completed!');
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

// Function to run a dry run (just count and log, don't migrate)
const dryRun = async () => {
  try {
    console.log('🔍 Running dry run...\n');
    
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/northlux');
    console.log('✅ Connected to MongoDB');
    
    const variants = await Variant.find({
      images: { $exists: true, $ne: [] },
      isDeleted: { $ne: true }
    }).select('_id images');
    
    console.log(`Found ${variants.length} variants with images`);
    
    let totalImages = 0;
    let cloudinaryImages = 0;
    let s3Images = 0;
    
    variants.forEach(variant => {
      variant.images.forEach(imageUrl => {
        totalImages++;
        if (imageUrl.includes('amazonaws.com')) {
          s3Images++;
        } else if (imageUrl.includes('cloudinary.com')) {
          cloudinaryImages++;
        }
      });
    });
    
    console.log(`\n📊 Dry run results:`);
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
  migrateAllImages();
} else {
  console.log(`
Usage:
  node migrateCloudinaryToS3.js dry-run    # Run analysis without migrating
  node migrateCloudinaryToS3.js migrate    # Start the migration process
  `);
}

module.exports = {
  migrateAllImages,
  dryRun,
}; 