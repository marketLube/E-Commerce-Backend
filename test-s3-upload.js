const { uploadToS3, uploadMultipleToS3 } = require('./utilities/cloudinaryUpload');
require('dotenv').config();

// Test S3 upload functionality
async function testS3Upload() {
  console.log('🧪 Testing S3 upload functionality...\n');

  try {
    // Test 1: Check environment variables
    console.log('1. Checking environment variables...');
    const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET_NAME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }
    console.log('✅ All required environment variables are set');

    // Test 2: Create a test buffer (simulating an image file)
    console.log('\n2. Creating test image buffer...');
    const testBuffer = Buffer.from('fake-image-data-for-testing');
    const testFileName = 'test-image.jpg';
    console.log('✅ Test buffer created');

    // Test 3: Test single image upload
    console.log('\n3. Testing single image upload...');
    const singleUploadUrl = await uploadToS3(testBuffer, testFileName, 'test');
    console.log('✅ Single upload successful');
    console.log(`   URL: ${singleUploadUrl}`);

    // Test 4: Test multiple image upload
    console.log('\n4. Testing multiple image upload...');
    const testFiles = [
      { buffer: testBuffer, originalname: 'test1.jpg' },
      { buffer: testBuffer, originalname: 'test2.png' },
      { buffer: testBuffer, originalname: 'test3.webp' }
    ];
    
    const multipleUploadUrls = await uploadMultipleToS3(testFiles, 'test');
    console.log('✅ Multiple upload successful');
    console.log(`   URLs: ${multipleUploadUrls.length} files uploaded`);
    multipleUploadUrls.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`);
    });

    console.log('\n🎉 All S3 upload tests passed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Make sure your S3 bucket has public read access');
    console.log('   2. Test the product upload functionality in your application');
    console.log('   3. Remove this test file after verification');

  } catch (error) {
    console.error('\n❌ S3 upload test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check your AWS credentials in .env file');
    console.log('   2. Verify S3 bucket exists and is accessible');
    console.log('   3. Ensure IAM user has proper S3 permissions');
    console.log('   4. Check if bucket policy allows public read access');
  }
}

// Run the test
testS3Upload(); 