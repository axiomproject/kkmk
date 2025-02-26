const db = require('../config/db');

const EventModel = {
  async getAllEvents() {
    // Replace db.query with the already-using db.query (this is already correct)
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
        contact_phone,
        contact_email,
        start_time,
        end_time
      FROM events 
      ORDER BY date DESC
    `);
    
    // Add debug logging
    console.log('Raw events from database:', result.rows.map(e => ({
      id: e.id,
      title: e.title,
      image: e.image
    })));
    
    return result.rows;
  },

  async getEventById(id) {
    // Replace db.oneOrNone with db.query
    const result = await db.query('SELECT * FROM events WHERE id = $1', [id]);
    return result.rows.length ? result.rows[0] : null;
  },

  async createEvent(eventData) {
    const {
      title, date, location, description,
      totalVolunteers, currentVolunteers, status,
      contactPhone, contactEmail, startTime, endTime,
      imagePath, latitude, longitude
    } = eventData;

    // Replace db.one with db.query
    const result = await db.query(
      `INSERT INTO events (
        title, date, location, image, description,
        total_volunteers, current_volunteers, status,
        contact_phone, contact_email, start_time, end_time,
        latitude, longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        title, date, location, imagePath, description,
        parseInt(totalVolunteers) || 0,
        parseInt(currentVolunteers) || 0,
        status,
        contactPhone || '',
        contactEmail || '',
        startTime,
        endTime,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null
      ]
    );
    return result.rows[0];
  },

  async updateEvent(id, eventData) {
    const {
      title, date, location, description,
      totalVolunteers, currentVolunteers, status,
      contactPhone, contactEmail, startTime, endTime,
      imagePath, latitude, longitude
    } = eventData;

    // Create base array of values
    const values = [
      title,
      date,
      location,
      description,
      parseInt(totalVolunteers),
      parseInt(currentVolunteers),
      status,
      contactPhone,
      contactEmail,
      startTime,
      endTime,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null
    ];

    // Start building the query
    let query = `
      UPDATE events SET
        title = $1,
        date = $2,
        location = $3,
        description = $4,
        total_volunteers = $5,
        current_volunteers = $6,
        status = $7,
        contact_phone = $8,
        contact_email = $9,
        start_time = $10,
        end_time = $11,
        latitude = $12,
        longitude = $13,
        updated_at = CURRENT_TIMESTAMP
    `;

    // If there's a new image, add it to the query
    if (imagePath) {
      query += `, image = $${values.length + 1}`;
      values.push(imagePath);
    }

    // Add the WHERE clause with the ID at the end
    query += ` WHERE id = $${values.length + 1} RETURNING *`;
    values.push(id);  // Add the ID as the last parameter

    // Replace db.one with db.query
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async deleteEvent(id) {
    // Replace db.result with db.query
    const result = await db.query('DELETE FROM events WHERE id = $1', [id]);
    return result;
  },

  async joinEvent(eventId, userId) {
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

      // Add participant with ACTIVE status
      await client.query(
        'INSERT INTO event_participants(event_id, user_id, status) VALUES($1, $2, $3)',
        [eventId, userId, 'ACTIVE']
      );

      // Update current_volunteers count
      const updatedResult = await client.query(
        `UPDATE events 
         SET current_volunteers = current_volunteers + 1 
         WHERE id = $1 AND current_volunteers < total_volunteers 
         RETURNING *`,
        [eventId]
      );

      await client.query('COMMIT');
      return updatedResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async unjoinEvent(eventId, userId) {
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

      // Update current_volunteers count
      const updatedResult = await client.query(
        `UPDATE events 
         SET current_volunteers = current_volunteers - 1 
         WHERE id = $1 AND current_volunteers > 0
         RETURNING *`,
        [eventId]
      );

      await client.query('COMMIT');
      return updatedResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getEventParticipants(eventId) {
    // Replace db.any with db.query
    const result = await db.query(
      `SELECT 
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
       ORDER BY ep.joined_at DESC`,
      [eventId]
    );
    return result.rows;
  },

  async hasUserJoined(eventId, userId) {
    // Replace db.oneOrNone with db.query
    const result = await db.query(
      'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );
    return result.rows.length > 0;
  },

  async removeParticipant(eventId, userId) {
    // Replace db.tx with client transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
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
      return updatedResult.rows[0];
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
  }
};

module.exports = EventModel;