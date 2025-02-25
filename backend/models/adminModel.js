const db = require('../config/db');

const AdminModel = {
  // Dashboard Statistics

  // User Management
  async getAllUsers() {
    return await db.any('SELECT * FROM users ORDER BY created_at DESC');
  },

  async updateUser(id, updates) {
    const { name, email, role, status } = updates;
    return await db.one(
      'UPDATE users SET name = $1, email = $2, role = $3, status = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [name, email, role, status, id]
    );
  },

  async deleteUser(id) {
    return await db.none('DELETE FROM users WHERE id = $1', [id]);
  },

  // Staff Management - using staff_users table
  async getAllStaff() {
    return await db.any(`
      SELECT 
        id,
        name,
        email,
        department,
        phone,
        status,
        created_at,
        updated_at,
        last_login
      FROM staff_users 
      ORDER BY created_at DESC
    `);
  },

  async getStaffById(id) {
    return await db.oneOrNone('SELECT * FROM staff_users WHERE id = $1', [id]);
  },

  async createStaffMember(staffData) {
    const { name, email, password, department, phone } = staffData;
    return await db.one(
      `INSERT INTO staff_users (
        name, email, password, department, phone, 
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
      RETURNING id, name, email, department, phone, status`,
      [name, email, password, department, phone, 'active']
    );
  },

  async updateStaffMember(id, updates) {
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    });

    values.push(id); // Add id as the last parameter

    const query = `
      UPDATE staff_users 
      SET ${updateFields.join(', ')}, updated_at = NOW() 
      WHERE id = $${valueIndex} 
      RETURNING id, name, email, department, phone, status
    `;

    return await db.one(query, values);
  },

  async deleteStaffMember(id) {
    return await db.result('DELETE FROM staff_users WHERE id = $1', [id]);
  },

  async bulkDeleteStaffMembers(ids) {
    try {
      return await db.tx(async t => {
        // Delete staff members
        const result = await t.result(
          'DELETE FROM staff_users WHERE id = ANY($1::int[]) RETURNING id',
          [ids]
        );
        
        if (result.rowCount === 0) {
          throw new Error('No staff members found to delete');
        }
        
        return result;
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      throw error;
    }
  },

  // Volunteer Management
  async getVolunteers() {
    return await db.any(`
      SELECT 
        id,
        name,
        email,
        username,
        phone,
        date_of_birth,
        status,
        last_login,
        is_verified,
        profile_photo,
        created_at
      FROM users 
      WHERE role = 'volunteer'
      ORDER BY created_at DESC
    `);
  },

  async getVolunteerById(id) {
    return await db.oneOrNone(`
      SELECT 
        id, name, email, username, phone,
        date_of_birth, status, last_login,
        is_verified, profile_photo, created_at
      FROM users 
      WHERE id = $1 AND role = 'volunteer'
    `, [id]);
  },

  async updateVolunteer(id, updates) {
    const { name, email, username, phone, date_of_birth, status, is_verified, password } = updates;
    
    // Build the update query dynamically based on whether password is provided
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    // Add non-password fields
    const fields = {
      name, email, username, phone, date_of_birth, status, is_verified
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    }

    // Add password if provided
    if (password) {
      updateFields.push(`password = $${valueIndex}`);
      values.push(password);
      valueIndex++;
    }

    // Add ID and role to values array
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex} AND role = 'volunteer'
      RETURNING id, name, email, username, phone, date_of_birth, status, is_verified, profile_photo
    `;

    return await db.one(query, values);
  },

  async deleteVolunteer(id) {
    try {
      // Use a transaction to ensure all operations succeed or fail together
      return await db.tx(async t => {
        // Delete notifications where volunteer is the recipient
        await t.none('DELETE FROM notifications WHERE user_id = $1', [id]);
        
        // Delete notifications where volunteer is the actor
        await t.none('DELETE FROM notifications WHERE actor_id = $1', [id]);
        
        // Delete event participants records for this volunteer
        await t.none('DELETE FROM event_participants WHERE user_id = $1', [id]);
        
        // Finally delete the volunteer
        const result = await t.oneOrNone(
          'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id',
          [id, 'volunteer']
        );
        
        if (!result) {
          throw new Error('Volunteer not found');
        }
        
        return result;
      });
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  },

  async createVolunteer(volunteerData) {
    const { name, username, email, password, date_of_birth } = volunteerData;
    return await db.one(`
      INSERT INTO users (
        name, username, email, password, 
        date_of_birth, role, status, 
        is_verified, created_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
      RETURNING id, name, email, username, date_of_birth, status, is_verified
    `, [
      name, username, email, password, 
      date_of_birth, 'volunteer', 'active', 
      false
    ]);
  },

  async bulkDeleteVolunteers(ids) {
    try {
      return await db.tx(async t => {
        // Delete related records for all volunteers
        await t.none('DELETE FROM notifications WHERE user_id = ANY($1::int[])', [ids]);
        await t.none('DELETE FROM notifications WHERE actor_id = ANY($1::int[])', [ids]);
        await t.none('DELETE FROM event_participants WHERE user_id = ANY($1::int[])', [ids]);
        
        // Delete the volunteers
        const result = await t.result(
          'DELETE FROM users WHERE id = ANY($1::int[]) AND role = $2 RETURNING id',
          [ids, 'volunteer']
        );
        
        if (result.rowCount === 0) {
          throw new Error('No volunteers found to delete');
        }
        
        return result;
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      throw error;
    }
  },

  // Scholar Management
  async getScholars() {
    return await db.any(`
      SELECT 
        id,
        name,
        email,
        username,
        phone,
        date_of_birth,
        status,
        last_login,
        is_verified,
        profile_photo,
        created_at
      FROM users 
      WHERE role = 'scholar'
      ORDER BY created_at DESC
    `);
  },

  async getScholarById(id) {
    return await db.oneOrNone(`
      SELECT * FROM users 
      WHERE id = $1 AND role = 'scholar'
    `, [id]);
  },

  async createScholar(scholarData) {
    const { 
      username, password, email, name,
      phone, status, is_verified, date_of_birth,
      role
    } = scholarData;

    if (!password) {
      throw new Error('Password is required');
    }

    return await db.one(`
      INSERT INTO users (
        username, password, email, name,
        phone, status, is_verified, date_of_birth,
        role, created_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id, name, email, username, phone, date_of_birth, status, is_verified
    `, [
      username,
      password,  // The password will be hashed in the controller
      email,
      name,
      phone,
      status,
      is_verified,
      date_of_birth,
      role
    ]);
  },

  async updateScholar(id, updates) {
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    });

    values.push(id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex} AND role = 'scholar'
      RETURNING id, name, email, username, phone, date_of_birth, status, is_verified
    `;

    return await db.one(query, values);
  },

  async deleteScholar(id) {
    return await db.tx(async t => {
      // Delete related records (similar to volunteer deletion)
      await t.none('DELETE FROM notifications WHERE user_id = $1', [id]);
      await t.none('DELETE FROM notifications WHERE actor_id = $1', [id]);
      await t.none('DELETE FROM event_participants WHERE user_id = $1', [id]);
      
      return await t.oneOrNone(
        'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id',
        [id, 'scholar']
      );
    });
  },

  async bulkDeleteScholars(ids) {
    try {
      // Convert all IDs to numbers and filter out any invalid values
      const numericIds = ids
        .map(id => Number(id))
        .filter(id => !isNaN(id) && id > 0);

      console.log('Processing numeric IDs:', numericIds); // Debug log

      if (numericIds.length === 0) {
        throw new Error('No valid IDs provided for deletion');
      }

      return await db.tx(async t => {
        // Delete related records
        await t.none('DELETE FROM notifications WHERE user_id = ANY($1::integer[])', [numericIds]);
        await t.none('DELETE FROM notifications WHERE actor_id = ANY($1::integer[])', [numericIds]);
        await t.none('DELETE FROM event_participants WHERE user_id = ANY($1::integer[])', [numericIds]);
        
        // Delete the scholars
        const result = await t.result(
          'DELETE FROM users WHERE id = ANY($1::integer[]) AND role = $2 RETURNING id',
          [numericIds, 'scholar']
        );

        console.log('Bulk delete result:', result); // Debug log
        
        if (result.rowCount === 0) {
          throw new Error('No scholars found to delete');
        }
        
        return result;
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      throw error;
    }
  },

  // Sponsor Management
  async getSponsors() {
    return await db.any(`
      SELECT 
        id,
        name,
        email,
        username,
        phone,
        date_of_birth,
        status,
        last_login,
        is_verified,
        profile_photo,
        created_at
      FROM users 
      WHERE role = 'sponsor'
      ORDER BY created_at DESC
    `);
  },

  async getSponsorById(id) {
    return await db.oneOrNone(`
      SELECT * FROM users 
      WHERE id = $1 AND role = 'sponsor'
    `, [id]);
  },

  async createSponsor(sponsorData) {
    const { 
      username, password, email, name,
      phone, status, is_verified, date_of_birth,
      role
    } = sponsorData;

    return await db.one(`
      INSERT INTO users (
        username, password, email, name,
        phone, status, is_verified, date_of_birth,
        role, created_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id, name, email, username, phone, date_of_birth, status, is_verified
    `, [
      username,
      password,
      email,
      name,
      phone,
      status,
      is_verified,
      date_of_birth,
      role
    ]);
  },

  async updateSponsor(id, updates) {
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    });

    values.push(id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex} AND role = 'sponsor'
      RETURNING id, name, email, username, phone, date_of_birth, status, is_verified
    `;

    return await db.one(query, values);
  },

  async deleteSponsor(id) {
    return await db.tx(async t => {
      // Delete related records
      await t.none('DELETE FROM notifications WHERE user_id = $1', [id]);
      await t.none('DELETE FROM notifications WHERE actor_id = $1', [id]);
      
      return await t.oneOrNone(
        'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id',
        [id, 'sponsor']
      );
    });
  },

  async bulkDeleteSponsors(ids) {
    try {
      const numericIds = ids
        .map(id => Number(id))
        .filter(id => !isNaN(id) && id > 0);

      if (numericIds.length === 0) {
        throw new Error('No valid IDs provided for deletion');
      }

      return await db.tx(async t => {
        // Delete related records
        await t.none('DELETE FROM notifications WHERE user_id = ANY($1::integer[])', [numericIds]);
        await t.none('DELETE FROM notifications WHERE actor_id = ANY($1::integer[])', [numericIds]);
        
        const result = await t.result(
          'DELETE FROM users WHERE id = ANY($1::integer[]) AND role = $2 RETURNING id',
          [numericIds, 'sponsor']
        );
        
        if (result.rowCount === 0) {
          throw new Error('No sponsors found to delete');
        }
        
        return result;
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      throw error;
    }
  },

  async updateProfilePhoto(adminId, photoPath) {
    return await db.one(
      'UPDATE admin_users SET profile_photo = $1, updated_at = NOW() WHERE id = $2 RETURNING id, profile_photo',
      [photoPath, adminId]
    );
  },

  async updateAdminProfile(adminId, updates) {
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    });

    values.push(adminId);

    const query = `
      UPDATE admin_users 
      SET ${updateFields.join(', ')}, updated_at = NOW() 
      WHERE id = $${valueIndex} 
      RETURNING id, name, email, profile_photo
    `;

    return await db.one(query, values);
  }
};

module.exports = AdminModel;
