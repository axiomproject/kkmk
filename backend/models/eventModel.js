const db = require('../config/db');

const EventModel = {
  async getAllEvents() {
    const events = await db.query(`
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
    console.log('Raw events from database:', events.map(e => ({
      id: e.id,
      title: e.title,
      image: e.image
    })));
    
    return events;
  },

  async getEventById(id) {
    return await db.oneOrNone('SELECT * FROM events WHERE id = $1', [id]);
  },

  async createEvent(eventData) {
    const {
      title, date, location, description,
      totalVolunteers, currentVolunteers, status,
      contactPhone, contactEmail, startTime, endTime,
      imagePath, latitude, longitude // Add these fields
    } = eventData;

    return await db.one(
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
  },

  async updateEvent(id, eventData) {
    const {
      title, date, location, description,
      totalVolunteers, currentVolunteers, status,
      contactPhone, contactEmail, startTime, endTime,
      imagePath, latitude, longitude // Add these fields
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
      latitude ? parseFloat(latitude) : null, // Add latitude
      longitude ? parseFloat(longitude) : null // Add longitude
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

    return await db.one(query, values);
  },

  async deleteEvent(id) {
    return await db.result('DELETE FROM events WHERE id = $1', [id]);
  },

  async joinEvent(eventId, userId) {
    return await db.tx(async t => {
      // Check if user has already joined
      const existing = await t.oneOrNone(
        'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      if (existing) {
        throw new Error('You have already joined this event');
      }

      // Add participant with ACTIVE status
      await t.none(
        'INSERT INTO event_participants(event_id, user_id, status) VALUES($1, $2, $3)',
        [eventId, userId, 'ACTIVE']
      );

      // Update current_volunteers count
      const updated = await t.one(
        `UPDATE events 
         SET current_volunteers = current_volunteers + 1 
         WHERE id = $1 AND current_volunteers < total_volunteers 
         RETURNING *`,
        [eventId]
      );

      return updated;
    });
  },

  async unjoinEvent(eventId, userId) {
    return await db.tx(async t => {
      // Check if user has joined
      const existing = await t.oneOrNone(
        'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      if (!existing) {
        throw new Error('You have not joined this event');
      }

      // Remove participant
      await t.none(
        'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      // Update current_volunteers count
      const updated = await t.one(
        `UPDATE events 
         SET current_volunteers = current_volunteers - 1 
         WHERE id = $1 AND current_volunteers > 0
         RETURNING *`,
        [eventId]
      );

      return updated;
    });
  },

  async getEventParticipants(eventId) {
    return await db.any(
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
  },

  async hasUserJoined(eventId, userId) {
    const result = await db.oneOrNone(
      'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );
    return !!result;
  },

  async removeParticipant(eventId, userId) {
    return await db.tx(async t => {
      // Check if participant exists
      const participant = await t.oneOrNone(
        'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      if (!participant) {
        throw new Error('Participant not found in this event');
      }

      // Remove participant
      await t.none(
        'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      // Update current_volunteers count
      const updated = await t.one(
        `UPDATE events 
         SET current_volunteers = current_volunteers - 1 
         WHERE id = $1 AND current_volunteers > 0
         RETURNING *`,
        [eventId]
      );

      return updated;
    });
  },

  async getVolunteers() {
    try {
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
    return await db.tx(async t => {
      // Check if volunteer exists
      const volunteer = await t.oneOrNone(
        'SELECT * FROM users WHERE id = $1 AND role = $2',
        [volunteerId, 'volunteer']
      );

      if (!volunteer) {
        throw new Error('Volunteer not found');
      }

      // Check if volunteer is already in the event
      const existing = await t.oneOrNone(
        'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, volunteerId]
      );

      if (existing) {
        throw new Error('Volunteer is already added to this event');
      }

      // Check if event has space for more volunteers
      const event = await t.one(
        'SELECT * FROM events WHERE id = $1',
        [eventId]
      );

      if (event.current_volunteers >= event.total_volunteers) {
        throw new Error('Event has reached maximum volunteer capacity');
      }

      // Add participant with PENDING status
      await t.none(
        'INSERT INTO event_participants(event_id, user_id, status) VALUES($1, $2, $3)',
        [eventId, volunteerId, 'PENDING']
      );

      // Update current_volunteers count and return updated event
      const updatedEvent = await t.one(
        `UPDATE events 
         SET current_volunteers = current_volunteers + 1 
         WHERE id = $1 
         RETURNING *`,
        [eventId]
      );

      return updatedEvent;
    });
  },

  async getCompletedEventsNeedingFeedback(userId) {
    return await db.any(`
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
  },

  async submitEventFeedback(userId, eventId, feedback) {
    return await db.one(`
      INSERT INTO event_feedback 
        (user_id, event_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, eventId, feedback.rating, feedback.comment]);
  }
};

module.exports = EventModel;