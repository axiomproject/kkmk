const express = require('express');
const router = express.Router();
const notificationModel = require('../models/notificationModel');
const emailService = require('../services/emailService');
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
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

router.post('/event-response', async (req, res) => {
  try {
    const notificationId = req.body.notificationId;
    const userId = parseInt(req.body.userId);
    const eventId = parseInt(req.body.eventId);
    const confirmed = req.body.confirmed;

    if (!notificationId || !userId || !eventId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { notificationId, userId, eventId, confirmed }
      });
    }

    const result = await notificationModel.handleEventResponse(
      notificationId, 
      userId, 
      eventId, 
      confirmed
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: error.message || 'Failed to process event response',
      details: error.toString()
    });
  }
});

router.get('/admin/:userId', async (req, res) => {
  try {
    if (!req.params.userId) {
      throw new Error('User ID is required');
    }
    const notifications = await notificationModel.getAdminNotifications(req.params.userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch admin notifications' });
  }
});

router.post('/admin/:userId/read-all', async (req, res) => {
  try {
    await notificationModel.markAllAdminAsRead(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark admin notifications as read' });
  }
});

// Add route for donation submission notifications
router.post('/donation-submission', async (req, res) => {
  try {
    const { email, donorName, items, submissionDate } = req.body;

    if (!email || !donorName || !items) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send email notification
    await emailService.sendDonationSubmissionEmail(
      email,
      donorName,
      items,
      submissionDate || new Date()
    );

    res.json({ success: true, message: 'Donation submission notification sent' });
  } catch (error) {
    console.error('Error sending donation submission notification:', error);
    res.status(500).json({ error: 'Failed to send donation submission notification' });
  }
});

// Add new route for donation verification notifications
router.post('/donation-verification', async (req, res) => {
  try {
    const { email, donorName, items, verificationDate } = req.body;

    if (!email || !donorName || !items) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send email notification
    await emailService.sendDonationItemVerificationEmail(
      email,
      donorName,
      items,
      verificationDate || new Date()
    );

    res.json({ success: true, message: 'Donation verification notification sent' });
  } catch (error) {
    console.error('Error sending donation verification notification:', error);
    res.status(500).json({ error: 'Failed to send donation verification notification' });
  }
});

// Add new route for donation rejection notifications
router.post('/donation-rejection', async (req, res) => {
  try {
    const { email, donorName, items, rejectionReason } = req.body;

    if (!email || !donorName || !items) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send email notification
    await emailService.sendDonationItemRejectionEmail(
      email,
      donorName,
      items,
      rejectionReason || 'No reason provided'
    );

    res.json({ success: true, message: 'Donation rejection notification sent' });
  } catch (error) {
    console.error('Error sending donation rejection notification:', error);
    res.status(500).json({ error: 'Failed to send donation rejection notification' });
  }
});

// Update the distribution notification route
router.post('/distribution-notification', async (req, res) => {
  try {
    const { email, scholarName, items, distributionId } = req.body;

    console.log('Received distribution notification request:', {
      email,
      scholarName,
      itemCount: items?.length,
      distributionId
    });

    // Validate required fields
    if (!email || !scholarName || !items || !distributionId) {
      console.error('Missing required fields:', { email, scholarName, items, distributionId });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Attempting to send email to:', email);

    try {
      // Send email notification
      const emailResult = await emailService.sendDistributionNotificationEmail(
        email,
        scholarName,
        items,
        distributionId
      );

      console.log('Email service response:', emailResult);

      // Create in-app notification
      const notificationResult = await notificationModel.createNotification({
        userId: items[0].recipientId,
        type: 'distribution',
        content: `You have received ${items.length} item(s) from the foundation.`,
        relatedId: distributionId,
        actorId: null,
        actorName: 'System',
        actorAvatar: '/images/notify-icon.png'
      });

      console.log('Notification created:', notificationResult);

      res.json({ 
        success: true, 
        message: 'Distribution notification sent',
        emailSent: true,
        notification: notificationResult 
      });
    } catch (emailError) {
      console.error('Detailed email sending error:', {
        error: emailError,
        stack: emailError.stack,
        message: emailError.message
      });

      // Still create in-app notification even if email fails
      const notificationResult = await notificationModel.createNotification({
        userId: items[0].recipientId,
        type: 'distribution',
        content: `You have received ${items.length} item(s) from the foundation.`,
        relatedId: distributionId,
        actorId: null,
        actorName: 'System',
        actorAvatar: '/images/notify-icon.png'
      });

      res.json({ 
        success: true,
        message: 'Distribution notification created but email failed',
        emailSent: false,
        notification: notificationResult,
        emailError: emailError.message
      });
    }
  } catch (error) {
    console.error('Distribution notification error:', {
      error,
      stack: error.stack,
      message: error.message
    });
    res.status(500).json({ 
      error: 'Failed to send distribution notification',
      details: error.message
    });
  }
});

// Add route for distribution verification status
router.post('/distribution-verification', async (req, res) => {
  try {
    const { distributionId, scholarId, status, message } = req.body;
    
    // Update distribution status
    await api.put(`/inventory/distributions/${distributionId}/status`, {
      status,
      message,
      scholarId
    });

    // Notify admin of verification
    await notificationModel.createAdminNotification({
      type: 'distribution_verification',
      content: `Scholar #${scholarId} has ${status} their distribution ${distributionId}`,
      relatedId: distributionId
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating distribution verification:', error);
    res.status(500).json({ error: 'Failed to update distribution verification' });
  }
});

module.exports = router;
