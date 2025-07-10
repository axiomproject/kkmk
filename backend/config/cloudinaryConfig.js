const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvzbgapue',
  api_key: process.env.CLOUDINARY_API_KEY || '539274975653933',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Lstsyvr-PR9eR9tp1v5pqjysoLI'
});

// Configure multer for temporary storage
const storage = multer.memoryStorage();

// Create multer instance with file size limits and file filter
const createMulter = () => {
  return multer({
    storage: storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 1 // Only allow 1 file per request
    },
    fileFilter: (req, file, cb) => {
      // Accept images only
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    }
  });
};

// Create a single multer instance
const upload = createMulter();

// Create upload middleware for different types
const uploads = {
  events: upload,
  scholars: upload,
  donations: upload,
  forum: upload,
  admin: upload,
  staff: upload,
  content: upload
};

// Function to upload to Cloudinary
const uploadToCloudinary = async (file, folder) => {
  try {
    if (!file || !file.buffer) {
      throw new Error('Invalid file object');
    }

    // Create a base64 string from buffer
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    
    // Determine resource type - treat SVGs as images
    const resourceType = file.mimetype === 'image/svg+xml' ? 'image' : 'auto';
    
    // Upload to Cloudinary with optimizations
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      resource_type: resourceType,
      quality: 'auto:good', // Automatic quality optimization
      fetch_format: 'auto', // Automatic format optimization
      flags: 'attachment', // Treat as attachment
      use_filename: false, // Don't use original filename
      unique_filename: true, // Ensure unique filenames
      timeout: 120000 // 2 minute timeout
    });

    // Return the complete Cloudinary URL and metadata
    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type,
      version: result.version
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
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
  uploadToCloudinary,
  testCloudinaryConnection
}; 