const db = require('../config/db');

const ContentModel = {
  async getContent(page) {
    // Replace db.oneOrNone with db.query
    const result = await db.query(
      'SELECT * FROM page_content WHERE page_name = $1',
      [page]
    );
    // Return the first row or null if no rows
    return result.rows.length ? result.rows[0] : null;
  },

  async updateContent(page, content) {
    console.log('Saving content:', { page, content }); // Debug log
    // Replace db.one with db.query
    const result = await db.query(
      `INSERT INTO page_content (page_name, content, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (page_name) 
       DO UPDATE SET content = $2::jsonb, updated_at = NOW()
       RETURNING *`,
      [page, JSON.stringify(content)]
    );
    // Return the first row
    return result.rows[0];
  },

  async getPages() {
    // Replace db.any with db.query
    const result = await db.query('SELECT page_name FROM page_content');
    return result.rows.map(row => row.page_name); // Convert to simple array of page names
  }
};

module.exports = ContentModel;
