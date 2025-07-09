const { uploads } = require('./cloudinaryConfig');

// Export the upload middleware for different types
module.exports = {
  uploadEventImage: uploads.events.single('image'),
  uploadScholarImage: uploads.scholars.single('image'),
  uploadDonationImage: uploads.donations.single('image'),
  uploadForumImage: uploads.forum.single('image'),
  uploadAdminImage: uploads.admin.single('image'),
  uploadStaffImage: uploads.staff.single('image')
};
