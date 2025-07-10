const ContentModel = require('../models/contentModel');
const { uploads, uploadToCloudinary } = require('../config/cloudinaryConfig');

// Upload content image
exports.uploadContentImage = async (req, res) => {
  try {
    // Handle the file upload using multer
    uploads.content.single('image')(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      try {
        console.log('File received:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        });

        // Upload to Cloudinary
        const result = await uploadToCloudinary(req.file, 'content');
        console.log('Cloudinary upload result:', result);

        // Return the URL directly as a string
        res.json(result.url);
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        res.status(500).json({ 
          error: 'Failed to upload to Cloudinary',
          details: cloudinaryError.message
        });
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Server error during upload',
      details: error.message
    });
  }
};

// Get content for specific page
exports.getContent = async (req, res) => {
  try {
    const { page } = req.params;
    const content = await ContentModel.getContent(page);

    // Page-specific default content
    const defaultContent = {
      page_name: page,
      content: {
        bannerImage: '',
        sections: []
      }
    };

    // Add page-specific structure
    if (page === 'life') {
      defaultContent.content = {
        bannerImage: '',
        headerText: 'Welcome to the heart of KM Foundation',
        description: 'where every individual – staff, sponsored students, and sponsors – plays a vital role...',
        tabs: ['All', 'Educating the Young', 'Health and Nutrition', 'Special Programs'],
        galleryImages: []
      };
    } else if (page === 'contact') {
      defaultContent.content = {
        mainHeading: 'Contact Us',
        mainDescription: 'If you have further questions...',
        email: 'Kmkkpayatas@gmail.com',
        phone: '321-221-221',
        sections: [
          {
            title: "Contact Support",
            description: "Provides exceptional customer assistance..."
          },
          {
            title: "Feedback and Suggestions",
            description: "Collects, analyzes, and addresses user feedback..."
          },
          {
            title: "Made Inquiries",
            description: "Handles and responds to inquiries efficiently..."
          }
        ],
        locationHeading: 'Our location',
        locationTitle: 'Connecting Near and Far',
        locationSubHeading: 'Headquarters',
        address: []
      };
    } else if (page === 'partner') {
      defaultContent.content.sections = [
        {
          title: 'Philippines Humanitarian',
          text: '',
          image: '',
          caption: null
        },
        {
          title: '',
          text: '',
          image: '',
          caption: null
        }
      ];
    } else if (page === 'graduates' || page === 'community') {
      defaultContent.content = {
        bannerImage: '',
        headerText: page === 'graduates' ? 'Graduate Testimonials' : 'Our Community',
        subText: '',
        testimonials: []
      };
    }

    res.json(content || defaultContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update content for specific page
exports.updateContent = async (req, res) => {
  try {
    const { page } = req.params;
    
    let contentData;
    
    // Handle both JSON and form-data
    if (req.headers['content-type']?.includes('application/json')) {
      contentData = req.body;
    } else if (req.body.content) {
      try {
        contentData = JSON.parse(req.body.content);
      } catch (e) {
        throw new Error('Invalid JSON format');
      }
    } else {
      throw new Error('No content provided');
    }

    if (!contentData) {
      throw new Error('Invalid content data');
    }

    const updated = await ContentModel.updateContent(page, contentData);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      receivedBody: req.body,
      contentType: req.headers['content-type']
    });
  }
};

// Get all available pages
exports.getPages = async (req, res) => {
  try {
    const pages = await ContentModel.getPages();
    res.json(['home', 'story', 'team', 'community', 'graduates', 'partner', 'contact', 'life']);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
