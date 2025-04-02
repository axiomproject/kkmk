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

const sendReportCardVerificationEmail = async (recipientEmail, recipientName, gradingPeriod) => {
  try {
    const mailOptions = {
      from: {
        name: 'KKMK Support',
        address: process.env.EMAIL_USER
      },
      to: recipientEmail,
      subject: 'Your Report Card Has Been Verified ✅',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4CAF50;">Report Card Verified!</h1>
          
          <p>Dear ${recipientName},</p>
          
          <p>Great news! Your report card for the ${formatGradingPeriod(gradingPeriod)} has been verified successfully.</p>
          
          <p>Details:</p>
          <ul>
            <li>Status: <strong style="color: #4CAF50;">Verified</strong></li>
            <li>Grading Period: <strong>${formatGradingPeriod(gradingPeriod)}</strong></li>
            <li>Verification Date: ${new Date().toLocaleDateString()}</li>
          </ul>
          
          <p>Thank you for keeping your academic records up to date.</p>
          
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Report card verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending report card verification email:', error);
    // Don't throw - we don't want to interrupt the verification process
    return null;
  }
};

// Helper function to format grading period
const formatGradingPeriod = (period) => {
  const periodMap = {
    '1st': 'First Grading',
    '2nd': 'Second Grading',
    '3rd': 'Third Grading',
    '4th': 'Fourth Grading',
    '1st_sem': 'First Semester',
    '2nd_sem': 'Second Semester',
    '3rd_sem': 'Third Semester'
  };
  return periodMap[period] || period;
};


// Add new function for pending participation notifications
const sendParticipantPendingEmail = async (email, name, eventTitle, eventDate) => {
  // Format the date for display
  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const mailOptions = {
    from: {
      name: 'KKMK Events',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: `Your participation request for "${eventTitle}" is pending approval`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Thank you, ${name}!</h1>
        <p>Your request to join the event <strong>"${eventTitle}"</strong> on <strong>${formattedDate}</strong> has been received.</p>
        <p>Your participation is currently <strong style="color: #FF9800;">pending approval</strong> from our administrators.</p>
        <p>We'll notify you once your request has been reviewed. This usually takes 1-2 business days.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/events" 
             style="background-color: #4CAF50; 
                    color: white; 
                    padding: 12px 25px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    font-weight: bold;">
            View All Events
          </a>
        </div>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Thank you for your interest in volunteering!</p>
        
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Pending participation email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending pending participation email:', error);
    throw error;
  }
};

const sendDonationSubmissionEmail = async (email, donorName, items, submissionDate) => {
  const formattedDate = new Date(submissionDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });

  const itemsList = items.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity} ${item.unit}(s)</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.category}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.type === 'regular' ? 'Regular' : 'In-kind'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.frequency || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : 'N/A'}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: {
      name: 'KMFI Foundation',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Donation Form Submitted Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4CAF50;">Thank You for Your Donation!</h1>
        
        <p>Dear ${donorName},</p>
        
        <p>Your donation form was successfully submitted on ${formattedDate}.</p>
        
        <h3>Donated Items:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; border: 1px solid #ddd;">Item</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Quantity</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Category</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Type</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Frequency</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Expiration Date</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Next Steps:</h4>
          <ol>
            <li>Our team will review your donation within 1-2 business days.</li>
            <li>You will receive another email once your items are received at our foundation.</li>
            <li>For in-kind donations, please ensure items are properly packaged for delivery.</li>
          </ol>
        </div>

        <p><strong>Note:</strong> Expected processing time is 2-3 business days from the date of verification.</p>
        
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          If you have any questions about your donation, please contact us.<br>
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Donation submission email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending donation submission email:', error);
    return null;
  }
};

const sendDonationItemVerificationEmail = async (email, donorName, items, verificationDate) => {
  const formattedDate = new Date(verificationDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });

  const itemsList = items.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.item}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity} ${item.unit}(s)</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.category}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.type === 'regular' ? 'Regular' : 'In-kind'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.frequency || 'N/A'}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: {
      name: 'KMFI Foundation',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Your Donated Items Have Been Received',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4CAF50;">Donation Received!</h1>
        
        <p>Dear ${donorName},</p>
        
        <p>We're pleased to inform you that your donated items have been received and verified at our foundation on ${formattedDate}.</p>
        
        <h3>Verified Items:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; border: 1px solid #ddd;">Item</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Quantity</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Category</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Type</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Frequency</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <p>Your generous donation will help support our community programs and those in need.</p>

        <p>We truly appreciate your support and contribution to our cause.</p>

        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          For any inquiries about your donation, please contact us.<br>
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Donation verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending donation verification email:', error);
    return null;
  }
};

