const db = require('../config/db');

const StaffModel = {
  async getProfile(staffId) {
    // Replace db.oneOrNone with db.query
    const result = await db.query(
      'SELECT id, name, email, department, phone, status FROM staff_users WHERE id = $1',
      [staffId]
    );
    return result.rows.length ? result.rows[0] : null;
  },

  async updateProfile(staffId, updates) {
    const { name, email, phone, department } = updates;
    // Replace db.one with db.query
    const result = await db.query(
      `UPDATE staff_users 
       SET name = $1, email = $2, phone = $3, department = $4, updated_at = NOW() 
       WHERE id = $5 
       RETURNING id, name, email, department, phone, status`,
      [name, email, phone, department, staffId]
    );
    return result.rows[0];
  },

  async getVolunteers() {
    // Replace db.any with db.query
    const result = await db.query(
      `SELECT id, name, email, phone, status, created_at 
       FROM users 
       WHERE role = 'volunteer' 
       ORDER BY created_at DESC`
    );
    return result.rows;
  },

  async getVolunteerById(id) {
    // Replace db.oneOrNone with db.query
    const result = await db.query(
      `SELECT id, name, email, phone, status, created_at 
       FROM users 
       WHERE id = $1 AND role = 'volunteer'`,
      [id]
    );
    return result.rows.length ? result.rows[0] : null;
  },

  async updateVolunteer(id, updates) {
    const { name, email, phone, status } = updates;
    // Replace db.one with db.query
    const result = await db.query(
      `UPDATE users 
       SET name = $1, email = $2, phone = $3, status = $4, updated_at = NOW() 
       WHERE id = $5 AND role = 'volunteer' 
       RETURNING id, name, email, phone, status`,
      [name, email, phone, status, id]
    );
    return result.rows[0];
  }
};

module.exports = StaffModel;
