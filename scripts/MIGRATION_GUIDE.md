# Cloudinary to S3 Migration Guide

## Overview

This guide will help you migrate your 1000+ product images from Cloudinary to AWS S3. The migration is designed to be safe, efficient, and resumable.

## 🚀 Quick Start

### Step 1: Install Dependencies
```bash
cd Northlux-server
npm install aws-sdk
```

### Step 2: Set Up AWS S3

1. **Create S3 Bucket**:
   - Go to AWS S3 Console
   - Create a new bucket (e.g., `northlux-product-images`)
   - Choose your preferred region
   - Keep default settings (ACLs disabled is fine)

2. **Set Bucket Policy for Public Read Access**:
   - Go to your bucket → Permissions → Bucket Policy
   - Add this policy (replace `your-bucket-name` with your actual bucket name):
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

3. **Create IAM User**:
   - Go to AWS IAM Console
   - Create new user with programmatic access
   - Attach policy with S3 permissions (see below)
   - Save Access Key ID and Secret Access Key

4. **IAM Policy** (attach to your user):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

### Step 3: Configure Environment Variables

Add these to your `.env` file:
```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# Existing variables (keep these)
MONGODB_URI=your-mongodb-connection-string
CLOUD_NAME=your-cloudinary-cloud-name
API_KEY=your-cloudinary-api-key
API_SECRETE=your-cloudinary-api-secret
```

### Step 4: Test Your Setup
```bash
node scripts/testS3Connection.js
```

This will verify:
- AWS credentials are correct
- S3 bucket is accessible
- Upload/delete permissions work

### Step 5: Run Dry Run
```bash
node scripts/migrateCloudinaryToS3.js dry-run
```

This will show you:
- How many images need migration
- Current storage breakdown
- No actual changes made

### Step 6: Start Migration
```bash
node scripts/migrateCloudinaryToS3.js migrate
```

## 📊 What to Expect

### Performance
- **Batch Size**: 10 images processed simultaneously
- **Rate Limiting**: 2-second delay between batches
- **Speed**: ~50-100 images per minute (depends on image sizes)
- **Duration**: 1000 images ≈ 10-20 minutes

### Progress Tracking
- Real-time console output
- Progress percentage
- Success/failure counts
- Detailed logs saved to `scripts/logs/`

### Error Handling
- Continues processing if some images fail
- Keeps original URLs for failed migrations
- Detailed error logging for troubleshooting
- Can resume migration if interrupted

## 🗂️ File Organization

### Before (Cloudinary)
```
https://res.cloudinary.com/your-cloud/image/upload/v123456/products/image1.jpg
```

### After (S3)
```
https://your-bucket.s3.amazonaws.com/Northlux/products/variants/64a7b8c9d0e1f2g3h4i5j6k7/image1_1703123456789.jpg
```

### S3 Structure
```
your-bucket/
└── Northlux/
    └── products/
        └── variants/
            ├── 64a7b8c9d0e1f2g3h4i5j6k7/
            │   ├── image1_timestamp.jpg
            │   ├── image2_timestamp.jpg
            │   └── image3_timestamp.jpg
            ├── 64a7b8c9d0e1f2g3h4i5j6k8/
            │   ├── image1_timestamp.jpg
            │   └── image2_timestamp.jpg
            └── ...
```

## 💰 Cost Analysis

### AWS S3 Pricing (US East 1)
- **Storage**: $0.023 per GB per month
- **PUT Requests**: $0.0004 per 1,000 requests
- **GET Requests**: $0.0004 per 1,000 requests
- **Data Transfer Out**: $0.09 per GB (first 1 GB free)

### Example for 1000 Images
Assuming average image size of 100KB:
- **Total Storage**: ~100 GB
- **Monthly Storage Cost**: ~$2.30
- **One-time Upload Cost**: ~$0.0004
- **Total First Month**: ~$2.30

### Compared to Cloudinary
- Cloudinary: ~$99/month for 100GB storage + bandwidth
- S3: ~$2.30/month for storage + minimal bandwidth costs
- **Savings**: ~95% reduction in monthly costs

## 🔧 Advanced Configuration

### Batch Size Tuning
Edit `migrateCloudinaryToS3.js`:
```javascript
const BATCH_SIZE = 20; // Increase for faster processing
const DELAY_BETWEEN_BATCHES = 1000; // Decrease for faster processing
```

