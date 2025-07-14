# S3 Upload Implementation Guide

## Overview

This guide documents the migration from Cloudinary to AWS S3 for image uploads in the Millstore e-commerce platform. The system now supports multiple image uploads for products and uses S3 for all image storage.

## 🚀 Quick Start

### 1. Environment Variables

Add these to your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# Keep existing variables
MONGODB_URI=your-mongodb-connection-string
# ... other existing variables
```

### 2. Test the Setup

Run the test script to verify everything works:

```bash
node test-s3-upload.js
```

### 3. S3 Bucket Setup

Ensure your S3 bucket has the following configuration:

1. **Public Read Access**: Add this bucket policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

2. **IAM Permissions**: Your AWS user needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name"
    }
  ]
}
```

## 📁 File Structure

### S3 Organization

Images are organized in S3 as follows:

```
your-bucket/
├── products/
│   ├── 1703123456789_abc123.jpg          # Main product images
│   ├── 1703123456790_def456.png
│   └── variants/
│       ├── 64a7b8c9d0e1f2g3h4i5j6k7/
│       │   ├── 1703123456791_ghi789.jpg  # Variant images
│       │   └── 1703123456792_jkl012.png
│       └── 64a7b8c9d0e1f2g3h4i5j6k8/
│           └── 1703123456793_mno345.jpg
├── categories/
│   ├── 1703123456794_pqr678.jpg
│   └── 1703123456795_stu901.png
├── brands/
│   ├── 1703123456796_vwx234.jpg
│   └── 1703123456797_yz0567.png
├── banners/
│   ├── 1703123456798_abc890.jpg
│   └── 1703123456799_def123.png
├── offer-banners/
│   ├── 1703123456800_ghi456.jpg
│   └── 1703123456801_jkl789.png
└── reviews/
    ├── 1703123456802_mno012.jpg
    └── 1703123456803_pqr345.png
```

## 🔧 API Usage

### Product Upload

The product upload now supports multiple images for both main products and variants:

```javascript
// Example: Adding a product with multiple images
const formData = new FormData();

// Main product images
formData.append('productImages[0]', file1);
formData.append('productImages[1]', file2);
formData.append('productImages[2]', file3);

// Variant images
formData.append('variants[0][images][0]', variant1Image1);
formData.append('variants[0][images][1]', variant1Image2);
formData.append('variants[1][images][0]', variant2Image1);

// Other product data
formData.append('name', 'Product Name');
formData.append('description', 'Product Description');
// ... other fields
```

### Controller Functions

#### Single Image Upload
```javascript
const { uploadToS3 } = require('../utilities/cloudinaryUpload');

// Upload a single image
const imageUrl = await uploadToS3(
  file.buffer, 
  file.originalname, 
  'products'
);
```

#### Multiple Image Upload
```javascript
const { uploadMultipleToS3 } = require('../utilities/cloudinaryUpload');

// Upload multiple images
const imageUrls = await uploadMultipleToS3(
  files, // Array of file objects
  'products'
);
```

#### Delete Image
```javascript
const { deleteFromS3 } = require('../utilities/cloudinaryUpload');

// Delete an image from S3
await deleteFromS3(imageUrl);
```

## 📊 Updated Controllers

The following controllers have been updated to use S3:

1. **productController.js** - Product and variant image uploads
2. **bannerController.js** - Banner image uploads
3. **categoryController.js** - Category image uploads
4. **brandController.js** - Brand logo and banner uploads
5. **offerBannerController.js** - Offer banner uploads
6. **reviewController.js** - Review image uploads

## 🔄 Migration from Cloudinary

If you have existing images on Cloudinary, use the migration scripts:

```bash
# Analyze current state
node scripts/migrateCloudinaryToS3.js dry-run

# Start migration
node scripts/migrateCloudinaryToS3.js migrate
```

## 🛠️ Configuration Files

### s3Config.js
Located at `config/s3Config.js`, this file contains:
- AWS S3 client configuration
- Helper functions for content type detection
- S3 key generation utilities

### cloudinaryUpload.js (Updated)
Located at `utilities/cloudinaryUpload.js`, this file now contains:
- `uploadToS3()` - Single image upload
- `uploadMultipleToS3()` - Multiple image upload
- `deleteFromS3()` - Image deletion

## 🧪 Testing

### Run Tests
```bash
# Test S3 upload functionality
node test-s3-upload.js

# Test S3 connection
node scripts/testS3Connection.js
```

### Expected Output
```
🧪 Testing S3 upload functionality...

1. Checking environment variables...
✅ All required environment variables are set

2. Creating test image buffer...
✅ Test buffer created

3. Testing single image upload...
✅ Single upload successful
   URL: https://your-bucket.s3.amazonaws.com/test/1703123456789_abc123.jpg

4. Testing multiple image upload...
✅ Multiple upload successful
   URLs: 3 files uploaded
   1. https://your-bucket.s3.amazonaws.com/test/1703123456790_def456.jpg
   2. https://your-bucket.s3.amazonaws.com/test/1703123456791_ghi789.png
   3. https://your-bucket.s3.amazonaws.com/test/1703123456792_jkl012.webp

🎉 All S3 upload tests passed!
```

## 💰 Cost Comparison

### AWS S3 vs Cloudinary

| Feature | Cloudinary | AWS S3 |
|---------|------------|--------|
| Storage (100GB) | ~$99/month | ~$2.30/month |
| Bandwidth | Included | ~$0.09/GB |
| Transformations | Built-in | Requires CloudFront |
| CDN | Included | CloudFront ($0.085/GB) |
| **Total (100GB)** | **~$99/month** | **~$2.30/month** |

**Savings: ~95% reduction in monthly costs**

## 🚨 Important Notes

1. **File Naming**: Images are automatically renamed with timestamps to prevent conflicts
2. **Content Types**: Automatically detected from file extensions
3. **Public Access**: All uploaded images are publicly accessible
4. **Error Handling**: Comprehensive error handling with detailed logging
5. **Backup**: Original Cloudinary URLs are preserved during migration

## 🔍 Troubleshooting

### Common Issues

1. **Access Denied Error**
   - Check IAM permissions
   - Verify bucket policy
   - Ensure credentials are correct

2. **Upload Fails**
   - Check internet connection
   - Verify bucket exists
   - Ensure bucket is in correct region

3. **Images Not Public**
   - Add bucket policy for public read access
   - Check ACL settings

### Debug Commands

```bash
# Test S3 connection
node scripts/testS3Connection.js

# Check environment variables
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $AWS_REGION
echo $S3_BUCKET_NAME

# Test upload functionality
node test-s3-upload.js
```

## 📝 Next Steps

1. ✅ Test the S3 upload functionality
2. ✅ Verify all controllers work correctly
3. ✅ Test product upload with multiple images
4. ✅ Run migration scripts if needed
5. ✅ Update frontend to handle new image URLs
6. ✅ Monitor costs and performance
7. ✅ Consider implementing image optimization
8. ✅ Set up CloudFront for better performance (optional)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review AWS S3 documentation
3. Verify all environment variables are set
4. Test with the provided test scripts
5. Check the migration logs for detailed error information 