const sendDonationItemRejectionEmail = async (email, donorName, items, rejectionReason) => {
  const itemsList = items.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.item}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity} ${item.unit}(s)</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.category}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.type === 'regular' ? 'Regular' : 'In-kind'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.frequency || 'N/A'}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: {
      name: 'KMFI Foundation',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Important Update: Your Donation Status',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #D32F2F;">Donation Status Update</h1>
        
        <p>Dear ${donorName},</p>
        
        <p>We regret to inform you that we are unable to accept the following donated items at this time:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; border: 1px solid #ddd;">Item</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Quantity</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Category</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Type</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Frequency</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Reason for Rejection:</h4>
          <p>${rejectionReason}</p>
        </div>

        <p>We sincerely appreciate your intention to support our cause. If you would like to discuss alternative donation options or have any questions, please don't hesitate to contact us.</p>

        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          For any inquiries about your donation status, please contact us.<br>
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Donation rejection email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending donation rejection email:', error);
    return null;
  }
};

const sendDistributionNotificationEmail = async (email, scholarName, items, distributionId) => {
  const itemsList = items.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity} ${item.unit}(s)</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.category}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.type === 'regular' ? 'Regular' : 'In-kind'}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: {
      name: 'KMFI Foundation',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'New Items Distribution Notice',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4CAF50;">Items Distribution Notice</h1>
        
        <p>Dear ${scholarName},</p>
        
        <p>The following items have been distributed to you:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; border: 1px solid #ddd;">Item</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Quantity</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Category</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Type</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Important:</h4>
          <p>Please verify receipt of these items by logging into your account and following these steps:</p>
          <ol>
            <li>Go to your Profile</li>
            <li>Find this distribution under "Items Received"</li>
            <li>Click "Verify Receipt" if you received the items</li>
            <li>Or click "Report Issue" if there are any problems</li>
          </ol>
        </div>

        <p><strong>Distribution ID:</strong> #${distributionId}</p>
        <p><strong>Note:</strong> Please verify receipt within 48 hours of receiving this notification.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/profile" 
             style="background-color: #4CAF50; 
                    color: white; 
                    padding: 12px 25px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    font-weight: bold;">
            Go to Profile
          </a>
        </div>

        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          If you have any questions about these items, please contact us.<br>
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Distribution notification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending distribution notification email:', error);
    throw error;
  }
};

