const db = require('../config/db');

// Add new methods for skill assignments
const EventModel = {
  async getAllEvents() {
    try {
      // Add debug log to trace the query execution
      console.log('Executing getAllEvents query...');
      
      // Make sure we're explicitly requesting skill_requirements
      const result = await db.query(`
        SELECT 
          id,
          title,
          date,
          description,
          location,
          image,
          latitude,
          longitude,
          status,
          created_at,
          total_volunteers,
          current_volunteers,
          total_scholars,
          current_scholars,
          contact_phone,
          contact_email,
          start_time,
          end_time,
          requirements,
          skill_requirements::text as skill_requirements
        FROM events 
        ORDER BY date DESC
      `);
      
      console.log(`Found ${result.rows.length} events`);
      
      // Process the result to parse JSON fields
      const events = result.rows.map(event => {
        const processedEvent = { ...event };
        
        // Parse skill_requirements JSON if it exists
        if (event.skill_requirements) {
          try {
            processedEvent.skill_requirements = JSON.parse(event.skill_requirements);
          } catch (e) {
            console.error(`Error parsing skill_requirements JSON for event ${event.id}:`, e);
            processedEvent.skill_requirements = [];
          }
        } else {
          processedEvent.skill_requirements = [];
        }
        
        return processedEvent;
      });
      
      return events;
    } catch (error) {
      console.error('Error in getAllEvents:', error);
      throw error;
    }
  },

  async getEventById(id) {
    try {
      const result = await db.query(`
        SELECT 
          *,
          skill_requirements::text as skill_requirements_text
        FROM events 
        WHERE id = $1
      `, [id]);
      
      if (result.rows.length > 0) {
        const event = result.rows[0];
        // Parse skill_requirements JSON if it exists
        if (event.skill_requirements_text) {
          try {
            event.skill_requirements = JSON.parse(event.skill_requirements_text);
          } catch (e) {
            console.error(`Error parsing skill_requirements JSON for event ${event.id}:`, e);
            event.skill_requirements = [];
          }
        } else {
          event.skill_requirements = [];
        }
        delete event.skill_requirements_text; // Remove the text version
        return event;
      }
      
      return null;
    } catch (error) {
      console.error('Error in getEventById:', error);
      throw error;
    }
  },

  async submitScholarFeedback(userId, eventId, feedback) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // First check if the scholar has already provided feedback for this event
      const existingFeedbackCheck = await client.query(`
        SELECT id FROM event_feedback
        WHERE event_id = $1 AND user_id = $2
      `, [eventId, userId]);
      
      if (existingFeedbackCheck.rows.length > 0) {
        throw new Error('You have already submitted feedback for this event');
      }
      
      // Insert event feedback
      const eventFeedbackResult = await client.query(`
        INSERT INTO event_feedback 
          (user_id, event_id, rating, comment, user_type)
        VALUES ($1, $2, $3, $4, 'scholar')
        RETURNING *
      `, [userId, eventId, feedback.eventRating, feedback.eventComment]);
      
      // Insert volunteer feedback
      const volunteerFeedbackResult = await client.query(`
        INSERT INTO scholar_volunteer_feedback
          (event_id, scholar_id, volunteer_comment)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [eventId, userId, feedback.volunteerComment]);
      
      await client.query('COMMIT');
      
      return {
        eventFeedback: eventFeedbackResult.rows[0],
        volunteerFeedback: volunteerFeedbackResult.rows[0],
        message: 'Feedback submitted successfully'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in submitScholarFeedback:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  async createEvent(eventData) {
    const {
      title, date, location, description,
      totalVolunteers, currentVolunteers, 
      totalScholars, currentScholars,
      status,
      contactPhone, contactEmail, startTime, endTime,
      image, latitude, longitude, requirements,
      skillRequirements
    } = eventData;

    // Parse skill requirements if it's a string
    let processedSkillRequirements = skillRequirements;
    if (typeof skillRequirements === 'string') {
      try {
        processedSkillRequirements = JSON.parse(skillRequirements);
      } catch (e) {
        console.error('Error parsing skill requirements JSON string:', e);
        processedSkillRequirements = null;
      }
    }

    const result = await db.query(`
      INSERT INTO events (
        title, date, location, image, description,
        total_volunteers, current_volunteers,
        total_scholars, current_scholars,
        status, contact_phone, contact_email,
        start_time, end_time, latitude, longitude,
        requirements, skill_requirements
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      title, date, location, image, description,
      parseInt(totalVolunteers) || 0,
      parseInt(currentVolunteers) || 0,
      parseInt(totalScholars) || 0,
      parseInt(currentScholars) || 0,
      status,
      contactPhone || '',
      contactEmail || '',
      startTime,
      endTime,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      requirements || '',
      processedSkillRequirements ? JSON.stringify(processedSkillRequirements) : null
    ]);

    return result.rows[0];
  },

  async updateEvent(id, eventData) {
    const {
      title, date, location, description,
      totalVolunteers, currentVolunteers,
      totalScholars, currentScholars,
      status,
      contactPhone, contactEmail, startTime, endTime,
      image, latitude, longitude, requirements,
      skillRequirements
    } = eventData;

    // Parse skill requirements if it's a string
    let processedSkillRequirements = skillRequirements;
    if (typeof skillRequirements === 'string') {
      try {
        processedSkillRequirements = JSON.parse(skillRequirements);
      } catch (e) {
        console.error('Error parsing skill requirements JSON string:', e);
        processedSkillRequirements = null;
      }
    }

    // Build the update query dynamically based on whether image is provided
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    // Helper function to add a field to the update query
    const addField = (fieldName, value) => {
      if (value !== undefined) {
        updateFields.push(`${fieldName} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    };

    // Add all fields that should be updated
    addField('title', title);
    addField('date', date);
    addField('location', location);
    addField('description', description);
    addField('total_volunteers', parseInt(totalVolunteers) || 0);
    addField('current_volunteers', parseInt(currentVolunteers) || 0);
    addField('total_scholars', parseInt(totalScholars) || 0);
    addField('current_scholars', parseInt(currentScholars) || 0);
    addField('status', status);
    addField('contact_phone', contactPhone || '');
    addField('contact_email', contactEmail || '');
    addField('start_time', startTime);
    addField('end_time', endTime);
    addField('latitude', latitude ? parseFloat(latitude) : null);
    addField('longitude', longitude ? parseFloat(longitude) : null);
    addField('requirements', requirements || '');
    addField('skill_requirements', processedSkillRequirements ? JSON.stringify(processedSkillRequirements) : null);

    // Only add image field if it's provided
    if (image !== undefined) {
      addField('image', image);
    }

    // Add the id as the last parameter
    values.push(id);

    const result = await db.query(`
      UPDATE events
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0];
  },

  async deleteEvent(id) {
    // Use a transaction to ensure all operations succeed or fail together
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Delete related records from dismissed_feedback
      await client.query('DELETE FROM dismissed_feedback WHERE event_id = $1', [id]);
      
      // Delete related records from event_feedback
      await client.query('DELETE FROM event_feedback WHERE event_id = $1', [id]);
      
      // Delete related records from event_participants
      await client.query('DELETE FROM event_participants WHERE event_id = $1', [id]);
      
      // Delete related records from event_locations (if exists)
      await client.query('DELETE FROM event_locations WHERE event_id = $1', [id]);
      
      // Finally delete the event itself
      const result = await client.query('DELETE FROM events WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in deleteEvent transaction:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Update this method to handle scholar role participants
  async joinEvent(eventId, userId, userRole) {
    // Replace db.tx with client transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Check if user has already joined
      const existingResult = await client.query(
        'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('You have already joined this event');
      }

      // Add participant with PENDING status
      await client.query(
        'INSERT INTO event_participants(event_id, user_id, status) VALUES($1, $2, $3)',
        [eventId, userId, 'PENDING']
      );

      // Update counts based on user role
      let updateQuery;
      if (userRole === 'scholar') {
        updateQuery = `
          UPDATE events 
          SET current_scholars = current_scholars + 1 
          WHERE id = $1 AND current_scholars < total_scholars 
          RETURNING *`;
      } else {
        updateQuery = `
          UPDATE events 
          SET current_volunteers = current_volunteers + 1 
          WHERE id = $1 AND current_volunteers < total_volunteers 
          RETURNING *`;
      }

      const updatedResult = await client.query(updateQuery, [eventId]);

      await client.query('COMMIT');
      return updatedResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Update this method to handle scholar role participants
  async unjoinEvent(eventId, userId, userRole) {
    // Replace db.tx with client transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Check if user has joined
      const existingResult = await client.query(
        'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      if (existingResult.rows.length === 0) {
        throw new Error('You have not joined this event');
      }

      // Remove participant
      await client.query(
        'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      // Update counts based on user role
      let updateQuery;
      if (userRole === 'scholar') {
        updateQuery = `
          UPDATE events 
          SET current_scholars = current_scholars - 1 
          WHERE id = $1 AND current_scholars > 0
          RETURNING *`;
      } else {
        updateQuery = `
          UPDATE events 
          SET current_volunteers = current_volunteers - 1 
          WHERE id = $1 AND current_volunteers > 0
          RETURNING *`;
      }

      const updatedResult = await client.query(updateQuery, [eventId]);

      await client.query('COMMIT');
      return updatedResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getEventParticipants(eventId, includeDetails = false) {
    let query;
    
    if (includeDetails) {
      query = `
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.phone as phone,
          u.profile_photo,
          ep.joined_at,
          ep.status,
          u.skills,
          u.disability
        FROM event_participants ep 
        JOIN users u ON ep.user_id = u.id 
        WHERE ep.event_id = $1 
        ORDER BY ep.joined_at DESC
      `;
    } else {
      query = `
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.phone as phone,
          u.profile_photo,
          ep.joined_at,
          ep.status
        FROM event_participants ep 
        JOIN users u ON ep.user_id = u.id 
        WHERE ep.event_id = $1 
        ORDER BY ep.joined_at DESC
      `;
    }
    
    const result = await db.query(query, [eventId]);
    
    // Process the results to parse JSON fields
    return result.rows.map(participant => {
      // Parse skills JSON if it exists
      if (participant.skills && typeof participant.skills === 'string') {
        try {
          participant.skills = JSON.parse(participant.skills);
        } catch (e) {
          console.error('Error parsing skills JSON:', e);
          participant.skills = null;
        }
      }
      
      // Parse disability JSON if it exists
      if (participant.disability && typeof participant.disability === 'string') {
        try {
          participant.disability = JSON.parse(participant.disability);
        } catch (e) {
          console.error('Error parsing disability JSON:', e);
          participant.disability = null;
        }
      }
      
      return participant;
    });
  },

  async hasUserJoined(eventId, userId) {
    // Replace db.oneOrNone with db.query
    const result = await db.query(
      'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );
    return result.rows.length > 0;
  },

  async removeParticipant(eventId, userId, reason, actor) {
    // Replace db.tx with client transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // First get event and participant details for notification
      const eventResult = await client.query(
        'SELECT title FROM events WHERE id = $1',
        [eventId]
      );
      
      if (eventResult.rows.length === 0) {
        throw new Error('Event not found');
      }
      
      const eventTitle = eventResult.rows[0].title;
      
      // Get user email for notification
      const userResult = await client.query(
        'SELECT name, email FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const user = userResult.rows[0];
      
      // Check if participant exists
      const participantResult = await client.query(
        'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      if (participantResult.rows.length === 0) {
        throw new Error('Participant not found in this event');
      }

      // Remove participant
      await client.query(
        'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      // Update current_volunteers count
      const updatedResult = await client.query(
        `UPDATE events 
         SET current_volunteers = current_volunteers - 1 
         WHERE id = $1 AND current_volunteers > 0
         RETURNING *`,
        [eventId]
      );

      await client.query('COMMIT');
      
      // Return both the updated event and user info for notifications
      return {
        event: updatedResult.rows[0],
        user: {
          id: userId,
          name: user.name,
          email: user.email
        },
        eventTitle
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async bulkRemoveParticipants(eventId, userIds, reason, actor) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Get event details for notification
      const eventResult = await client.query(
        'SELECT title FROM events WHERE id = $1',
        [eventId]
      );
      
      if (eventResult.rows.length === 0) {
        throw new Error('Event not found');
      }
      
      const eventTitle = eventResult.rows[0].title;
      
      // Get users info for notifications
      const usersResult = await client.query(
        'SELECT id, name, email FROM users WHERE id = ANY($1)',
        [userIds]
      );
      
      if (usersResult.rows.length === 0) {
        throw new Error('No valid users found');
      }
      
      const users = usersResult.rows;
      
      // Check if participants exist
      const participantsResult = await client.query(
        'SELECT user_id FROM event_participants WHERE event_id = $1 AND user_id = ANY($2)',
        [eventId, userIds]
      );

      if (participantsResult.rows.length === 0) {
        throw new Error('No participants found in this event');
      }

      const validUserIds = participantsResult.rows.map(p => p.user_id);
      
      // Remove participants
      await client.query(
        'DELETE FROM event_participants WHERE event_id = $1 AND user_id = ANY($2)',
        [eventId, validUserIds]
      );

      // Update current_volunteers count
      const removedCount = validUserIds.length;
      const updatedResult = await client.query(
        `UPDATE events 
         SET current_volunteers = GREATEST(0, current_volunteers - $1)
         WHERE id = $2
         RETURNING *`,
        [removedCount, eventId]
      );

      await client.query('COMMIT');
      
      // Return the updated event and removed users info for notifications
      return {
        event: updatedResult.rows[0],
        users: users.filter(u => validUserIds.includes(u.id)),
        removedCount,
        eventTitle
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getVolunteers() {
    try {
      // This is already using db.query correctly
      const result = await db.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.phone,
          u.profile_photo
        FROM users u
        WHERE u.role = 'volunteer'
        ORDER BY u.name ASC
      `);
      return result.rows;
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch volunteers');
    }
  },

  async addVolunteer(eventId, volunteerId) {
    // Replace db.tx with client transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Check if volunteer exists
      const volunteerResult = await client.query(
        'SELECT * FROM users WHERE id = $1 AND role = $2',
        [volunteerId, 'volunteer']
      );

      if (volunteerResult.rows.length === 0) {
        throw new Error('Volunteer not found');
      }

      // Check if volunteer is already in the event
      const existingResult = await client.query(
        'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, volunteerId]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('Volunteer is already added to this event');
      }

      // Check if event has space for more volunteers
      const eventResult = await client.query(
        'SELECT * FROM events WHERE id = $1',
        [eventId]
      );
      
      const event = eventResult.rows[0];

      if (event.current_volunteers >= event.total_volunteers) {
        throw new Error('Event has reached maximum volunteer capacity');
      }

      // Add participant with PENDING status
      await client.query(
        'INSERT INTO event_participants(event_id, user_id, status) VALUES($1, $2, $3)',
        [eventId, volunteerId, 'PENDING']
      );

      // Update current_volunteers count and return updated event
      const updatedEventResult = await client.query(
        `UPDATE events 
         SET current_volunteers = current_volunteers + 1 
         WHERE id = $1 
         RETURNING *`,
        [eventId]
      );

      await client.query('COMMIT');
      return updatedEventResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getCompletedEventsNeedingFeedback(userId) {
    // Replace db.any with db.query
    const result = await db.query(`
      SELECT 
        e.id,
        e.title,
        e.date,
        e.end_time,
        ep.user_id
      FROM events e
      JOIN event_participants ep ON e.id = ep.event_id
      LEFT JOIN event_feedback ef ON e.id = ef.event_id AND ep.user_id = ef.user_id
      WHERE ep.user_id = $1
      AND ef.id IS NULL
      AND e.date + e.end_time::time < CURRENT_TIMESTAMP
      AND ep.status = 'ACTIVE'
    `, [userId]);
    return result.rows;
  },

  async submitEventFeedback(userId, eventId, feedback) {
    // Replace db.one with db.query
    const result = await db.query(`
      INSERT INTO event_feedback 
        (user_id, event_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, eventId, feedback.rating, feedback.comment]);
    return result.rows[0];
  },

  async getEventParticipantSkills(eventId) {
    try {
      const result = await db.query(`
        SELECT 
          eps.user_id, 
          eps.skill, 
          eps.assigned_at,
          u.name as user_name
        FROM event_participant_skills eps
        JOIN users u ON eps.user_id = u.id
        WHERE eps.event_id = $1
        ORDER BY eps.assigned_at DESC
      `, [eventId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error in getEventParticipantSkills:', error);
      throw error;
    }
  },

  async assignSkillToParticipant(eventId, userId, skill, assignedBy) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Check if the participant exists and is ACTIVE
      const participantCheck = await client.query(`
        SELECT status FROM event_participants 
        WHERE event_id = $1 AND user_id = $2
      `, [eventId, userId]);
      
      if (participantCheck.rows.length === 0) {
        throw new Error('Participant not found for this event');
      }
      
      if (participantCheck.rows[0].status !== 'ACTIVE') {
        throw new Error('Can only assign skills to approved participants');
      }
      
      // If skill is null or empty, remove any assignment
      if (!skill) {
        await client.query(`
          DELETE FROM event_participant_skills
          WHERE event_id = $1 AND user_id = $2
        `, [eventId, userId]);
        
        await client.query('COMMIT');
        return { removed: true };
      }
      
      // Check if the skill is valid for this event
      const eventCheck = await client.query(`
        SELECT skill_requirements FROM events WHERE id = $1
      `, [eventId]);
      
      if (eventCheck.rows.length === 0) {
        throw new Error('Event not found');
      }
      
      let skillRequirements = [];
      if (eventCheck.rows[0].skill_requirements) {
        try {
          if (typeof eventCheck.rows[0].skill_requirements === 'string') {
            skillRequirements = JSON.parse(eventCheck.rows[0].skill_requirements);
          } else {
            skillRequirements = eventCheck.rows[0].skill_requirements;
          }
        } catch (e) {
          console.error('Error parsing skill requirements:', e);
        }
      }
      
      // If event has skill requirements, validate the skill
      if (skillRequirements.length > 0) {
        const isValidSkill = skillRequirements.some(req => req.skill === skill);
        if (!isValidSkill) {
          throw new Error('Invalid skill for this event');
        }
        
        // Check if there's still capacity for this skill
        const currentCount = await client.query(`
          SELECT COUNT(*) FROM event_participant_skills
          WHERE event_id = $1 AND skill = $2 AND user_id != $3
        `, [eventId, skill, userId]);
        
        const skillRequirement = skillRequirements.find(req => req.skill === skill);
        if (skillRequirement && parseInt(currentCount.rows[0].count) >= skillRequirement.count) {
          throw new Error('Skill position is already at maximum capacity');
        }
      }
      
      // Upsert the skill assignment
      const result = await client.query(`
        INSERT INTO event_participant_skills (event_id, user_id, skill, assigned_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (event_id, user_id) 
        DO UPDATE SET 
          skill = $3, 
          assigned_at = CURRENT_TIMESTAMP,
          assigned_by = $4
        RETURNING *
      `, [eventId, userId, skill, assignedBy]);
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getParticipantSkillCounts(eventId) {
    try {
      const result = await db.query(`
        SELECT skill, COUNT(*) as count
        FROM event_participant_skills
        WHERE event_id = $1
        GROUP BY skill
      `, [eventId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error in getParticipantSkillCounts:', error);
      throw error;
    }
  }
};

module.exports = EventModel;