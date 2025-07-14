const { s3, BUCKET_NAME, getContentType, generateS3Key } = require("../config/s3Config");

/**
 * Upload a single image buffer to S3
 * @param {Buffer} buffer - The image buffer to upload
 * @param {string} originalName - Original filename for content type detection
 * @param {string} folder - S3 folder path (default: 'products')
 * @returns {Promise<string>} - S3 URL of the uploaded image
 */
const uploadToS3 = (buffer, originalName = 'image.jpg', folder = 'products') => {
  return new Promise((resolve, reject) => {
    try {
      const key = generateS3Key(originalName, folder);
      const contentType = getContentType(originalName);

      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // ACL removed - bucket has ACLs disabled
      };

      s3.upload(params, (error, result) => {
        if (error) {
          console.error('S3 upload error:', error);
          reject(error);
        } else {
          resolve(result.Location);
        }
      });
    } catch (error) {
      console.error('S3 upload setup error:', error);
      reject(error);
    }
  });
};

/**
 * Upload multiple images to S3
 * @param {Array} files - Array of file objects with buffer and originalname
 * @param {string} folder - S3 folder path (default: 'products')
 * @returns {Promise<Array<string>>} - Array of S3 URLs
 */
const uploadMultipleToS3 = async (files, folder = 'products') => {
  try {
    const uploadPromises = files.map(file => 
      uploadToS3(file.buffer, file.originalname, folder)
    );
    
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error('Multiple S3 upload error:', error);
    throw error;
  }
};

/**
 * Delete an image from S3
 * @param {string} imageUrl - The S3 URL of the image to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteFromS3 = (imageUrl) => {
  return new Promise((resolve, reject) => {
    try {
      // Extract key from S3 URL
      const urlParts = imageUrl.split('/');
      const key = urlParts.slice(3).join('/'); // Remove https://bucket.s3.region.amazonaws.com/

      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
      };

      s3.deleteObject(params, (error, result) => {
        if (error) {
          console.error('S3 delete error:', error);
          reject(error);
        } else {
          resolve(true);
        }
      });
    } catch (error) {
      console.error('S3 delete setup error:', error);
      reject(error);
    }
  });
};

module.exports = {
  uploadToS3,
  uploadMultipleToS3,
  deleteFromS3
};
