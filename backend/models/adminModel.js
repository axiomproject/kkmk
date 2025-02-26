const db = require('../config/db');

const AdminModel = {
  // Dashboard Statistics

  // User Management
  async getAllUsers() {
    const result = await db.query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows;
  },

  async updateUser(id, updates) {
    const { name, email, role, status } = updates;
    const result = await db.query(
      'UPDATE users SET name = $1, email = $2, role = $3, status = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [name, email, role, status, id]
    );
    return result.rows[0];
  },

  async deleteUser(id) {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
  },

  // Staff Management - using staff_users table
  async getAllStaff() {
    const result = await db.query(`
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
    return result.rows;
  },

  async getStaffById(id) {
    const result = await db.query('SELECT * FROM staff_users WHERE id = $1', [id]);
    return result.rows.length ? result.rows[0] : null;
  },

  async createStaffMember(staffData) {
    const { name, email, password, department, phone } = staffData;
    const result = await db.query(
      `INSERT INTO staff_users (
        name, email, password, department, phone, 
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
      RETURNING id, name, email, department, phone, status`,
      [name, email, password, department, phone, 'active']
    );
    return result.rows[0];
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

    const result = await db.query(query, values);
    return result.rows[0];
  },

  async deleteStaffMember(id) {
    const result = await db.query('DELETE FROM staff_users WHERE id = $1', [id]);
    return result;
  },

  async bulkDeleteStaffMembers(ids) {
    try {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        
        // Delete staff members
        const result = await client.query(
          'DELETE FROM staff_users WHERE id = ANY($1::int[]) RETURNING id',
          [ids]
        );
        
        if (result.rowCount === 0) {
          throw new Error('No staff members found to delete');
        }
        
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      throw error;
    }
  },

  // Volunteer Management
  async getVolunteers() {
    const result = await db.query(`
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
    return result.rows;
  },

  async getVolunteerById(id) {
    const result = await db.query(`
      SELECT 
        id, name, email, username, phone,
        date_of_birth, status, last_login,
        is_verified, profile_photo, created_at
      FROM users 
      WHERE id = $1 AND role = 'volunteer'
    `, [id]);
    return result.rows.length ? result.rows[0] : null;
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

    const result = await db.query(query, values);
    return result.rows[0];
  },

  async deleteVolunteer(id) {
    try {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        
        // Delete notifications where volunteer is the recipient
        await client.query('DELETE FROM notifications WHERE user_id = $1', [id]);
        
        // Delete notifications where volunteer is the actor
        await client.query('DELETE FROM notifications WHERE actor_id = $1', [id]);
        
        // Delete event participants records for this volunteer
        await client.query('DELETE FROM event_participants WHERE user_id = $1', [id]);
        
        // Finally delete the volunteer
        const result = await client.query(
          'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id',
          [id, 'volunteer']
        );
        
        if (result.rows.length === 0) {
          throw new Error('Volunteer not found');
        }
        
        await client.query('COMMIT');
        return result.rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  },

  async createVolunteer(volunteerData) {
    const { name, username, email, password, date_of_birth } = volunteerData;
    const result = await db.query(`
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
    return result.rows[0];
  },

  async bulkDeleteVolunteers(ids) {
    try {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        
        // Delete related records for all volunteers
        await client.query('DELETE FROM notifications WHERE user_id = ANY($1::int[])', [ids]);
        await client.query('DELETE FROM notifications WHERE actor_id = ANY($1::int[])', [ids]);
        await client.query('DELETE FROM event_participants WHERE user_id = ANY($1::int[])', [ids]);
        
        // Delete the volunteers
        const result = await client.query(
          'DELETE FROM users WHERE id = ANY($1::int[]) AND role = $2 RETURNING id',
          [ids, 'volunteer']
        );
        
        if (result.rowCount === 0) {
          throw new Error('No volunteers found to delete');
        }
        
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      throw error;
    }
  },

  // Scholar Management
  async getScholars() {
    const result = await db.query(`
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
    return result.rows;
  },

  async getScholarById(id) {
    const result = await db.query(`
      SELECT * FROM users 
      WHERE id = $1 AND role = 'scholar'
    `, [id]);
    return result.rows.length ? result.rows[0] : null;
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

    const result = await db.query(`
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
    return result.rows[0];
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

    const result = await db.query(query, values);
    return result.rows[0];
  },

  async deleteScholar(id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Delete related records (similar to volunteer deletion)
      await client.query('DELETE FROM notifications WHERE user_id = $1', [id]);
      await client.query('DELETE FROM notifications WHERE actor_id = $1', [id]);
      await client.query('DELETE FROM event_participants WHERE user_id = $1', [id]);
      
      const result = await client.query(
        'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id',
        [id, 'scholar']
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        
        // Delete related records
        await client.query('DELETE FROM notifications WHERE user_id = ANY($1::integer[])', [numericIds]);
        await client.query('DELETE FROM notifications WHERE actor_id = ANY($1::integer[])', [numericIds]);
        await client.query('DELETE FROM event_participants WHERE user_id = ANY($1::integer[])', [numericIds]);
        
        // Delete the scholars
        const result = await client.query(
          'DELETE FROM users WHERE id = ANY($1::integer[]) AND role = $2 RETURNING id',
          [numericIds, 'scholar']
        );

        console.log('Bulk delete result:', result); // Debug log
        
        if (result.rowCount === 0) {
          throw new Error('No scholars found to delete');
        }
        
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      throw error;
    }
  },

  // Sponsor Management
  async getSponsors() {
    const result = await db.query(`
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
    return result.rows;
  },

  async getSponsorById(id) {
    const result = await db.query(`
      SELECT * FROM users 
      WHERE id = $1 AND role = 'sponsor'
    `, [id]);
    return result.rows.length ? result.rows[0] : null;
  },

  async createSponsor(sponsorData) {
    const { 
      username, password, email, name,
      phone, status, is_verified, date_of_birth,
      role
    } = sponsorData;

    const result = await db.query(`
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
    return result.rows[0];
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

    const result = await db.query(query, values);
    return result.rows[0];
  },

  async deleteSponsor(id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Delete related records
      await client.query('DELETE FROM notifications WHERE user_id = $1', [id]);
      await client.query('DELETE FROM notifications WHERE actor_id = $1', [id]);
      
      const result = await client.query(
        'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id',
        [id, 'sponsor']
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async bulkDeleteSponsors(ids) {
    try {
      const numericIds = ids
        .map(id => Number(id))
        .filter(id => !isNaN(id) && id > 0);

      if (numericIds.length === 0) {
        throw new Error('No valid IDs provided for deletion');
      }

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        
        // Delete related records
        await client.query('DELETE FROM notifications WHERE user_id = ANY($1::integer[])', [numericIds]);
        await client.query('DELETE FROM notifications WHERE actor_id = ANY($1::integer[])', [numericIds]);
        
        const result = await client.query(
          'DELETE FROM users WHERE id = ANY($1::integer[]) AND role = $2 RETURNING id',
          [numericIds, 'sponsor']
        );
        
        if (result.rowCount === 0) {
          throw new Error('No sponsors found to delete');
        }
        
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
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
