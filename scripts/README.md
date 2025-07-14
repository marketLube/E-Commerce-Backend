# Cloudinary to S3 Migration Script

This script migrates product images from Cloudinary to AWS S3 for the Northlux e-commerce platform.

## Prerequisites

1. **AWS S3 Setup**:
   - Create an S3 bucket
   - Set up IAM user with S3 permissions
   - Get AWS access key and secret key

2. **Environment Variables**:
   Add these to your `.env` file:
   ```
   AWS_ACCESS_KEY_ID=your-aws-access-key-id
   AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=your-s3-bucket-name
   MONGODB_URI=your-mongodb-connection-string
   ```

3. **Install Dependencies**:
   ```bash
   npm install aws-sdk
   ```

## Usage

### 1. Dry Run (Recommended First)
Analyze your data without making changes:
```bash
cd Northlux-server
node scripts/migrateCloudinaryToS3.js dry-run
```

This will show:
- Total number of images
- How many are already on S3
- How many need to be migrated from Cloudinary

### 2. Run Migration
Start the actual migration:
```bash
cd Northlux-server
node scripts/migrateCloudinaryToS3.js migrate
```

## Features

- **Batch Processing**: Processes images in batches of 10 to avoid overwhelming services
- **Rate Limiting**: 2-second delay between batches + 500ms between individual images
- **Error Handling**: Continues processing even if some images fail
- **Progress Tracking**: Real-time progress updates
- **Detailed Logging**: Saves migration log with success/failure details
- **Resume Support**: Skips already migrated S3 images
- **Cleanup**: Automatically removes temporary files

## S3 Bucket Structure

Images will be organized as:
```
your-bucket/
└── products/
    └── variants/
        └── {variantId}/
            ├── {filename}_timestamp.jpg
            ├── {filename}_timestamp.jpg
            └── ...
```

## Migration Process

1. **Download**: Downloads image from Cloudinary URL
2. **Upload**: Uploads to S3 with organized structure
3. **Update DB**: Updates variant document with new S3 URL
4. **Cleanup**: Removes temporary files

## Monitoring

- Real-time console output shows progress
- Migration log saved to `scripts/logs/migration_log_{timestamp}.json`
- Log includes:
  - Summary statistics
  - Success/failure details for each image
  - Error messages for debugging

## Error Recovery

If migration fails:
1. Check the migration log for specific errors
2. Fix any issues (network, permissions, etc.)
3. Re-run the migration - it will skip already migrated images

## Performance Considerations

- **Batch Size**: Default 10 images per batch (adjustable)
- **Delays**: Built-in delays to respect API rate limits
- **Memory**: Processes images one at a time to avoid memory issues
- **Network**: Handles network timeouts and retries

## AWS IAM Permissions

Your AWS user needs these S3 permissions:
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

## Troubleshooting

### Common Issues:

1. **AWS Credentials Error**:
   - Verify AWS credentials in `.env`
   - Check IAM permissions

2. **S3 Upload Fails**:
   - Verify bucket name and region
   - Check bucket permissions

3. **MongoDB Connection Error**:
   - Verify MONGODB_URI in `.env`
   - Ensure database is accessible

4. **Image Download Fails**:
   - Check internet connection
   - Verify Cloudinary URLs are accessible

### Performance Tuning:

- Increase `BATCH_SIZE` for faster processing (but higher resource usage)
- Decrease `DELAY_BETWEEN_BATCHES` for faster processing (but higher API load)
- Monitor AWS costs and adjust accordingly

## Cost Estimation

AWS S3 costs depend on:
- Storage: ~$0.023 per GB per month
- Requests: ~$0.0004 per 1,000 PUT requests
- Data Transfer: First 1 GB free per month

For 1000 images (~100MB each = 100GB):
- Storage: ~$2.30/month
- Upload requests: ~$0.0004 (one-time)
- Total first month: ~$2.30

## Support

If you encounter issues:
1. Check the migration log for detailed error information
2. Verify all environment variables are set correctly
3. Ensure AWS permissions are configured properly
4. Test with a small batch first using the dry-run feature 