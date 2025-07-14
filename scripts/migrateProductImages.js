const AWS = require('aws-sdk');
const cloudinary = require('../config/cloudinaryConfig');
const mongoose = require('mongoose');
const Product = require('../model/productModel');
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
    const tempFilePath = path.join(__dirname, 'temp', `product_${Date.now()}_${Math.random()}.jpg`);
    
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
    return `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Helper function to generate S3 key for product images
const generateProductS3Key = (originalUrl, productId, imageIndex) => {
  const filename = extractFilenameFromUrl(originalUrl);
  const timestamp = Date.now();
  return `Millstore/products/${productId}/images/${filename}_${imageIndex}_${timestamp}.jpg`;
};

// Helper function to generate S3 key for variant images
const generateVariantS3Key = (originalUrl, productId, variantId, imageIndex) => {
  const filename = extractFilenameFromUrl(originalUrl);
  const timestamp = Date.now();
  return `Millstore/products/${productId}/variants/${variantId}/images/${filename}_${imageIndex}_${timestamp}.jpg`;
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

// Function to migrate a single product image
const migrateProductImage = async (imageUrl, productId, imageIndex) => {
  let tempFilePath = null;
  
  try {
    console.log(`Processing product image ${imageIndex + 1} for product ${productId}`);
    
    // Skip if not a Cloudinary URL or no image
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      console.log(`Skipping: No image or not a Cloudinary URL`);
      return null;
    }
    
    // Download image from Cloudinary
    tempFilePath = await downloadImage(imageUrl);
    
    // Generate S3 key
    const s3Key = generateProductS3Key(imageUrl, productId, imageIndex);
    
    // Upload to S3
    const s3Url = await uploadToS3(tempFilePath, s3Key);
    
    // Log success
    migrationLog.push({
      type: 'product',
      productId,
      variantId: null,
      imageIndex,
      originalUrl: imageUrl,
      newUrl: s3Url,
      status: 'success',
      timestamp: new Date().toISOString(),
    });
    
    successfulMigrations++;
    console.log(`✅ Successfully migrated product image ${imageIndex + 1} for product ${productId}`);
    
    return s3Url;
    
  } catch (error) {
    // Log failure
    migrationLog.push({
      type: 'product',
      productId,
      variantId: null,
      imageIndex,
      originalUrl: imageUrl,
      error: error.message,
      status: 'failed',
      timestamp: new Date().toISOString(),
    });
    
    failedMigrations++;
    console.error(`❌ Failed to migrate product image ${imageIndex + 1} for product ${productId}:`, error.message);
    
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

// Function to migrate a single variant image
const migrateVariantImage = async (imageUrl, productId, variantId, imageIndex) => {
  let tempFilePath = null;
  
  try {
    console.log(`Processing variant image ${imageIndex + 1} for variant ${variantId} (product ${productId})`);
    
    // Skip if not a Cloudinary URL or no image
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      console.log(`Skipping: No image or not a Cloudinary URL`);
      return null;
    }
    
    // Download image from Cloudinary
    tempFilePath = await downloadImage(imageUrl);
    
    // Generate S3 key
    const s3Key = generateVariantS3Key(imageUrl, productId, variantId, imageIndex);
    
    // Upload to S3
    const s3Url = await uploadToS3(tempFilePath, s3Key);
    
    // Log success
    migrationLog.push({
      type: 'variant',
      productId,
      variantId,
      imageIndex,
      originalUrl: imageUrl,
      newUrl: s3Url,
      status: 'success',
      timestamp: new Date().toISOString(),
    });
    
    successfulMigrations++;
    console.log(`✅ Successfully migrated variant image ${imageIndex + 1} for variant ${variantId}`);
    
    return s3Url;
    
  } catch (error) {
    // Log failure
    migrationLog.push({
      type: 'variant',
      productId,
      variantId,
      imageIndex,
      originalUrl: imageUrl,
      error: error.message,
      status: 'failed',
      timestamp: new Date().toISOString(),
    });
    
    failedMigrations++;
    console.error(`❌ Failed to migrate variant image ${imageIndex + 1} for variant ${variantId}:`, error.message);
    
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

// Function to migrate all product and variant images
const migrateAllProductImages = async () => {
  try {
    console.log('🚀 Starting Product and Variant Images Migration...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    // Get all products with images
    const products = await Product.find({
      $or: [
        { images: { $exists: true, $ne: null, $ne: [] } },
        { variants: { $exists: true, $ne: null, $ne: [] } }
      ]
    }).populate('variants');
    
    console.log(`Found ${products.length} products with images or variants`);
    
    // Calculate total images
    totalImages = 0;
    products.forEach(product => {
      // Count product images
      if (product.images && product.images.length > 0) {
        totalImages += product.images.length;
      }
      
      // Count variant images
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          if (variant.images && variant.images.length > 0) {
            totalImages += variant.images.length;
          }
        });
      }
    });
    
    console.log(`Total images to migrate: ${totalImages}\n`);
    
    // Process products
    for (const product of products) {
      console.log(`\n🔄 Processing product: ${product._id} - ${product.name}`);
      
      let productUpdated = false;
      let newProductImages = [...(product.images || [])];
      
      // Migrate product images
      if (product.images && product.images.length > 0) {
        console.log(`  📸 Migrating ${product.images.length} product images...`);
        
        for (let i = 0; i < product.images.length; i++) {
          const newImageUrl = await migrateProductImage(product.images[i], product._id, i);
          if (newImageUrl) {
            newProductImages[i] = newImageUrl;
            productUpdated = true;
          }
        }
        
        // Update product images
        if (productUpdated) {
          product.images = newProductImages;
        }
      }
      
      // Process variants
      if (product.variants && product.variants.length > 0) {
        console.log(`  🔄 Processing ${product.variants.length} variants...`);
        
        for (const variant of product.variants) {
          if (variant.images && variant.images.length > 0) {
            console.log(`    📸 Migrating ${variant.images.length} images for variant ${variant._id}`);
            
            let variantUpdated = false;
            let newVariantImages = [...variant.images];
            
            for (let i = 0; i < variant.images.length; i++) {
              const newImageUrl = await migrateVariantImage(variant.images[i], product._id, variant._id, i);
              if (newImageUrl) {
                newVariantImages[i] = newImageUrl;
                variantUpdated = true;
              }
            }
            
            // Update variant images
            if (variantUpdated) {
              variant.images = newVariantImages;
              await variant.save();
              console.log(`    ✅ Updated variant ${variant._id} with new image URLs`);
            }
          }
        }
      }
      
      // Update product with new URLs
      if (productUpdated) {
        try {
          await product.save();
          console.log(`✅ Updated product ${product._id} with new image URLs`);
        } catch (error) {
          console.error(`❌ Failed to update product ${product._id}:`, error.message);
        }
      }
      
      // Small delay between products
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Product and variant migration completed!');
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
  const logFileName = `product_migration_log_${Date.now()}.json`;
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
    console.log('🔍 Running dry run for product and variant migration...\n');
    
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    const products = await Product.find({
      $or: [
        { images: { $exists: true, $ne: null, $ne: [] } },
        { variants: { $exists: true, $ne: null, $ne: [] } }
      ]
    }).populate('variants');
    
    console.log(`Found ${products.length} products with images or variants`);
    
    let totalImages = 0;
    let cloudinaryImages = 0;
    let s3Images = 0;
    let productImages = 0;
    let variantImages = 0;
    
    products.forEach(product => {
      // Count product images
      if (product.images && product.images.length > 0) {
        productImages += product.images.length;
        product.images.forEach(imageUrl => {
          totalImages++;
          if (imageUrl.includes('amazonaws.com')) {
            s3Images++;
          } else if (imageUrl.includes('cloudinary.com')) {
            cloudinaryImages++;
          }
        });
      }
      
      // Count variant images
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          if (variant.images && variant.images.length > 0) {
            variantImages += variant.images.length;
            variant.images.forEach(imageUrl => {
              totalImages++;
              if (imageUrl.includes('amazonaws.com')) {
                s3Images++;
              } else if (imageUrl.includes('cloudinary.com')) {
                cloudinaryImages++;
              }
            });
          }
        });
      }
    });
    
    console.log(`\n📊 Dry run results:`);
    console.log(`   Total products: ${products.length}`);
    console.log(`   Total images: ${totalImages}`);
    console.log(`   Product images: ${productImages}`);
    console.log(`   Variant images: ${variantImages}`);
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
  migrateAllProductImages();
} else {
  console.log(`
Usage:
  node migrateProductImages.js dry-run    # Run analysis without migrating
  node migrateProductImages.js migrate    # Start the product and variant migration process
  `);
}

module.exports = {
  migrateAllProductImages,
  dryRun,
}; 