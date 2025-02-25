const db = require('../config/db');

const ScholarModel = {
  async getAllScholars() {
    return await db.any(`
      SELECT s.*,
             u.id as assigned_user_id,
             u.name as assigned_user_name,
             u.email as assigned_user_email,
             u.profile_photo as assigned_user_profile_photo
      FROM scholars s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
  },

  async getScholarById(id) {
    return await db.oneOrNone(`
      SELECT s.*,
             u.id as assigned_user_id,
             u.name as assigned_user_name,
             u.email as assigned_user_email,
             u.profile_photo as assigned_user_profile_photo
      FROM scholars s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [id]);
  },

  async createScholar(data) {
    return await db.one(`
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

    return await db.one(query, values);
  },

  async deleteScholar(id) {
    return await db.tx(async t => {
      // Delete related donations first
      await t.none('DELETE FROM scholar_donations WHERE scholar_id = $1', [id]);
      // Then delete the scholar
      return await t.result('DELETE FROM scholars WHERE id = $1', [id]);
    });
  },

  async bulkDeleteScholars(ids) {
    return await db.tx(async t => {
      // Delete related donations first
      await t.none('DELETE FROM scholar_donations WHERE scholar_id = ANY($1::int[])', [ids]);
      // Then delete the scholars
      return await t.result('DELETE FROM scholars WHERE id = ANY($1::int[])', [ids]);
    });
  },

  async assignUser(scholarId, userId) {
    return await db.tx(async t => {
      // Clear any existing assignment
      await t.none('UPDATE scholars SET user_id = NULL WHERE user_id = $1', [userId]);
      
      // Assign the user and get the updated scholar with user info
      return await t.one(`
        UPDATE scholars 
        SET user_id = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING (
          SELECT json_build_object(
            'id', s.id,
            'first_name', s.first_name,
            'last_name', s.last_name,
            'assigned_user_id', u.id,
            'assigned_user_name', u.name,
            'assigned_user_email', u.email,
            'assigned_user_profile_photo', u.profile_photo
          )
          FROM scholars s
          LEFT JOIN users u ON u.id = $1
          WHERE s.id = $2
        ) as scholar
      `, [userId, scholarId])
      .then(result => result.scholar);
    });
  },

  async unassignUser(scholarId) {
    return await db.one(`
      UPDATE scholars 
      SET user_id = NULL, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [scholarId]);
  }
};

module.exports = ScholarModel;
