const multer = require('multer');
const { uploads } = require('./cloudinaryConfig');

// Create a base multer instance for non-file operations
const baseMulter = multer();

// Export the upload middleware for different types
module.exports = {
  // Base multer instance for form-data without files
  none: baseMulter.none.bind(baseMulter),
  
  // Cloudinary upload configurations
  uploadEventImage: uploads.events.single('image'),
  uploadScholarImage: uploads.scholars.single('image'),
  uploadDonationImage: uploads.donations.single('image'),
  uploadForumImage: uploads.forum.single('image'),
  uploadAdminImage: uploads.admin.single('image'),
  uploadStaffImage: uploads.staff.single('image'),
  uploadContentImage: uploads.content.single('image') // Add content image upload
};