### Custom S3 Paths
Modify the `generateS3Key` function to change file organization:
```javascript
const generateS3Key = (originalUrl, variantId) => {
  const filename = extractFilenameFromUrl(originalUrl);
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `products/${date}/${variantId}/${filename}.jpg`;
};
```

## 🚨 Safety Features

### Resume Capability
- Migration skips already migrated images
- Safe to restart if interrupted
- Checks for S3 URLs in database

### Backup Strategy
- Original Cloudinary URLs preserved if migration fails
- Database updated only after successful S3 upload
- Detailed logs for rollback if needed

### Rollback Process
If you need to rollback:
1. Stop the migration process
2. Use the migration log to identify successfully migrated images
3. Run a custom script to restore Cloudinary URLs from the log

## 📈 Monitoring & Logs

### Real-time Monitoring
```
🔄 Migrating 3 images for variant 64a7b8c9d0e1f2g3h4i5j6k7
Processing image 1 for variant 64a7b8c9d0e1f2g3h4i5j6k7
✅ Successfully migrated image 1 for variant 64a7b8c9d0e1f2g3h4i5j6k7
Progress: 523/1247 images processed
```

### Log Files
```json
{
  "summary": {
    "totalImages": 1247,
    "processedImages": 1247,
    "successfulMigrations": 1243,
    "failedMigrations": 4,
    "successRate": "99.68%",
    "startTime": "2024-01-15T10:30:00.000Z"
  },
  "details": [
    {
      "variantId": "64a7b8c9d0e1f2g3h4i5j6k7",
      "imageIndex": 0,
      "originalUrl": "https://res.cloudinary.com/...",
      "newUrl": "https://your-bucket.s3.amazonaws.com/...",
      "status": "success",
      "timestamp": "2024-01-15T10:30:15.123Z"
    }
  ]
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **"AWS credentials not found"**
   ```bash
   # Check .env file
   cat .env | grep AWS
   ```

2. **"NoSuchBucket" error**
   - Verify bucket name in S3 console
   - Check AWS region matches

3. **"AccessDenied" error**
   - Verify IAM permissions
   - Check bucket policy

4. **Network timeouts**
   - Increase delays between requests
   - Check internet connection stability

5. **MongoDB connection issues**
   - Verify MONGODB_URI
   - Check database accessibility

### Performance Issues

1. **Slow processing**
   - Increase BATCH_SIZE (but monitor memory usage)
   - Decrease delays (but respect rate limits)
   - Check network bandwidth

2. **Memory issues**
   - Decrease BATCH_SIZE
   - Ensure temp files are being cleaned up

3. **High AWS costs**
   - Monitor S3 usage in AWS console
   - Consider using S3 Intelligent-Tiering

## 📞 Support

### Before Running Migration
1. ✅ Test S3 connection: `node scripts/testS3Connection.js`
2. ✅ Run dry run: `node scripts/migrateCloudinaryToS3.js dry-run`
3. ✅ Backup database (recommended)
4. ✅ Verify all environment variables

### During Migration
- Monitor console output for errors
- Check AWS S3 console for uploaded files
- Monitor AWS costs in billing dashboard

### After Migration
1. Verify images are loading correctly on your website
2. Check migration logs for any failures
3. Test image uploads for new products
4. Consider cleaning up Cloudinary images (after verification)

## 🎯 Next Steps After Migration

1. **Update Image Upload Logic**:
   - Modify your upload controllers to use S3 instead of Cloudinary
   - Update image processing pipelines

2. **CDN Setup** (Optional but recommended):
   - Set up CloudFront distribution
   - Configure caching for better performance

3. **Monitoring**:
   - Set up AWS CloudWatch alerts
   - Monitor S3 costs and usage

4. **Cleanup**:
   - After confirming migration success, consider removing images from Cloudinary
   - Update any hardcoded Cloudinary references in your code

## 📝 Migration Checklist

- [ ] AWS S3 bucket created
- [ ] IAM user with proper permissions
- [ ] Environment variables configured
- [ ] Dependencies installed (`npm install aws-sdk`)
- [ ] S3 connection tested
- [ ] Dry run completed
- [ ] Database backed up (recommended)
- [ ] Migration executed
- [ ] Migration logs reviewed
- [ ] Website functionality verified
- [ ] Image upload process updated
- [ ] Cloudinary cleanup planned

---

**Need Help?** Check the migration logs first, then verify your AWS setup and environment variables. The script is designed to be safe and resumable, so you can always restart if needed. 