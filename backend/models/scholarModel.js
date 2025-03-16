const db = require('../config/db');

const ScholarModel = {
  async getAllScholars() {
    // Modified query to join users and scholars tables and filter verified scholars
    const result = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.gender,
        u.guardian_name,
        u.guardian_phone, 
        u.address,
        u.date_of_birth,
        u.education_level,
        u.school,
        u.profile_photo,
        u.is_verified,
        u.document_paths,
        s.favorite_subject,
        s.favorite_activity,
        s.favorite_color,
        s.other_details,
        s.image_url,
        s.is_active,
        s.created_at,
        s.updated_at,
        s.status,
        s.current_amount,
        s.amount_needed,
        s.user_id,
        -- Include the assigned user info from scholars table
        a.id as assigned_user_id,
        a.name as assigned_user_name,
        a.email as assigned_user_email,
        a.profile_photo as assigned_user_profile_photo
      FROM users u
      LEFT JOIN scholars s ON u.id = s.user_id
      LEFT JOIN users a ON s.user_id = a.id
      WHERE u.role = 'scholar' AND u.is_verified = true
      ORDER BY u.created_at DESC
    `);
    return result.rows;
  },

  async getScholarById(id) {
    // Modified query to join users and scholars tables for a specific user
    const result = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.gender,
        u.guardian_name,
        u.guardian_phone,
        u.address,
        u.date_of_birth,
        u.education_level,
        u.school,
        u.profile_photo,
        u.is_verified,
        u.document_paths,
        s.id as scholar_id,
        s.favorite_subject,
        s.favorite_activity,
        s.favorite_color,
        s.other_details,
        s.image_url,
        s.is_active,
        s.created_at,
        s.updated_at,
        s.status as scholar_status,  /* Specifically get scholar status */
        u.status as user_status,     /* Get user status as well */
        s.current_amount,
        s.amount_needed,
        s.user_id,
        -- Include the assigned user info
        a.id as assigned_user_id,
        a.name as assigned_user_name,
        a.email as assigned_user_email,
        a.profile_photo as assigned_user_profile_photo
      FROM users u
      LEFT JOIN scholars s ON u.id = s.user_id
      LEFT JOIN users a ON s.user_id = a.id
      WHERE u.id = $1 AND u.role = 'scholar'
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
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      console.log('Updating scholar with ID:', id);
      console.log('Updates received:', updates);

      // First check if this is a user record or a scholar record
      const userCheck = await client.query(
        'SELECT id, first_name, last_name, gender, address, date_of_birth, education_level, school, guardian_name, guardian_phone FROM users WHERE id = $1 AND role = $2',
        [id, 'scholar']
      );
      
      const isUserRecord = userCheck.rows.length > 0;
      console.log('Is user record:', isUserRecord);

      // If this is a user record, update the users table
      if (isUserRecord) {
        let userData = userCheck.rows[0];
        
        // Update users table
        if (updates.firstName || updates.lastName || updates.gender || 
            updates.dateOfBirth || updates.address || 
            updates.guardianName || updates.guardianPhone || 
            updates.gradeLevel || updates.school) {
          
          console.log('Updating user table data');
          await client.query(`
            UPDATE users SET
              first_name = COALESCE($1, first_name),
              last_name = COALESCE($2, last_name),
              gender = COALESCE($3, gender),
              date_of_birth = COALESCE($4, date_of_birth),
              address = COALESCE($5, address),
              guardian_name = COALESCE($6, guardian_name),
              guardian_phone = COALESCE($7, guardian_phone),
              education_level = COALESCE($8, education_level),
              school = COALESCE($9, school)
            WHERE id = $10 AND role = 'scholar'
          `, [
            updates.firstName,
            updates.lastName,
            updates.gender,
            updates.dateOfBirth,
            updates.address,
            updates.guardianName,
            updates.guardianPhone,
            updates.gradeLevel, // Maps to education_level
            updates.school,
            id
          ]);
          
          // Fetch the updated user data
          const updatedUserQuery = await client.query(
            'SELECT id, first_name, last_name, gender, address, date_of_birth, education_level, school, guardian_name, guardian_phone FROM users WHERE id = $1',
            [id]
          );
          
          if (updatedUserQuery.rows.length > 0) {
            userData = updatedUserQuery.rows[0];
          }
        }
        
        // Check if the scholars table entry exists
        const scholarCheck = await client.query(
          'SELECT id FROM scholars WHERE user_id = $1',
          [id]
        );
        
        // Update or create scholars record
        if (scholarCheck.rows.length === 0) {
          // Create a new record if it doesn't exist
          console.log('Creating scholars record for user_id:', id);
          await client.query(`
            INSERT INTO scholars (
              first_name, last_name, gender, address, date_of_birth, grade_level, school, guardian_name, guardian_phone,
              favorite_subject, favorite_activity, favorite_color,
              other_details, image_url, status, current_amount, amount_needed, user_id
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
            )
          `, [
            userData.first_name, 
            userData.last_name,
            userData.gender,
            userData.address,
            userData.date_of_birth,
            userData.education_level,
            userData.school,
            userData.guardian_name,
            userData.guardian_phone,
            updates.favoriteSubject || null,
            updates.favoriteActivity || null,
            updates.favoriteColor || null,
            updates.otherDetails || null,
            updates.image_url || null,
            updates.status || 'active',
            updates.currentAmount || 0,
            updates.amountNeeded || 0,
            id
          ]);
        } else {
          // Update existing record
          console.log('Updating scholars record for user_id:', id);
          
          // Get all parameters ready before executing the query
          const imageUrl = updates.imageUrl || updates.image_url || null;
          
          // Make sure all the fields from the form are captured
          const favoriteSubject = updates.favoriteSubject || null;
          const favoriteActivity = updates.favoriteActivity || null;
          const favoriteColor = updates.favoriteColor || null;
          const otherDetails = updates.otherDetails || null;
          const status = updates.status || 'active';
          const currentAmount = updates.currentAmount !== undefined ? parseFloat(updates.currentAmount) : null;
          const amountNeeded = updates.amountNeeded !== undefined ? parseFloat(updates.amountNeeded) : null;
          
          console.log('Favorite Subject:', favoriteSubject);
          console.log('Favorite Activity:', favoriteActivity);
          console.log('Favorite Color:', favoriteColor);
          console.log('Other Details:', otherDetails);
          console.log('Current Amount:', currentAmount);
          console.log('Amount Needed:', amountNeeded);
          
          // Split the update into two queries to avoid type inference issues
          // First update everything except the image_url
          await client.query(`
            UPDATE scholars SET
              favorite_subject = COALESCE($1, favorite_subject),
              favorite_activity = COALESCE($2, favorite_activity),
              favorite_color = COALESCE($3, favorite_color),
              other_details = COALESCE($4, other_details),
              status = COALESCE($5, status),
              current_amount = COALESCE($6, current_amount),
              amount_needed = COALESCE($7, amount_needed),
              updated_at = NOW()
            WHERE user_id = $8
          `, [
            favoriteSubject,
            favoriteActivity,
            favoriteColor,
            otherDetails,
            status,
            currentAmount,
            amountNeeded,
            id
          ]);
          
          // Then update the image_url separately if it exists
          if (imageUrl) {
            console.log('Updating image URL to:', imageUrl);
            await client.query(`
              UPDATE scholars SET 
                image_url = $1
              WHERE user_id = $2
            `, [imageUrl, id]);
          }
        }
      } else {
        // Handle legacy scholars records (not linked to users)
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
        console.log('Legacy update - Received updates:', updates);
  
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
  
        console.log('Legacy update query:', query);
        console.log('Legacy update values:', values);
  
        await client.query(query, values);
      }
      
      // Get the full updated scholar record
      const result = await client.query(`
        SELECT 
          COALESCE(u.id, s.id) as id,
          COALESCE(u.first_name, s.first_name) as first_name,
          COALESCE(u.last_name, s.last_name) as last_name,
          COALESCE(u.gender, s.gender) as gender,
          COALESCE(u.guardian_name, s.guardian_name) as guardian_name,
          COALESCE(u.guardian_phone, s.guardian_phone) as guardian_phone,
          COALESCE(u.address, s.address) as address,
          COALESCE(u.date_of_birth, s.date_of_birth) as date_of_birth,
          COALESCE(u.education_level, s.grade_level) as education_level,
          COALESCE(u.school, s.school) as school,
          COALESCE(u.profile_photo, NULL) as profile_photo,
          COALESCE(u.is_verified, FALSE) as is_verified,
          u.document_paths,
          s.favorite_subject,
          s.favorite_activity,
          s.favorite_color,
          s.other_details,
          s.image_url,
          s.is_active,
          s.created_at,
          s.updated_at,
          s.status,
          s.current_amount,
          s.amount_needed,
          s.user_id,
          a.id as assigned_user_id,
          a.name as assigned_user_name,
          a.email as assigned_user_email,
          a.profile_photo as assigned_user_profile_photo
        FROM users u
        FULL OUTER JOIN scholars s ON u.id = s.user_id
        LEFT JOIN users a ON s.user_id = a.id
        WHERE (u.id = $1 AND u.role = 'scholar') OR s.id = $1
      `, [id]);
      
      await client.query('COMMIT');
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in updateScholar:', error);
      throw error;
    } finally {
      client.release();
    }
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
