const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create separate storage configurations for different upload types
const createStorage = (folder) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
      transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
  });
};

// Create upload middleware for different types
const uploads = {
  events: multer({ storage: createStorage('events') }),
  scholars: multer({ storage: createStorage('scholars') }),
  donations: multer({ storage: createStorage('donations') }),
  forum: multer({ storage: createStorage('forum') }),
  admin: multer({ storage: createStorage('admin') }),
  staff: multer({ storage: createStorage('staff') })
};

// Test Cloudinary configuration
const testCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('Cloudinary connection test successful:', result);
    return true;
  } catch (error) {
    console.error('Cloudinary connection test failed:', error.message);
    return false;
  }
};

module.exports = {
  cloudinary,
  uploads,
  testCloudinaryConnection
}; 