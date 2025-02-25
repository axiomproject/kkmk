const db = require('../config/db');

const ContentModel = {
  async getContent(page) {
    return await db.oneOrNone(
      'SELECT * FROM page_content WHERE page_name = $1',
      [page]
    );
  },

  async updateContent(page, content) {
    console.log('Saving content:', { page, content }); // Debug log
    return await db.one(
      `INSERT INTO page_content (page_name, content, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (page_name) 
       DO UPDATE SET content = $2::jsonb, updated_at = NOW()
       RETURNING *`,
      [page, JSON.stringify(content)]
    );
  },

  async getPages() {
    const result = await db.any('SELECT page_name FROM page_content');
    return result.map(row => row.page_name); // Convert to simple array of page names
  }
};

module.exports = ContentModel;
