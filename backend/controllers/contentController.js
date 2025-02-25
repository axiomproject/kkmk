const path = require('path');
const fs = require('fs');
const ContentModel = require('../models/contentModel');

const ContentController = {
  async getContent(req, res) {
    try {
      const { page } = req.params;
      const content = await ContentModel.getContent(page);
      console.log('Retrieved content for page:', page, content);

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

      console.log('Sending content:', content || defaultContent);
      res.json(content || defaultContent);
    } catch (error) {
      console.error('Error getting content:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async updateContent(req, res) {
    try {
      const { page } = req.params;
      
      console.log('Raw request body:', req.body);
      console.log('Content type:', req.headers['content-type']);

      let contentData;
      
      // Handle both JSON and form-data
      if (req.headers['content-type']?.includes('application/json')) {
        contentData = req.body;
      } else if (req.body.content) {
        try {
          contentData = JSON.parse(req.body.content);
        } catch (e) {
          console.error('Parse error:', e);
          throw new Error('Invalid JSON format');
        }
      } else {
        throw new Error('No content provided');
      }

      if (!contentData) {
        throw new Error('Invalid content data');
      }

      console.log('Content to save:', contentData);
      const updated = await ContentModel.updateContent(page, contentData);
      res.json(updated);
    } catch (error) {
      console.error('Error in updateContent:', error);
      res.status(500).json({ 
        error: error.message,
        receivedBody: req.body,
        contentType: req.headers['content-type']
      });
    }
  },

  async getPages(req, res) {
    try {
      const pages = await ContentModel.getPages();
      console.log('Pages from DB:', pages);
      res.json(['home', 'story', 'team', 'community', 'graduates', 'partner', 'contact', 'life']);
    } catch (error) {
      console.error('Error getting pages:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async uploadImage(req, res) {
    try {
      if (!req.file) {
        throw new Error('No file uploaded');
      }

      const uploadDir = path.join(__dirname, '..', 'uploads', 'content');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Special handling for SVG files
      if (req.file.mimetype === 'image/svg+xml') {
        // You might want to sanitize SVG files here for security
        // For now, we'll just ensure proper content type headers are sent
        res.setHeader('Content-Type', 'image/svg+xml');
      }

      const imagePath = `/uploads/content/${req.file.filename}`;
      const fullPath = path.join(__dirname, '..', imagePath);
      
      console.log({
        uploadDir,
        imagePath,
        fullPath,
        fileInfo: req.file
      });

      res.json({ 
        imagePath,
        success: true,
        fileInfo: {
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = ContentController;
