const AWS = require('aws-sdk');
require('dotenv').config();

// AWS S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

async function setupBucketPolicy() {
  console.log('🔧 Setting up S3 bucket policy for public read access...\n');

  try {
    // Check if credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not found in environment variables');
    }

    if (!BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME not found in environment variables');
    }

    console.log(`Setting up policy for bucket: ${BUCKET_NAME}`);

    // Define the bucket policy
    const bucketPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadGetObject",
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${BUCKET_NAME}/Northlux/*`
        }
      ]
    };

    // Apply the bucket policy
    const params = {
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(bucketPolicy, null, 2)
    };

    await s3.putBucketPolicy(params).promise();
    
    console.log('✅ Bucket policy applied successfully!');
    console.log('\n📋 Applied Policy:');
    console.log(JSON.stringify(bucketPolicy, null, 2));
    
    console.log('\n🎉 Your bucket is now configured for public read access.');
    console.log('Images uploaded to this bucket will be publicly accessible via their URLs.');
    
    // Test the policy by checking if it was applied
    console.log('\n🔍 Verifying policy...');
    const currentPolicy = await s3.getBucketPolicy({ Bucket: BUCKET_NAME }).promise();
    console.log('✅ Policy verification successful!');
    
  } catch (error) {
    console.error('\n❌ Failed to set up bucket policy:', error.message);
    
    if (error.code === 'NoSuchBucket') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Verify the bucket name is correct');
      console.log('   - Ensure the bucket exists in the specified region');
    } else if (error.code === 'AccessDenied') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check IAM permissions for your AWS user');
      console.log('   - Ensure the user has s3:PutBucketPolicy permission');
      console.log('   - Add this permission to your IAM policy:');
      console.log('     "s3:PutBucketPolicy"');
    } else {
      console.log('\n💡 Manual Setup:');
      console.log('   1. Go to AWS S3 Console');
      console.log(`   2. Open your bucket: ${BUCKET_NAME}`);
      console.log('   3. Go to Permissions → Bucket Policy');
      console.log('   4. Paste this policy:');
      console.log('\n' + JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "PublicReadGetObject",
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${BUCKET_NAME}/Northlux/*`
          }
        ]
      }, null, 2));
    }
  }
}

// Run the setup
setupBucketPolicy(); 