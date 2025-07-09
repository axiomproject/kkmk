const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const roleAuth = require('../middleware/roleAuth');
const authMiddleware = require('../middleware/authMiddleware');
const multerConfig = require('../config/multerConfig');

// Public routes
router.get('/pages', contentController.getPages);
router.get('/:page', contentController.getContent);

// Protected routes - Update to allow both admin and staff roles
router.put('/:page', 
  authMiddleware,
  roleAuth(['admin', 'staff']), // Add staff role here
  express.json(), // JSON parser
  express.urlencoded({ extended: true }), // URL-encoded parser
  multerConfig.none(), // Handle form-data without files
  contentController.updateContent
);

router.post('/upload-image',
  authMiddleware,
  roleAuth(['admin', 'staff']), // Add staff role here
  multerConfig.uploadContentImage, // Use content-specific upload config
  contentController.uploadImage
);

module.exports = router;
