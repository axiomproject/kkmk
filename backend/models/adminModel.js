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
    try {
      const result = await db.query(`
        SELECT 
          id,
          name,
          email,
          phone,
          username,
          created_at,
          status,
          is_verified,
          date_of_birth,
          last_login,
          skills,
          disability,
          gender,
          skill_evidence  /* Add skill_evidence field */
        FROM users
        WHERE role = 'volunteer'
        ORDER BY created_at DESC
      `);

      // Process the results to handle JSON fields
      return result.rows.map(volunteer => {
        // Parse skills if it's a string
        if (volunteer.skills && typeof volunteer.skills === 'string') {
          try {
            volunteer.skills = JSON.parse(volunteer.skills);
          } catch (e) {
            console.error(`Error parsing skills for user ${volunteer.id}:`, e);
            volunteer.skills = [];
          }
        }
        
        // Parse disability if it's a string
        if (volunteer.disability && typeof volunteer.disability === 'string') {
          try {
            volunteer.disability = JSON.parse(volunteer.disability);
          } catch (e) {
            console.error(`Error parsing disability for user ${volunteer.id}:`, e);
            volunteer.disability = null;
          }
        }
        
        return volunteer;
      });
    } catch (error) {
      console.error('Error in getVolunteers:', error);
      throw new Error('Failed to fetch volunteers');
    }
  },
  
  async getVolunteerById(id) {
    try {
      const result = await db.query(`
        SELECT 
          id,
          name,
          email,
          phone,
          username,
          created_at,
          status,
          is_verified,
          date_of_birth,
          last_login,
          skills,
          disability,
          gender,
          skill_evidence  /* Add skill_evidence field */
        FROM users
        WHERE id = $1 AND role = 'volunteer'
      `, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const volunteer = result.rows[0];
      
      // Parse skills if it's a string
      if (volunteer.skills && typeof volunteer.skills === 'string') {
        try {
          volunteer.skills = JSON.parse(volunteer.skills);
        } catch (e) {
          console.error(`Error parsing skills for volunteer ${id}:`, e);
          volunteer.skills = [];
        }
      }
      
      // Parse disability if it's a string
      if (volunteer.disability && typeof volunteer.disability === 'string') {
        try {
          volunteer.disability = JSON.parse(volunteer.disability);
        } catch (e) {
          console.error(`Error parsing disability for volunteer ${id}:`, e);
          volunteer.disability = null;
        }
      }
      
      return volunteer;
    } catch (error) {
      console.error('Error in getVolunteerById:', error);
      throw new Error('Failed to fetch volunteer details');
    }
  },

  async updateVolunteer(id, updates) {
    try {
      // Process skills and disability fields if they exist
      let processedUpdates = { ...updates };
      
      // Convert skills array to JSON string if it's provided
      if (updates.skills && Array.isArray(updates.skills)) {
        processedUpdates.skills = JSON.stringify(updates.skills);
      }
      
      // Convert disability object to JSON string if it's provided
      if (updates.disability !== undefined) {
        // Handle null case properly
        processedUpdates.disability = updates.disability ? 
          JSON.stringify(updates.disability) : null;
      }
      
      // Build the update query dynamically based on available fields
      const updateFields = [];
      const values = [];
      let valueIndex = 1;

      // Add all fields that should be updated
      Object.entries(processedUpdates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          updateFields.push(`${key} = $${valueIndex}`);
          values.push(value);
          valueIndex++;
        }
      });

      // Add ID and role to values array
      values.push(id);

      // Skip update if no fields to update
      if (updateFields.length === 0) {
        const currentUser = await db.query(
          'SELECT id, name, email, username, phone, date_of_birth, status, is_verified, profile_photo, skills, disability, gender FROM users WHERE id = $1 AND role = $2',
          [id, 'volunteer']
        );
        return currentUser.rows[0];
      }

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${valueIndex} AND role = 'volunteer'
        RETURNING id, name, email, username, phone, date_of_birth, status, is_verified, profile_photo, skills, disability,gender
      `;

      const result = await db.query(query, values);
      
      // Process the result to parse JSON fields for the returned object
      if (result.rows.length > 0) {
        const volunteer = result.rows[0];
        
        // Parse skills if it's stored as a string
        if (volunteer.skills && typeof volunteer.skills === 'string') {
          try {
            volunteer.skills = JSON.parse(volunteer.skills);
          } catch (e) {
            console.error(`Error parsing skills for volunteer ${volunteer.id}:`, e);
            volunteer.skills = [];
          }
        }
        
        // Parse disability if it's stored as a string
        if (volunteer.disability && typeof volunteer.disability === 'string') {
          try {
            volunteer.disability = JSON.parse(volunteer.disability);
          } catch (e) {
            console.error(`Error parsing disability for volunteer ${volunteer.id}:`, e);
            volunteer.disability = null;
          }
        }
        
        return volunteer;
      }
      
      return null;
    } catch (error) {
      console.error('Error updating volunteer:', error);
      throw error;
    }
  },

  async deleteVolunteer(id) {
    try {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        
        // Delete event_feedback records
        await client.query('DELETE FROM event_feedback WHERE user_id = $1', [id]);
        
        // Delete dismissed_feedback records
        await client.query('DELETE FROM dismissed_feedback WHERE user_id = $1', [id]);
        
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
    try {
      const { 
        name, 
        username, 
        email, 
        password, 
        phone,
        date_of_birth, 
        status = 'active',
        is_verified = false,
        skills,
        disability,
        gender,
        skill_evidence, // Add skill evidence parameter
        first_name,
        middle_name,
        last_name,
        name_extension
      } = volunteerData;
      
      // Log what we're getting for skill_evidence
      console.log('Creating volunteer with skill_evidence:', skill_evidence);
      
      // Helper function to truncate strings to fit column limits
      const truncate = (value, maxLength) => {
        if (!value) return null;
        return typeof value === 'string' && value.length > maxLength 
          ? value.substring(0, maxLength) 
          : value;
      };
      
      // Process skills array to JSON string if needed
      const skillsJson = skills ? 
        (typeof skills === 'string' ? skills : JSON.stringify(skills)) : null;
      
      // Process disability to JSON string if needed
      const disabilityJson = disability ? 
        (typeof disability === 'string' ? disability : JSON.stringify(disability)) : null;
      
      // First check if the username or email already exists
      const existingUserResult = await db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );
      
      if (existingUserResult.rows.length > 0) {
        const error = new Error('Username or email already exists');
        error.status = 409;
        throw error;
      }
      
      // Log all values for debugging
      console.log('Volunteer field values before insertion:', {
        gender: gender ? `${gender} (length: ${gender.length})` : null,
        name_extension: name_extension ? `${name_extension} (length: ${name_extension.length})` : null,
        status: status ? `${status} (length: ${status.length})` : null
      });
      
      const result = await db.query(`
        INSERT INTO users (
          name, username, email, password, 
          phone, date_of_birth, role, status, 
          is_verified, created_at, skills, disability, gender,
          skill_evidence, first_name, middle_name, last_name, name_extension
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13, $14, $15, $16, $17) 
        RETURNING id, name, email, username, phone, date_of_birth, status, is_verified, skill_evidence
      `, [
        truncate(name, 100), 
        truncate(username, 50), 
        truncate(email, 100), 
        password, 
        truncate(phone, 20),
        date_of_birth, 
        'volunteer', 
        truncate(status, 10),  // Truncate status to 10 chars
        is_verified,
        skillsJson,
        disabilityJson,
        truncate(gender, 10),  // Truncate gender to 10 chars
        skill_evidence, 
        truncate(first_name, 50) || null,
        truncate(middle_name, 50) || null,
        truncate(last_name, 50) || null,
        truncate(name_extension, 10) || null  // Truncate name_extension to 10 chars
      ]);
      
      // Log the result after insertion
      console.log('Volunteer created in database with result:', result.rows[0]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating volunteer in model:', error);
      throw error;
    }
  },

  async bulkDeleteVolunteers(ids) {
    try {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        
        // Delete related records for all volunteers
        await client.query('DELETE FROM event_feedback WHERE user_id = ANY($1::int[])', [ids]);
        await client.query('DELETE FROM dismissed_feedback WHERE user_id = ANY($1::int[])', [ids]);
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
    try {
      // Get the scholar data with document_paths included
      const result = await db.query(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.name,
          u.first_name,
          u.middle_name,
          u.last_name,
          u.name_extension,
          u.phone,
          u.gender,
          u.date_of_birth,
          u.document_paths,  /* Add this field to include document paths */
          u.profile_photo,
          u.is_verified,
          u.status,
          u.last_login,
          u.address,
          u.guardian_name,
          u.guardian_phone,
          u.education_level,
          u.school,
          u.parents_income,
          u.created_at,
          u.role
          /* other fields as needed */
        FROM 
          users u
        WHERE 
          u.id = $1 AND u.role = 'scholar'
      `, [id]);

      if (result.rows.length === 0) return null;
      return result.rows[0];
    } catch (error) {
      console.error('Error in getScholarById:', error);
      throw error;
    }
  },

  async createScholar(scholarData) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Check for required fields and apply column length limits
      const { 
        username, password, email, name,
        first_name, middle_name, last_name, name_extension,
        phone, status, is_verified, date_of_birth,
        gender, guardian_name, guardian_phone, address,
        education_level, school, parents_income,
        favorite_subject, favorite_activity, favorite_color, other_details,
        role, current_amount = 0, amount_needed = 0
      } = scholarData;

      // Ensure we have a password
      if (!password) {
        throw new Error('Password is required');
      }

      // Helper to truncate values that might exceed column limits
      const truncate = (val, maxLen) => {
        return typeof val === 'string' && val.length > maxLen ? val.substring(0, maxLen) : val;
      };
      
      // First create the user record
      const userResult = await client.query(`
        INSERT INTO users (
          username, password, email, name,
          first_name, middle_name, last_name, name_extension,
          phone, status, is_verified, date_of_birth,
          gender, guardian_name, guardian_phone, address,
          education_level, school, parents_income,
          role, created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
                $13, $14, $15, $16, $17, $18, $19, $20, NOW())
        RETURNING id, name, email, username, phone, date_of_birth, status, is_verified, 
                  first_name, last_name, gender, guardian_name, guardian_phone, 
                  address, education_level, school
      `, [
        truncate(username, 50),
        password,  // The password will be hashed in the controller
        truncate(email, 100),
        truncate(name, 100),
        truncate(first_name, 50),
        middle_name ? truncate(middle_name, 50) : null,
        truncate(last_name, 50),
        name_extension ? truncate(name_extension, 10) : null,
        truncate(phone, 20),
        truncate(status, 20),  // Increased to VARCHAR(20)
        is_verified,
        date_of_birth,
        truncate(gender, 20),  // Increased to VARCHAR(20)
        guardian_name ? truncate(guardian_name, 100) : null,
        guardian_phone ? truncate(guardian_phone, 20) : null,
        address ? truncate(address, 255) : null,
        education_level ? truncate(education_level, 50) : null,
        school ? truncate(school, 100) : null,
        parents_income ? truncate(parents_income, 50) : null,
        truncate(role, 20)  // Increased to VARCHAR(20)
      ]);
      
      const userId = userResult.rows[0].id;
      console.log('Created user record with ID:', userId);
      
      // Set scholar status based on verification status
      // If the user is verified, default scholar status to "inactive"
      // Otherwise, use the provided status or default to "active"
      const scholarStatus = is_verified === true ? 'inactive' : (status || 'active');
      console.log(`Setting scholar status to "${scholarStatus}" (is_verified: ${is_verified})`);
      
      // Then create the corresponding scholars record with the user_id
      await client.query(`
        INSERT INTO scholars (
          first_name, last_name, address, date_of_birth,
          grade_level, school, guardian_name, guardian_phone,
          gender, favorite_subject, favorite_activity, favorite_color,
          other_details, is_active, user_id, status, current_amount, amount_needed, created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
      `, [
        truncate(first_name || ''), 
        truncate(last_name || ''),
        address || null,
        date_of_birth || null,
        education_level || null,  // Map education_level to grade_level
        school || null,
        guardian_name || null,
        guardian_phone || null,
        gender || null,
        favorite_subject || null,
        favorite_activity || null,
        favorite_color || null,
        other_details || null,
        scholarStatus !== 'inactive', // Set is_active based on status
        userId,
        truncate(scholarStatus, 20),
        current_amount || 0,
        amount_needed || 0
      ]);

      // Fetch the complete scholar data with joined fields
      const finalResult = await client.query(`
        SELECT 
          u.id, u.name, u.email, u.username, u.phone, u.date_of_birth, 
          u.status, u.is_verified, u.first_name, u.last_name, u.gender,
          u.guardian_name, u.guardian_phone, u.address, u.education_level, 
          u.school, u.parents_income, s.id as scholar_id, s.favorite_subject, 
          s.favorite_activity, s.favorite_color, s.other_details, 
          s.current_amount, s.amount_needed, s.status as scholar_status,
          s.is_active
        FROM users u
        LEFT JOIN scholars s ON u.id = s.user_id
        WHERE u.id = $1
      `, [userId]);

      await client.query('COMMIT');
      return finalResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in createScholar:', error);
      throw error;
    } finally {
      client.release();
    }
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
      
      // Delete event_feedback records
      await client.query('DELETE FROM event_feedback WHERE user_id = $1', [id]);
      
      // Delete dismissed_feedback records
      await client.query('DELETE FROM dismissed_feedback WHERE user_id = $1', [id]);
      
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
        await client.query('DELETE FROM event_feedback WHERE user_id = ANY($1::integer[])', [numericIds]);
        await client.query('DELETE FROM dismissed_feedback WHERE user_id = ANY($1::integer[])', [numericIds]);
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
      
      // Check for associated donations
      const donationsResult = await client.query(
        'SELECT COUNT(*) FROM scholar_donations WHERE sponsor_id = $1',
        [id]
      );
      
      const donationsCount = parseInt(donationsResult.rows[0].count);
      
      // Handle associated donations - set sponsor_id to null
      if (donationsCount > 0) {
        // Option 1: Set sponsor_id to null (keeping the donations)
        await client.query('UPDATE scholar_donations SET sponsor_id = NULL WHERE sponsor_id = $1', [id]);
        
        // Alternative Option 2: Delete the donations (uncomment if you want to delete instead)
        // await client.query('DELETE FROM scholar_donations WHERE sponsor_id = $1', [id]);
      }
      
      // Delete event_feedback records
      await client.query('DELETE FROM event_feedback WHERE user_id = $1', [id]);
      
      // Delete dismissed_feedback records
      await client.query('DELETE FROM dismissed_feedback WHERE user_id = $1', [id]);
      
      // Delete related records
      await client.query('DELETE FROM notifications WHERE user_id = $1', [id]);
      await client.query('DELETE FROM notifications WHERE actor_id = $1', [id]);
      await client.query('DELETE FROM event_participants WHERE user_id = $1', [id]);
      
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
        
        // Handle associated donations - set sponsor_id to null
        await client.query('UPDATE scholar_donations SET sponsor_id = NULL WHERE sponsor_id = ANY($1::integer[])', [numericIds]);
        
        // Delete related records
        await client.query('DELETE FROM event_feedback WHERE user_id = ANY($1::integer[])', [numericIds]);
        await client.query('DELETE FROM dismissed_feedback WHERE user_id = ANY($1::integer[])', [numericIds]);
        await client.query('DELETE FROM notifications WHERE user_id = ANY($1::integer[])', [numericIds]);
        await client.query('DELETE FROM notifications WHERE actor_id = ANY($1::integer[])', [numericIds]);
        await client.query('DELETE FROM event_participants WHERE user_id = ANY($1::integer[])', [numericIds]);
        
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
  },

  // Add this new method or update an existing one to manage report cards with grade level
  async getReportCardsByGradeLevel(gradeLevel) {
    try {
      const result = await db.query(`
        SELECT rc.*, 
               u.name as user_name, 
               u.email as user_email
        FROM report_cards rc
        LEFT JOIN users u ON rc.user_id = u.id
        WHERE rc.grade_level = $1
        ORDER BY rc.submitted_at DESC
      `, [gradeLevel]);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching report cards by grade level:', error);
      throw error;
    }
  },

  async getAllReportCardsWithGradeInfo() {
    try {
      const result = await db.query(`
        SELECT rc.*, 
               u.name as user_name, 
               u.email as user_email,
               u.profile_photo
        FROM report_cards rc
        LEFT JOIN users u ON rc.user_id = u.id
        ORDER BY 
          CASE 
            WHEN rc.grade_level LIKE 'grade1%' THEN 1
            WHEN rc.grade_level LIKE 'grade2%' THEN 2
            WHEN rc.grade_level LIKE 'grade3%' THEN 3
            WHEN rc.grade_level LIKE 'grade4%' THEN 4
            WHEN rc.grade_level LIKE 'grade5%' THEN 5
            WHEN rc.grade_level LIKE 'grade6%' THEN 6
            WHEN rc.grade_level LIKE 'grade7%' THEN 7
            WHEN rc.grade_level LIKE 'grade8%' THEN 8
            WHEN rc.grade_level LIKE 'grade9%' THEN 9
            WHEN rc.grade_level LIKE 'grade10%' THEN 10
            WHEN rc.grade_level LIKE 'grade11%' THEN 11
            WHEN rc.grade_level LIKE 'grade12%' THEN 12
            WHEN rc.grade_level LIKE 'college%' THEN 13
            ELSE 99
          END,
          rc.submitted_at DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching report cards with grade info:', error);
      throw error;
    }
  },

  // If you already have a method like this, update it to include grade_level
  async getReportCardStatistics() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_submissions,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'in_review' THEN 1 END) as in_review_count,
          COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_count,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
          json_object_agg(
            COALESCE(grade_level, 'unknown'), 
            (
              SELECT COUNT(*) 
              FROM report_cards rc2 
              WHERE COALESCE(rc2.grade_level, 'unknown') = COALESCE(rc1.grade_level, 'unknown')
            )
          ) as grade_distribution
        FROM report_cards rc1
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching report card statistics:', error);
      throw error;
    }
  }
};

module.exports = AdminModel;
