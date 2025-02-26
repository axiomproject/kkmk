const express = require('express');
const router = express.Router();
const notificationModel = require('../models/notificationModel');

// Remove debug middleware that logs routes
router.get('/user/:userId', async (req, res) => {  // Changed from /:userId to /user/:userId
  try {
    if (!req.params.userId) {
      throw new Error('User ID is required');
    }
    const notifications = await notificationModel.getUserNotifications(req.params.userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
});

router.post('/user/:userId/read-all', async (req, res) => {
  try {
    await notificationModel.markAllAsRead(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    // Remove console.error
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

router.post('/:id/read', async (req, res) => {
  try {
    await notificationModel.markAsRead(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { userId, type, content, relatedId } = req.body;
    let notification;

    switch (type) {
      case 'event_reminder':
        notification = await notificationModel.createNotification({
          userId,
          type,
          content,
          relatedId: relatedId,
          actorId: null,
          actorName: 'System',
          actorAvatar: '/images/notify-icon.png'
        });
        break;
      case 'location_verification':
      case 'location_remark':
        notification = type === 'location_verification' 
          ? await notificationModel.createLocationVerificationNotification(userId, content)
          : await notificationModel.createLocationRemarkNotification(userId, content);
        break;
      default:
        notification = await notificationModel.createNotification({
          userId,
          type,
          content,
          relatedId: relatedId || userId,
          actorId: null,
          actorName: 'System',
          actorAvatar: '/images/notify-icon.png'
        });
    }
    
    res.json(notification);
  } catch (error) {
    // Remove console.error
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

router.post('/send-bulk', async (req, res) => {
  try {
    const { userIds, type, content, relatedId } = req.body;
    
    const notifications = await Promise.all(
      userIds.map(userId =>
        notificationModel.createNotification({
          userId,
          type,
          content,
          relatedId,
          actorId: null,
          actorName: 'System',
          actorAvatar: '/images/notify-icon.png'
        })
      )
    );
    
    res.json({ success: true, count: notifications.length });
  } catch (error) {
    // Remove console.error
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

router.post('/event-response', async (req, res) => {
  try {
    // Remove debug logs
    const notificationId = req.body.notificationId;
    const userId = parseInt(req.body.userId);
    const eventId = parseInt(req.body.eventId);
    const confirmed = req.body.confirmed;

    // Validate inputs
    if (!notificationId || !userId || !eventId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { notificationId, userId, eventId, confirmed }
      });
    }

    // Remove debug logs
    const result = await notificationModel.handleEventResponse(
      notificationId, 
      userId, 
      eventId, 
      confirmed
    );

    res.json(result);
  } catch (error) {
    // Remove console.error
    res.status(500).json({ 
      error: error.message || 'Failed to process event response',
      details: error.toString()
    });
  }
});

module.exports = router;
