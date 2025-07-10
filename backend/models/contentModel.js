const db = require('../config/db');

const ContentModel = {
  // Helper function to clean image URLs
  cleanImageUrl(url) {
    console.log('Cleaning URL:', url);
    if (!url) {
      console.log('URL is null/undefined, returning null');
      return null;
    }

    // Handle Cloudinary URLs
    if (url.includes('cloudinary.com')) {
      // Extract the version and public_id
      const match = url.match(/\/upload\/(v\d+)\/(.+)$/);
      if (match) {
        console.log('Valid Cloudinary URL:', url);
        // Valid versioned URL, return as is
        return url;
      }
      console.log('Invalid Cloudinary URL format:', url);
      // Invalid Cloudinary URL format
      return null;
    }

    // Handle local uploads or other formats
    if (url.startsWith('/uploads/') || !url.startsWith('http')) {
      console.log('Local or invalid URL format:', url);
      return null;
    }

    console.log('Returning URL as is:', url);
    return url;
  },

  // Helper function to clean content object
  cleanContent(content, operation = 'unknown') {
    console.log(`Cleaning content for ${operation} operation:`, content);
    if (!content) return content;

    const processItem = (item) => {
      if (Array.isArray(item)) {
        return item.map(processItem);
      }
      if (item && typeof item === 'object') {
        const newItem = { ...item };
        for (const [key, value] of Object.entries(item)) {
          if (key === 'image' || key === 'bannerImage' || key === 'src') {
            console.log(`Processing ${key}:`, value);
            const cleanedUrl = this.cleanImageUrl(value);
            console.log(`Cleaned ${key}:`, cleanedUrl);
            newItem[key] = cleanedUrl;
          } else if (typeof value === 'object') {
            newItem[key] = processItem(value);
          }
        }
        return newItem;
      }
      return item;
    };

    const cleanedContent = processItem(content);
    console.log(`Content after cleaning (${operation}):`, cleanedContent);
    return cleanedContent;
  },

  async getContent(page) {
    console.log('Getting content for page:', page);
    const result = await db.query(
      'SELECT * FROM page_content WHERE page_name = $1',
      [page]
    );

    if (!result.rows.length) {
      console.log('No content found for page:', page);
      return null;
    }

    const content = result.rows[0];
    console.log('Raw content from DB:', content);
    if (content.content) {
      content.content = this.cleanContent(content.content, 'get');
    }
    console.log('Cleaned content for response:', content);

    return content;
  },

  async updateContent(page, content) {
    console.log('Updating content for page:', page);
    console.log('Content before cleaning:', content);

    // Clean the content before saving
    const cleanedContent = this.cleanContent(content, 'update');
    console.log('Content after cleaning:', cleanedContent);

    // Verify features array before saving
    if (cleanedContent.features) {
      console.log('Features before save:', cleanedContent.features);
      cleanedContent.features = cleanedContent.features.map(feature => ({
        ...feature,
        image: feature.image || null // Ensure null instead of undefined
      }));
      console.log('Features after null check:', cleanedContent.features);
    }

    const jsonContent = JSON.stringify(cleanedContent);
    console.log('Content being saved to DB:', jsonContent);

    const result = await db.query(
      `INSERT INTO page_content (page_name, content, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (page_name) 
       DO UPDATE SET content = $2::jsonb, updated_at = NOW()
       RETURNING *`,
      [page, jsonContent]
    );

    console.log('Save result:', result.rows[0]);
    return result.rows[0];
  },

  async getPages() {
    const result = await db.query('SELECT page_name FROM page_content');
    return result.rows.map(row => row.page_name);
  }
};

module.exports = ContentModel;
