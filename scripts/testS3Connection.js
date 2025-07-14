const AWS = require('aws-sdk');
require('dotenv').config();

// AWS S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

async function testS3Connection() {
  console.log('🔍 Testing S3 connection and permissions...\n');

  try {
    // Test 1: Check if credentials are configured
    console.log('1. Checking AWS credentials...');
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not found in environment variables');
    }
    console.log('✅ AWS credentials found');

    // Test 2: Check if bucket name is configured
    console.log('\n2. Checking bucket configuration...');
    if (!BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME not found in environment variables');
    }
    console.log(`✅ Bucket name configured: ${BUCKET_NAME}`);

    // Test 3: Test bucket access
    console.log('\n3. Testing bucket access...');
    await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
    console.log('✅ Bucket access successful');

    // Test 4: Test upload permissions
    console.log('\n4. Testing upload permissions...');
    const testKey = 'Northlux/test/connection-test.txt';
    const testContent = 'This is a test file created by the migration script';
    
    await s3.upload({
      Bucket: BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    }).promise();
    console.log('✅ Upload test successful');

    // Test 5: Test delete permissions
    console.log('\n5. Testing delete permissions...');
    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: testKey
    }).promise();
    console.log('✅ Delete test successful');

    console.log('\n🎉 All tests passed! S3 is ready for migration.');
    
    // Show bucket policy information
    console.log('\n📋 Important: To make images publicly accessible, add this bucket policy:');
    console.log(`
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    }
  ]
}
    `);
    console.log('Add this policy in: S3 Console → Your Bucket → Permissions → Bucket Policy');
    
    // Show estimated costs
    console.log('\n💰 Cost Estimation:');
    console.log('   - Storage: ~$0.023 per GB per month');
    console.log('   - PUT requests: ~$0.0004 per 1,000 requests');
    console.log('   - For 1000 images (~100GB): ~$2.30/month + one-time upload costs');

  } catch (error) {
    console.error('\n❌ S3 connection test failed:', error.message);
    
    // Provide specific troubleshooting advice
    if (error.code === 'NoSuchBucket') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Verify the bucket name is correct');
      console.log('   - Ensure the bucket exists in the specified region');
      console.log('   - Check if the bucket is in the correct AWS account');
    } else if (error.code === 'AccessDenied') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check IAM permissions for your AWS user');
      console.log('   - Ensure the user has s3:PutObject, s3:GetObject, s3:DeleteObject permissions');
      console.log('   - Verify the bucket policy allows your user access');
    } else if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env file');
      console.log('   - Ensure credentials are for the correct AWS account');
      console.log('   - Check if credentials have expired');
    } else {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check your internet connection');
      console.log('   - Verify AWS region is correct');
      console.log('   - Ensure all environment variables are set');
    }
    
    process.exit(1);
  }
}

// Run the test
testS3Connection(); 