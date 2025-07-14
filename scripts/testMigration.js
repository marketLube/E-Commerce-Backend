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
const TEST_LIMIT = 5; // Only migrate first 5 images for testing

// Test migration progress tracking
let totalTestImages = 0;
let processedTestImages = 0;
let successfulTestMigrations = 0;
let failedTestMigrations = 0;
const testMigrationLog = [];

// Helper function to download image from URL
const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const tempFilePath = path.join(__dirname, 'temp', `test_${Date.now()}_${Math.random()}.jpg`);
    
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
    return `test_image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Helper function to generate S3 key for test
const generateTestS3Key = (originalUrl, variantId) => {
  const filename = extractFilenameFromUrl(originalUrl);
  const timestamp = Date.now();
  return `Northlux/test/variants/${variantId}/${filename}_${timestamp}.jpg`;
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

// Function to migrate a single test image
const migrateTestImage = async (imageUrl, variantId, imageIndex) => {
  let tempFilePath = null;
  
  try {
    console.log(`🧪 Testing image ${imageIndex + 1} for variant ${variantId}`);
    
    // Download image from Cloudinary
    tempFilePath = await downloadImage(imageUrl);
    
    // Generate S3 key for test
    const s3Key = generateTestS3Key(imageUrl, variantId);
    
    // Upload to S3
    const s3Url = await uploadToS3(tempFilePath, s3Key);
    
    // Log success
    testMigrationLog.push({
      variantId,
      imageIndex,
      originalUrl: imageUrl,
      newUrl: s3Url,
      status: 'success',
      timestamp: new Date().toISOString(),
    });
    
    successfulTestMigrations++;
    console.log(`✅ Successfully tested image ${imageIndex + 1} for variant ${variantId}`);
    console.log(`   Original: ${imageUrl}`);
    console.log(`   New S3: ${s3Url}`);
    
    return s3Url;
    
  } catch (error) {
    // Log failure
    testMigrationLog.push({
      variantId,
      imageIndex,
      originalUrl: imageUrl,
      error: error.message,
      status: 'failed',
      timestamp: new Date().toISOString(),
    });
    
    failedTestMigrations++;
    console.error(`❌ Failed to test image ${imageIndex + 1} for variant ${variantId}:`, error.message);
    
    return null;
  } finally {
    // Cleanup temp file
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }
    
    processedTestImages++;
    console.log(`Test Progress: ${processedTestImages}/${totalTestImages} images processed\n`);
  }
};

// Function to run test migration
const runTestMigration = async () => {
  try {
    console.log('🧪 Starting TEST migration (first 5 images only)...\n');
    console.log('⚠️  NOTE: This will NOT update your database - only test S3 uploads\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/northlux');
    console.log('✅ Connected to MongoDB');
    
    // Get variants with images (limit for testing)
    const variants = await Variant.find({
      images: { $exists: true, $ne: [] },
      isDeleted: { $ne: true }
    }).select('_id images').limit(3); // Only get first 3 variants
    
    console.log(`Found ${variants.length} variants for testing`);
    
    // Collect first 5 images across all variants
    const testImages = [];
    for (const variant of variants) {
      for (let i = 0; i < variant.images.length && testImages.length < TEST_LIMIT; i++) {
        const imageUrl = variant.images[i];
        
        // Skip if already an S3 URL
        if (!imageUrl.includes('amazonaws.com') && imageUrl.includes('cloudinary.com')) {
          testImages.push({
            variantId: variant._id,
            imageUrl: imageUrl,
            imageIndex: i
          });
        }
      }
      
      if (testImages.length >= TEST_LIMIT) break;
    }
    
    totalTestImages = testImages.length;
    console.log(`\n📊 Test Plan:`);
    console.log(`   Total test images: ${totalTestImages}`);
    console.log(`   Test S3 path: Northlux/test/variants/`);
    console.log(`   Database updates: DISABLED (test mode)`);
    console.log(`=====================================\n`);
    
    // Process test images
    for (const testImage of testImages) {
      await migrateTestImage(
        testImage.imageUrl,
        testImage.variantId,
        testImage.imageIndex
      );
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Test migration completed!');
    console.log(`📊 Test Results:`);
    console.log(`   Total test images: ${totalTestImages}`);
    console.log(`   Successful uploads: ${successfulTestMigrations}`);
    console.log(`   Failed uploads: ${failedTestMigrations}`);
    console.log(`   Success rate: ${totalTestImages > 0 ? ((successfulTestMigrations / totalTestImages) * 100).toFixed(2) : 0}%`);
    
    // Save test log
    saveTestLog();
    
    if (successfulTestMigrations === totalTestImages) {
      console.log('\n✅ TEST PASSED! All images uploaded successfully to S3.');
      console.log('   You can now run the full migration with confidence.');
      console.log('   Command: node scripts/migrateCloudinaryToS3.js migrate');
    } else {
      console.log('\n⚠️  TEST ISSUES FOUND! Please check the errors above.');
      console.log('   Fix the issues before running the full migration.');
    }
    
  } catch (error) {
    console.error('❌ Test migration failed:', error);
  } finally {
    // Cleanup temp directory
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
};

// Function to save test log
const saveTestLog = () => {
  const logFileName = `test_migration_log_${Date.now()}.json`;
  const logPath = path.join(__dirname, 'logs', logFileName);
  
  // Ensure logs directory exists
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logData = {
    testSummary: {
      totalTestImages,
      processedTestImages,
      successfulTestMigrations,
      failedTestMigrations,
      successRate: totalTestImages > 0 ? ((successfulTestMigrations / totalTestImages) * 100).toFixed(2) + '%' : '0%',
      testTime: new Date().toISOString(),
      testLimit: TEST_LIMIT,
      databaseUpdated: false,
    },
    testDetails: testMigrationLog,
  };
  
  fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
  console.log(`\n📊 Test log saved to: ${logPath}`);
};

// Function to clean up test files from S3
const cleanupTestFiles = async () => {
  try {
    console.log('🧹 Cleaning up test files from S3...\n');
    
    // List objects in test directory
    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: 'Northlux/test/',
    };
    
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    
    if (listedObjects.Contents.length === 0) {
      console.log('No test files found to clean up.');
      return;
    }
    
    console.log(`Found ${listedObjects.Contents.length} test files to delete`);
    
    // Delete objects
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
      },
    };
    
    await s3.deleteObjects(deleteParams).promise();
    console.log(`✅ Deleted ${listedObjects.Contents.length} test files from S3`);
    
  } catch (error) {
    console.error('❌ Failed to cleanup test files:', error.message);
  }
};

// Command line interface
const command = process.argv[2];

if (command === 'test') {
  runTestMigration();
} else if (command === 'cleanup') {
  cleanupTestFiles();
} else {
  console.log(`
🧪 TEST MIGRATION TOOL

Usage:
  node testMigration.js test     # Run test migration (first 5 images)
  node testMigration.js cleanup  # Clean up test files from S3

Features:
  ✅ Tests S3 upload functionality
  ✅ Uses separate test directory (Northlux/test/)
  ✅ Does NOT update database
  ✅ Detailed logging and error reporting
  ✅ Safe to run multiple times
  
After successful test:
  → Run full migration: node scripts/migrateCloudinaryToS3.js migrate
  `);
}

module.exports = {
  runTestMigration,
  cleanupTestFiles,
}; 