const sendDistributionVerificationEmail = async (adminEmail, scholarName, status, message, distributionId) => {
  const mailOptions = {
    from: {
      name: 'KMFI Foundation',
      address: process.env.EMAIL_USER
    },
    to: adminEmail,
    subject: `Distribution Verification Update - ${status.toUpperCase()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${status === 'received' ? '#4CAF50' : '#f44336'};">
          Distribution ${status === 'received' ? 'Received' : 'Issue Reported'}
        </h1>
        
        <p>Scholar <strong>${scholarName}</strong> has ${
          status === 'received' ? 'confirmed receipt' : 'reported an issue'
        } for distribution #${distributionId}.</p>
        
        ${message ? `
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0;">Message from Scholar:</h4>
            <p>${message}</p>
          </div>
        ` : ''}
        
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated notification. Please check the admin dashboard for more details.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Distribution verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending distribution verification email:', error);
    throw error;
  }
};

const sendDistributionDetailedVerificationEmail = async (adminEmail, scholarName, status, message, distributionId, itemDetails) => {
  const statusText = status === 'received' ? 'verified receipt of' : 'reported an issue with';
  const emailSubject = `Distribution Verification Update - ${scholarName}`;
  
  const htmlContent = `
    <h2>Distribution Verification Update</h2>
    <p>Scholar ${scholarName} has ${statusText} their distribution.</p>
    
    <h3>Distribution Details:</h3>
    <ul>
      <li>Item: ${itemDetails.itemName}</li>
      <li>Quantity: ${itemDetails.quantity} ${itemDetails.unit}</li>
      <li>Status: ${status}</li>
      ${message ? `<li>Message: ${message}</li>` : ''}
    </ul>

    <p>Distribution ID: ${distributionId}</p>
  `;

  await sendMail(adminEmail, emailSubject, htmlContent);
};

// Add a new function to send donation certificate
const sendDonationCertificateEmail = async (email, donorName, scholarName, amount, donationDate, donationId, isGeneralDonation = false) => {
  try {
    // Format the amount with currency symbol
    const formattedAmount = typeof amount === 'number' 
      ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
      : `₱${amount}`; // Fallback if amount is a string
    
    // Format the date in a nicer way
    const formattedDate = new Date(donationDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Current year for the certificate
    const currentYear = new Date().getFullYear();
    
    // Adjust the email subject and content based on the donation type
    const donationType = isGeneralDonation ? 'Monetary Donation' : 'Scholar Donation';
    
    const mailOptions = {
      from: {
        name: 'KMFI Donations',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `Your ${donationType} Certificate`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4CAF50;">Your Donation Certificate</h1>
          
          <p>Dear ${donorName},</p>
          
          <p>Thank you for your generous ${isGeneralDonation ? 'donation' : 'scholar donation'} to KMFI Foundation. 
          Attached to this email is your official Certificate of Donation for your contribution of 
          <strong>${formattedAmount}</strong>${!isGeneralDonation ? ` to support <strong>${scholarName}</strong>` : ''}.</p>
          
          <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
            <p style="font-size: 18px; margin: 0;">Thank you for making a difference!</p>
          </div>
          
          <p>Your certificate serves as an official record of your charitable contribution. 
          If you have any questions regarding your donation or certificate, please don't hesitate to contact us.</p>
          
          <p>With gratitude,<br/>
          The KMFI Team</p>
          
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Donation Reference: #${donationId}<br/>
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `KMFI_${isGeneralDonation ? 'Donation' : 'Scholar_Donation'}_Certificate_${donationId}.pdf`,
          content: await generateDonationCertificatePDF(donorName, scholarName, amount, formattedDate, donationId, currentYear, isGeneralDonation)
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Donation certificate email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending donation certificate email:', error);
    throw error;
  }
};

// Helper function to generate the PDF certificate
const generateDonationCertificatePDF = async (donorName, scholarName, amount, donationDate, donationId, year, isGeneralDonation = false) => {
  try {
    // Use PDFKit to generate the PDF
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');
    const { Buffer } = require('buffer');

    // Format the amount for display with proper Philippine Peso sign
    const formattedAmount = typeof amount === 'number' 
      ? `PHP ${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(amount)}`
      : `PHP ${amount}`;

    // Only extract first name if this is a scholar donation
    let scholarText = '';
    if (!isGeneralDonation && scholarName) {
      // Try to extract first name only - take everything before the first space
      const nameParts = scholarName.trim().split(' ');
      if (nameParts.length > 0 && nameParts[0] !== 'undefined' && nameParts[0] !== 'null') {
        scholarText = `to support the education of ${nameParts[0]}`;
      } else {
        scholarText = `to support a KMFI Scholar`;
      }
    }

    console.log(`Generating ${isGeneralDonation ? 'general' : 'scholar'} donation certificate for ${donorName}`);

    return new Promise((resolve, reject) => {
      // Create a PDF document
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        layout: 'landscape'
      });

      // Buffer to store PDF data
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Page dimensions for reference
      const pageWidth = 792;  // Width of landscape letter
      const pageHeight = 612; // Height of landscape letter
      
      // Define colors for the certificate
      const primaryColor = '#4b2e83'; // Deep purple
      const secondaryColor = '#85754d'; // Gold
      const textColor = '#333333';
      
      // Create a decorative border - using standard methods instead of gradient
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
         .lineWidth(10)
         .stroke(secondaryColor);
         
      // Add a decorative inner border
      doc.rect(40, 40, pageWidth - 80, pageHeight - 80)
         .lineWidth(2)
         .stroke(primaryColor);
      
      // Try to load KMFI logo if available
      try {
        // Try different paths to find the logo
        const possiblePaths = [
          path.join(__dirname, '../../public/images/kmfi-logo.png'),
          path.join(__dirname, '../public/images/kmfi-logo.png'),
          path.join(__dirname, '../../frontend/public/images/kmfi-logo.png')
        ];
        
        let logoPath = null;
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            logoPath = p;
            break;
          }
        }

        if (logoPath) {
          // Calculate the center position (x) based on the page width
          const logoWidth = 120; // Set desired logo width
          const centerX = (pageWidth - logoWidth) / 2;
          
          // Place the logo at the top center
          doc.image(logoPath, centerX, 50, { width: logoWidth });
        } else {
          console.warn('Could not find logo image in any expected locations');
        }
      } catch (err) {
        console.warn('Could not load logo image:', err);
      }

      // Add decorative elements
      // Left corner ornament
      doc.circle(60, 60, 15)
         .fillAndStroke(secondaryColor, primaryColor);
         
      // Right corner ornament
      doc.circle(pageWidth - 60, 60, 15)
         .fillAndStroke(secondaryColor, primaryColor);
         
      // Bottom left corner ornament
      doc.circle(60, pageHeight - 60, 15)
         .fillAndStroke(secondaryColor, primaryColor);
         
      // Bottom right corner ornament
      doc.circle(pageWidth - 60, pageHeight - 60, 15)
         .fillAndStroke(secondaryColor, primaryColor);

      // Certificate title with stylish underline
      doc.font('Helvetica-Bold')
         .fontSize(32)
         .fillColor(primaryColor)
         .text('CERTIFICATE OF DONATION', 0, 130, { align: 'center' });
         
      // Add decorative line under title
      const titleLineY = 170;
      doc.moveTo(pageWidth/2 - 180, titleLineY)
         .lineTo(pageWidth/2 + 180, titleLineY)
         .lineWidth(3)
         .stroke(secondaryColor);

      // Certificate body with elegant typography
      doc.font('Helvetica')
         .fontSize(16)
         .fillColor(textColor)
         .text('This is to certify that', 0, 190, { align: 'center' });
         
      doc.font('Helvetica-Bold')
         .fontSize(26)
         .fillColor(primaryColor)
         .text(donorName, 0, 220, { align: 'center' });
         
      doc.font('Helvetica')
         .fontSize(16)
         .fillColor(textColor)
         .text(`has generously donated ${formattedAmount} to`, 0, 260, { align: 'center' });
         
      doc.font('Helvetica-Bold')
         .fontSize(22)
         .fillColor(primaryColor)
         .text('KMFI Foundation', 0, 290, { align: 'center' });
      
      // Different text based on donation type
      if (!isGeneralDonation && scholarText) {
        doc.font('Helvetica')
           .fontSize(16)
           .fillColor(textColor)
           .text(scholarText, 0, 325, { align: 'center' });
      } else {
        // For general donations, add descriptive text
        doc.font('Helvetica')
           .fontSize(16)
           .fillColor(textColor)
           .text('to support programs for underprivileged communities', 0, 325, { align: 'center' });
      }
         
      doc.font('Helvetica')
         .fontSize(16)
         .fillColor(textColor)
         .text(`on ${donationDate}`, 0, 355, { align: 'center' });

      // Add a decorative line above signature
      const signatureLineY = 390;
      doc.moveTo(pageWidth/2 - 150, signatureLineY)
         .lineTo(pageWidth/2 + 150, signatureLineY)
         .lineWidth(1)
         .stroke(secondaryColor);

      // SIMPLIFIED SIGNATURE APPROACH - Just show the name without trying to draw a signature
      // Add the name directly
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor(primaryColor)
         .text('Evangeline T. Aquino', pageWidth/2, signatureLineY + 20, { align: 'center' });
         
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor(textColor)
         .text('Program Director', pageWidth/2, signatureLineY + 40, { align: 'center' });

      // Add decorative elements
      doc.circle(pageWidth/2, signatureLineY + 15, 8)
         .fill(secondaryColor);

      // Add certificate ID and date with stylish formatting
      doc.rect(50, 500, 300, 30)
         .fillColor('#f5f5f5')
         .fill();
         
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor(primaryColor)
         .text(`Certificate ID: DON-${donationId}`, 55, 510);

      // Add footer text with refined typography
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`© ${year} KMFI Foundation. All Rights Reserved.`, 0, 530, { align: 'center' });

      doc.fontSize(9)
         .fillColor('#888888')
         .text('This certificate is automatically generated and is valid without a signature.', 0, 550, { align: 'center' });

      // Finalize the PDF
      doc.end();
    });
  } catch (error) {
    console.error('Error generating donation certificate PDF:', error);
    throw error;
  }
};

// New function to send inventory certificate
const sendInventoryCertificateEmail = async (email, donorName, donationDetails, donationDate, donationId) => {
  try {
    // Format the date in a nicer way
    const formattedDate = new Date(donationDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Current year for the certificate
    const currentYear = new Date().getFullYear();
    
    const mailOptions = {
      from: {
        name: 'KMFI Donations',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `Your ${donationDetails.type} Donation Certificate`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4CAF50;">Your Donation Certificate</h1>
          
          <p>Dear ${donorName},</p>
          
          <p>Thank you for your generous donation to KMFI Foundation. 
          Attached to this email is your official Certificate of Donation for your contribution of 
          <strong>${donationDetails.quantity} ${donationDetails.unit} of ${donationDetails.itemName}</strong>
          (${donationDetails.category}).</p>
          
          <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
            <p style="font-size: 18px; margin: 0;">Thank you for making a difference!</p>
          </div>
          
          <p>Your certificate serves as an official record of your charitable contribution. 
          If you have any questions regarding your donation or certificate, please don't hesitate to contact us.</p>
          
          <p>With gratitude,<br/>
          The KMFI Team</p>
          
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Donation Reference: #${donationId}<br/>
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `KMFI_${donationDetails.type}_Donation_Certificate_${donationId}.pdf`,
          content: await generateInventoryCertificatePDF(
            donorName, 
            donationDetails, 
            formattedDate, 
            donationId, 
            currentYear
          )
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Inventory donation certificate email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending inventory donation certificate email:', error);
    throw error;
  }
};

// Helper function to generate the PDF certificate for inventory items
const generateInventoryCertificatePDF = async (donorName, donationDetails, donationDate, donationId, year) => {
  try {
    // Use PDFKit to generate the PDF
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');
    const { Buffer } = require('buffer');

    // Format the donation details for display
    const formattedDonation = `${donationDetails.quantity} ${donationDetails.unit} of ${donationDetails.itemName}`;
    
    return new Promise((resolve, reject) => {
      // Create a PDF document
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        layout: 'landscape'
      });

      // Buffer to store PDF data
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Page dimensions for reference
      const pageWidth = 792;  // Width of landscape letter
      const pageHeight = 612; // Height of landscape letter
      
      // Define colors for the certificate
      const primaryColor = '#4b2e83'; // Deep purple
      const secondaryColor = '#85754d'; // Gold
      const textColor = '#333333';
      
      // Create a decorative border - using standard methods instead of gradient
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
         .lineWidth(10)
         .stroke(secondaryColor);
         
      // Add a decorative inner border
      doc.rect(40, 40, pageWidth - 80, pageHeight - 80)
         .lineWidth(2)
         .stroke(primaryColor);
      
      // Try to load KMFI logo if available
      try {
        // Try different paths to find the logo
        const possiblePaths = [
          path.join(__dirname, '../../public/images/kmfi-logo.png'),
          path.join(__dirname, '../public/images/kmfi-logo.png'),
          path.join(__dirname, '../../frontend/public/images/kmfi-logo.png')
        ];
        
        let logoPath = null;
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            logoPath = p;
            break;
          }
        }

        if (logoPath) {
          // Calculate the center position (x) based on the page width
          const logoWidth = 120; // Set desired logo width
          const centerX = (pageWidth - logoWidth) / 2;
          
          // Place the logo at the top center
          doc.image(logoPath, centerX, 50, { width: logoWidth });
        } else {
          console.warn('Could not find logo image in any expected locations');
        }
      } catch (err) {
        console.warn('Could not load logo image:', err);
      }

      // Add decorative elements
      // Left corner ornament
      doc.circle(60, 60, 15)
         .fillAndStroke(secondaryColor, primaryColor);
         
      // Right corner ornament
      doc.circle(pageWidth - 60, 60, 15)
         .fillAndStroke(secondaryColor, primaryColor);
         
      // Bottom left corner ornament
      doc.circle(60, pageHeight - 60, 15)
         .fillAndStroke(secondaryColor, primaryColor);
         
      // Bottom right corner ornament
      doc.circle(pageWidth - 60, pageHeight - 60, 15)
         .fillAndStroke(secondaryColor, primaryColor);

      // Certificate title with stylish underline
      doc.font('Helvetica-Bold')
         .fontSize(32)
         .fillColor(primaryColor)
         .text('CERTIFICATE OF DONATION', 0, 130, { align: 'center' });
         
      // Add decorative line under title
      const titleLineY = 170;
      doc.moveTo(pageWidth/2 - 180, titleLineY)
         .lineTo(pageWidth/2 + 180, titleLineY)
         .lineWidth(3)
         .stroke(secondaryColor);

      // Certificate body with elegant typography
      doc.font('Helvetica')
         .fontSize(16)
         .fillColor(textColor)
         .text('This is to certify that', 0, 190, { align: 'center' });
         
      doc.font('Helvetica-Bold')
         .fontSize(26)
         .fillColor(primaryColor)
         .text(donorName, 0, 220, { align: 'center' });
         
      doc.font('Helvetica')
         .fontSize(16)
         .fillColor(textColor)
         .text(`has generously donated`, 0, 260, { align: 'center' });
         
      doc.font('Helvetica-Bold')
         .fontSize(22)
         .fillColor(primaryColor)
         .text(formattedDonation, 0, 285, { align: 'center' });
         
      doc.font('Helvetica')
         .fontSize(16)
         .fillColor(textColor)
         .text(`to`, 0, 315, { align: 'center' });
         
      doc.font('Helvetica-Bold')
         .fontSize(22)
         .fillColor(primaryColor)
         .text('KMFI Foundation', 0, 340, { align: 'center' });
         
      doc.font('Helvetica')
         .fontSize(16)
         .fillColor(textColor)
         .text(`on ${donationDate}`, 0, 370, { align: 'center' });

      // Add a decorative line above signature
      const signatureLineY = 410;
      doc.moveTo(pageWidth/2 - 150, signatureLineY)
         .lineTo(pageWidth/2 + 150, signatureLineY)
         .lineWidth(1)
         .stroke(secondaryColor);

      // SIMPLIFIED SIGNATURE APPROACH - Just show the name without trying to draw a signature
      // Add the name directly
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor(primaryColor)
         .text('Evangeline T. Aquino', pageWidth/2, signatureLineY + 20, { align: 'center' });
         
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor(textColor)
         .text('Program Director', pageWidth/2, signatureLineY + 40, { align: 'center' });

      // Add decorative elements
      doc.circle(pageWidth/2, signatureLineY + 15, 8)
         .fill(secondaryColor);

      // Add certificate ID and date with stylish formatting
      doc.rect(50, 500, 300, 30)
         .fillColor('#f5f5f5')
         .fill();
         
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor(primaryColor)
         .text(`Certificate ID: INV-${donationId}`, 55, 510);

      // Add donation category as a subtle watermark
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#e6e6e6')
         .text(`Category: ${donationDetails.category}`, pageWidth - 200, 510);

      // Add footer text with refined typography
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`© ${year} KMFI Foundation. All Rights Reserved.`, 0, 530, { align: 'center' });

      doc.fontSize(9)
         .fillColor('#888888')
         .text('This certificate is automatically generated and is valid without a signature.', 0, 550, { align: 'center' });

      // Finalize the PDF
      doc.end();
    });
  } catch (error) {
    console.error('Error generating inventory certificate PDF:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendParticipantApprovalEmail,
  sendParticipantRejectionEmail,
  sendParticipantRemovalEmail,
  sendParticipantPendingEmail,
  sendEventReminderEmail,
  sendLocationStatusEmail, // Add the new function to exports
  sendReportCardRenewalEmail, // Add the new function to exports
  sendDonationVerificationEmail, // Add the new function to exports
  sendDonationRejectionEmail, // Add the new export
  sendReportCardVerificationEmail, // Add the new export
  sendDonationSubmissionEmail,
  sendDonationItemVerificationEmail,
  sendDonationItemRejectionEmail,
  sendDistributionNotificationEmail, // Add the new export
  sendDistributionVerificationEmail, // Add the new export
  sendDistributionDetailedVerificationEmail, // Add the new detailed verification export
  sendDonationCertificateEmail, // Add the new function to exports
  sendInventoryCertificateEmail, // Add the new function to exports
  sendMail
};
