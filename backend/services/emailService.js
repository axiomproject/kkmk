const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Test the connection
transporter.verify((error, success) => {
  if (error) {
    console.error('Email service error:', error);
  } else {
    console.log('Email service is ready to send messages');
  }
});

const sendVerificationEmail = async (email, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  
  const mailOptions = {
    from: {
      name: 'KKMK Support',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Verify Your KKMK Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to KKMK!</h1>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4CAF50; 
                    color: white; 
                    padding: 12px 25px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: {
      name: 'KKMK Support',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Reset Your KKMK Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4CAF50; 
                    color: white; 
                    padding: 12px 25px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

const sendParticipantApprovalEmail = async (email, name, eventTitle) => {
  const mailOptions = {
    from: {
      name: 'KKMK Events',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: `Your participation in "${eventTitle}" has been approved!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Good news, ${name}!</h1>
        <p>Your request to join the event <strong>"${eventTitle}"</strong> has been approved.</p>
        <p>You are now officially registered as a volunteer for this event.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/events" 
             style="background-color: #4CAF50; 
                    color: white; 
                    padding: 12px 25px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    font-weight: bold;">
            View Event Details
          </a>
        </div>
        <p>If you have any questions or need additional information, please contact us.</p>
        <p>Thank you for volunteering!</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Approval email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending approval email:', error);
    throw error;
  }
};

const sendParticipantRejectionEmail = async (email, name, eventTitle, reason) => {
  const mailOptions = {
    from: {
      name: 'KKMK Events',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: `Update on your participation in "${eventTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Hello ${name},</h1>
        <p>We regret to inform you that your request to join the event <strong>"${eventTitle}"</strong> was not approved at this time.</p>
        
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        
        <p>There could be various reasons for this, such as limited spots or specific volunteer requirements. Please don't be discouraged - we really appreciate your interest in volunteering with us.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/events" 
             style="background-color: #4CAF50; 
                    color: white; 
                    padding: 12px 25px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    font-weight: bold;">
            Explore Other Events
          </a>
        </div>
        
        <p>We hope to see you volunteer at one of our other upcoming events!</p>
        <p>Thank you for your understanding.</p>
        
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Rejection email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending rejection email:', error);
    throw error;
  }
};

const sendParticipantRemovalEmail = async (email, name, eventTitle, reason) => {
  const mailOptions = {
    from: {
      name: 'KKMK Events',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: `Update on your participation in "${eventTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Hello ${name},</h1>
        <p>We regret to inform you that you have been removed from the event <strong>"${eventTitle}"</strong>.</p>
        
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        
        <p>If you believe this was a mistake or have any questions, please contact our event organizers.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/events" 
             style="background-color: #4CAF50; 
                    color: white; 
                    padding: 12px 25px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    font-weight: bold;">
            Explore Other Events
          </a>
        </div>
        
        <p>We hope to see you at our other upcoming events!</p>
        <p>Thank you for your understanding.</p>
        
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Participant removal email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending participant removal email:', error);
    throw error;
  }
};

const sendEventReminderEmail = async (email, name, eventTitle, eventDate, eventLocation, eventTime, reminderType) => {
  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const timeString = eventTime ? formatTime(eventTime) : 'Check event details for time';
  const reminderText = reminderType === 'week' 
    ? 'is coming up in one week' 
    : 'is tomorrow';

  const mailOptions = {
    from: {
      name: 'KKMK Events',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: `Reminder: Your event "${eventTitle}" ${reminderText}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Hello ${name}!</h1>
        <p>We're sending you a friendly reminder that you're registered for an upcoming event:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #ff4015; margin-top: 0;">${eventTitle}</h2>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${timeString}</p>
          <p><strong>Location:</strong> ${eventLocation}</p>
        </div>
        
        <p>We look forward to seeing you there!</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/events" 
             style="background-color: #ff4015; 
                    color: white; 
                    padding: 12px 25px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    font-weight: bold;">
            View Event Details
          </a>
        </div>
        
        <p>Thank you for volunteering with KKMK!</p>
        
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated reminder. Please do not reply to this message.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Event reminder email sent to ${email}:`, info.messageId);
    return info;
  } catch (error) {
    console.error(`Error sending event reminder email to ${email}:`, error);
    throw error;
  }
};

// Helper function to format time
const formatTime = (time24h) => {
  if (!time24h) return '';
  const [hours, minutes] = time24h.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Add generic sendMail function for flexibility
const sendMail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: {
      name: 'KKMK Support',
      address: process.env.EMAIL_USER
    },
    to: to,
    subject: subject,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Add new function for location status notifications
const sendLocationStatusEmail = async (email, name, status, reason = null, visitDate = null) => {
  let subject, content;
  
  switch(status) {
    case 'verified':
      subject = 'Your Location Has Been Verified';
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Good news, ${name}!</h1>
          <p>Your location has been successfully verified by our team. ✅</p>
          <p>Thank you for providing your location details. This helps us better coordinate our support for you.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `;
      break;
    
    case 'rejected':
      subject = 'Action Required: Location Update Needed';
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Hello ${name},</h1>
          <p>We were unable to verify your current location. ❌</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>Please update your location through the app as soon as possible.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/profile" 
               style="background-color: #4CAF50; 
                      color: white; 
                      padding: 12px 25px; 
                      text-decoration: none; 
                      border-radius: 5px;
                      font-weight: bold;">
              Update Your Location
            </a>
          </div>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `;
      break;
    
    case 'remark':
      subject = 'Scheduled Visit Information';
      const formattedDate = new Date(visitDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Hello ${name},</h1>
          <p>We have scheduled a visit to your location on <strong>${formattedDate}</strong>. 📅</p>
          ${reason ? `<p><strong>Note:</strong> ${reason}</p>` : ''}
          <p>Please ensure you are available at your registered location on this date.</p>
          <p>If you have any questions or need to reschedule, please contact us as soon as possible.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `;
      break;
      
    default:
      subject = 'Update on Your Location Status';
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Hello ${name},</h1>
          <p>There has been an update regarding your location status.</p>
          <p>Please check your profile or notifications in the app for more information.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `;
  }

  const mailOptions = {
    from: {
      name: 'KKMK Support',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject,
    html: content
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Location status email sent to ${email}:`, info.messageId);
    return info;
  } catch (error) {
    console.error(`Error sending location status email to ${email}:`, error);
    throw error;
  }
};

// Add new function for report card renewal notifications
const sendReportCardRenewalEmail = async (recipientEmail, recipientName) => {
  try {
    const subject = 'Action Required: Submit Your New Report Card';
    const text = `Dear ${recipientName},

We're requesting you to submit a new report card with your current grade level information.

Please log in to your account and submit your new report card by following these steps:
1. Go to your profile
2. Click on "Submit Report Card"
3. Select your current grade level
4. Upload the front and back images of your new report card

Your previous report card history will remain in the system.

Thank you,
The KKMK Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EE3F24;">Action Required: Submit Your New Report Card</h2>
        <p>Dear ${recipientName},</p>
        <p>We're requesting you to submit a new report card with your current grade level information.</p>
        <p>Please log in to your account and submit your new report card by following these steps:</p>
        <ol>
          <li>Go to your profile</li>
          <li>Click on "Submit Report Card"</li>
          <li>Select your current grade level</li>
          <li>Upload the front and back images of your new report card</li>
        </ol>
        <p>Your previous report card history will remain in the system.</p>
        <p>Thank you,<br>The KKMK Team</p>
      </div>
    `;

    await sendMail(recipientEmail, subject, html);
    return true;
  } catch (error) {
    console.error('Error sending report card renewal email:', error);
    throw error;
  }
};

// Add this new function for donation verification emails
const sendDonationVerificationEmail = async (email, donorName, scholarName, amount, donationId) => {
  try {
    // Format the amount with currency symbol
    const formattedAmount = typeof amount === 'number' 
      ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
      : `₱${amount}`; // Fallback if amount is a string
    
    const mailOptions = {
      from: {
        name: 'KKMK Donations',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Your Donation Has Been Verified',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4CAF50;">Donation Verified!</h1>
          
          <p>Dear ${donorName},</p>
          
          <p>We're pleased to inform you that your donation of <strong>${formattedAmount}</strong> 
          for scholar <strong>${scholarName}</strong> has been verified and received.</p>
          
          <p>Your generosity makes a significant impact in helping our scholars pursue their education 
          and achieve their dreams.</p>
          
          <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
            <p style="font-size: 18px; margin: 0;">Thank you for your support!</p>
          </div>
          
          <p>If you have any questions about your donation or would like to know more about how your 
          contribution is helping, please don't hesitate to contact us.</p>
          
          <p>With gratitude,<br/>
          The KKMK Team</p>
          
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Donation Reference: #${donationId}<br/>
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Donation verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending donation verification email:', error);
    // Don't throw the error so it doesn't interrupt the verification process
    return null;
  }
};

// Add this new function for donation rejection emails
const sendDonationRejectionEmail = async (email, donorName, scholarName, amount, reason, donationId) => {
  try {
    // Format the amount with currency symbol
    const formattedAmount = typeof amount === 'number' 
      ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
      : `₱${amount}`; // Fallback if amount is a string
    
    const mailOptions = {
      from: {
        name: 'KKMK Donations',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Your Donation Status Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #D32F2F;">Donation Status Update</h1>
          
          <p>Dear ${donorName},</p>
          
          <p>We regret to inform you that your donation of <strong>${formattedAmount}</strong> 
          for scholar <strong>${scholarName}</strong> could not be processed at this time.</p>
          
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p>If you have any questions about this decision or would like to make a new donation, 
            please contact our support team. We're here to help!</p>
          </div>
          
          <p>Thank you for your interest in supporting our scholars. We appreciate your generosity and hope 
          you will consider supporting our cause in the future.</p>
          
          <p>Sincerely,<br/>
          The KKMK Team</p>
          
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Donation Reference: #${donationId}<br/>
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Donation rejection email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending donation rejection email:', error);
    // Don't throw the error so it doesn't interrupt the rejection process
    return null;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendParticipantApprovalEmail,
  sendParticipantRejectionEmail,
  sendParticipantRemovalEmail,
  sendEventReminderEmail,
  sendLocationStatusEmail, // Add the new function to exports
  sendReportCardRenewalEmail, // Add the new function to exports
  sendDonationVerificationEmail, // Add the new function to exports
  sendDonationRejectionEmail, // Add the new export
  sendMail
};
