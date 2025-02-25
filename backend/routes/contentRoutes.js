const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const roleAuth = require('../middleware/roleAuth');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multerConfig');

// Public routes
router.get('/pages', contentController.getPages);
router.get('/:page', contentController.getContent);

// Protected routes - Update to allow both admin and staff roles
router.put('/:page', 
  authMiddleware,
  roleAuth(['admin', 'staff']), // Add staff role here
  express.json(), // JSON parser
  express.urlencoded({ extended: true }), // URL-encoded parser
  upload.none(), // Handle form-data without files
  contentController.updateContent
);

router.post('/upload-image',
  authMiddleware,
  roleAuth(['admin', 'staff']), // Add staff role here
  upload.single('image'),
  contentController.uploadImage
);

module.exports = router;
