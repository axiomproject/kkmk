const db = require('../config/db');

const StaffModel = {
  async getProfile(staffId) {
    return await db.oneOrNone(
      'SELECT id, name, email, department, phone, status FROM staff_users WHERE id = $1',
      [staffId]
    );
  },

  async updateProfile(staffId, updates) {
    const { name, email, phone, department } = updates;
    return await db.one(
      `UPDATE staff_users 
       SET name = $1, email = $2, phone = $3, department = $4, updated_at = NOW() 
       WHERE id = $5 
       RETURNING id, name, email, department, phone, status`,
      [name, email, phone, department, staffId]
    );
  },

  async getVolunteers() {
    return await db.any(
      `SELECT id, name, email, phone, status, created_at 
       FROM users 
       WHERE role = 'volunteer' 
       ORDER BY created_at DESC`
    );
  },

  async getVolunteerById(id) {
    return await db.oneOrNone(
      `SELECT id, name, email, phone, status, created_at 
       FROM users 
       WHERE id = $1 AND role = 'volunteer'`,
      [id]
    );
  },

  async updateVolunteer(id, updates) {
    const { name, email, phone, status } = updates;
    return await db.one(
      `UPDATE users 
       SET name = $1, email = $2, phone = $3, status = $4, updated_at = NOW() 
       WHERE id = $5 AND role = 'volunteer' 
       RETURNING id, name, email, phone, status`,
      [name, email, phone, status, id]
    );
  }
};

module.exports = StaffModel;
