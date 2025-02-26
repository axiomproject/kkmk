const db = require('../config/db');

const ScholarModel = {
  async getAllScholars() {
    // Replace db.any with db.query
    const result = await db.query(`
      SELECT s.*,
             u.id as assigned_user_id,
             u.name as assigned_user_name,
             u.email as assigned_user_email,
             u.profile_photo as assigned_user_profile_photo
      FROM scholars s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    return result.rows;
  },

  async getScholarById(id) {
    // Replace db.oneOrNone with db.query
    const result = await db.query(`
      SELECT s.*,
             u.id as assigned_user_id,
             u.name as assigned_user_name,
             u.email as assigned_user_email,
             u.profile_photo as assigned_user_profile_photo
      FROM scholars s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [id]);
    return result.rows.length ? result.rows[0] : null;
  },

  async createScholar(data) {
    // Replace db.one with db.query
    const result = await db.query(`
      INSERT INTO scholars (
        first_name, last_name, address, date_of_birth,
        grade_level, school, guardian_name, guardian_phone,
        gender, favorite_subject, favorite_activity, 
        favorite_color, other_details, image_url,
        created_at, status, current_amount, amount_needed
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, NOW(), $15, $16, $17
      ) RETURNING *
    `, [
      data.firstName,
      data.lastName,
      data.address,
      data.dateOfBirth,
      data.gradeLevel,
      data.school,
      data.guardianName,
      data.guardianPhone,
      data.gender,
      data.favoriteSubject,
      data.favoriteActivity,
      data.favoriteColor,
      data.otherDetails,
      data.imageUrl,
      data.status || 'active',
      data.currentAmount || 0,
      data.amountNeeded || 0
    ]);
    return result.rows[0];
  },

  async updateScholar(id, updates) {
    // Convert camelCase to snake_case for database columns
    const columnMapping = {
      firstName: 'first_name',
      lastName: 'last_name',
      dateOfBirth: 'date_of_birth',
      gradeLevel: 'grade_level',
      guardianName: 'guardian_name',
      guardianPhone: 'guardian_phone',
      favoriteSubject: 'favorite_subject',
      favoriteActivity: 'favorite_activity',
      favoriteColor: 'favorite_color',
      otherDetails: 'other_details',
      imageUrl: 'image_url',
      status: 'status',
      currentAmount: 'current_amount',
      amountNeeded: 'amount_needed'
    };

    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    // Log the incoming updates
    console.log('Received updates:', updates);

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        const dbColumn = columnMapping[key] || key;
        updateFields.push(`${dbColumn} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);

    const query = `
      UPDATE scholars 
      SET ${updateFields.join(', ')}, updated_at = NOW() 
      WHERE id = $${valueIndex} 
      RETURNING *
    `;

    console.log('Update query:', query);
    console.log('Update values:', values);

    // Replace db.one with db.query
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async deleteScholar(id) {
    // Replace db.tx with a transaction pattern using client
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Delete related donations first
      await client.query('DELETE FROM scholar_donations WHERE scholar_id = $1', [id]);
      // Then delete the scholar
      const result = await client.query('DELETE FROM scholars WHERE id = $1 RETURNING id', [id]);
      
      await client.query('COMMIT');
      return { rowCount: result.rowCount };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async bulkDeleteScholars(ids) {
    // Replace db.tx with a transaction pattern using client
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Delete related donations first
      await client.query('DELETE FROM scholar_donations WHERE scholar_id = ANY($1::int[])', [ids]);
      // Then delete the scholars
      const result = await client.query('DELETE FROM scholars WHERE id = ANY($1::int[])', [ids]);
      
      await client.query('COMMIT');
      return { rowCount: result.rowCount };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async assignUser(scholarId, userId) {
    // Replace db.tx with a transaction pattern using client
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Clear any existing assignment
      await client.query('UPDATE scholars SET user_id = NULL WHERE user_id = $1', [userId]);
      
      // Assign the user
      await client.query('UPDATE scholars SET user_id = $1, updated_at = NOW() WHERE id = $2', 
        [userId, scholarId]);
      
      // Get updated scholar with user info
      const result = await client.query(`
        SELECT 
          s.id,
          s.first_name,
          s.last_name,
          u.id as assigned_user_id,
          u.name as assigned_user_name,
          u.email as assigned_user_email,
          u.profile_photo as assigned_user_profile_photo
        FROM scholars s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = $1
      `, [scholarId]);
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async unassignUser(scholarId) {
    // Replace db.one with db.query
    const result = await db.query(`
      UPDATE scholars 
      SET user_id = NULL, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [scholarId]);
    return result.rows[0];
  }
};

module.exports = ScholarModel;
