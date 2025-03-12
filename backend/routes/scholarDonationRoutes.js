const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const authenticateToken = require('../middleware/authenticateToken');
const notificationModel = require('../models/notificationModel'); // Add this import
const notificationUtils = require('../utils/notificationUtils'); // Add this import
const emailService = require('../services/emailService'); // Add email service import

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/scholardonations';
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'donation-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Add debug middleware before routes
router.use((req, res, next) => {
    console.log('Scholar Donation Request:', {
        body: req.body,
        file: req.file,
        path: req.path
    });
    next();
});

// Get all scholar donations
router.get('/', async (req, res) => {
    try {
        // Replace db.query with pool.query format
        const result = await db.query('SELECT * FROM scholar_donations ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching scholar donations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all scholar donations with scholar details
router.get('/all', async (req, res) => {
    try {
        // Improved query to get donation details directly from users table
        const result = await db.query(`
            SELECT 
                sd.*,
                u.name as scholar_first_name,
                '' as scholar_last_name,
                sponsor.name as donor_name,
                CASE 
                    WHEN sd.proof_image LIKE 'http%' THEN sd.proof_image
                    WHEN sd.proof_image IS NOT NULL THEN CONCAT('http://localhost:5175', sd.proof_image)
                    ELSE NULL
                END as proof_of_payment
            FROM scholar_donations sd
            LEFT JOIN users u ON sd.scholar_id = u.id
            LEFT JOIN users sponsor ON sd.sponsor_id = sponsor.id
            ORDER BY sd.created_at DESC
        `);
        
        // Log the result for debugging
        console.log(`Found ${result.rows.length} scholar donations`);
        
        // Add this debug info to help understand the structure
        if (result.rows.length > 0) {
            console.log('First donation sample:', {
                id: result.rows[0].id,
                scholar_id: result.rows[0].scholar_id,
                scholar_name: result.rows[0].scholar_first_name,
                amount: result.rows[0].amount,
                status: result.rows[0].verification_status
            });
        } else {
            console.log('No donations found in the database');
            
            // Check if there are any donations in the database
            const countCheck = await db.query('SELECT COUNT(*) FROM scholar_donations');
            console.log(`Total donations in database: ${countCheck.rows[0].count}`);
        }
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching scholar donations:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Get donations by sponsor ID
router.get('/sponsor/:sponsorId', async (req, res) => {
    try {
        console.log(`Finding donations for sponsor ID: ${req.params.sponsorId}`);
        
        // Improve the query to include more image fields and properly format them
        const result = await db.query(`
            SELECT 
                sd.*,
                u_scholar.first_name as scholar_first_name,
                u_scholar.last_name as scholar_last_name,
                CASE 
                    WHEN u_scholar.profile_photo LIKE 'data:%' THEN u_scholar.profile_photo
                    WHEN u_scholar.profile_photo LIKE 'http%' THEN u_scholar.profile_photo
                    WHEN u_scholar.profile_photo IS NOT NULL THEN u_scholar.profile_photo
                    ELSE '' 
                END as scholar_image,
                u_scholar.profile_photo as profile_photo,
                s.image_url,
                COALESCE(
                    (SELECT SUM(amount::numeric) FROM scholar_donations 
                    WHERE scholar_id = sd.scholar_id AND verification_status = 'verified'), 0
                ) as current_amount,
                10000 as amount_needed
            FROM scholar_donations sd
            JOIN users u_scholar ON sd.scholar_id = u_scholar.id
            LEFT JOIN scholars s ON u_scholar.id = s.user_id
            WHERE sd.sponsor_id = $1
            ORDER BY sd.created_at DESC
        `, [req.params.sponsorId]);
        
        // Debug image paths
        if (result.rows.length > 0) {
            console.log('First scholar image fields:', {
                scholar_id: result.rows[0].scholar_id,
                scholar_image: result.rows[0].scholar_image,
                profile_photo: result.rows[0].profile_photo,
                image_url: result.rows[0].image_url
            });
        }
        
        console.log(`Found ${result.rows.length} donations`);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sponsor donations:', error);
        res.status(500).json({ error: 'Failed to fetch donations', details: error.message });
    }
});

// Get donation history for a scholar
router.get('/history/:scholarId', async (req, res) => {
    try {
        // Replace db.query with pool.query format
        const result = await db.query(`
            SELECT 
                CAST(amount AS INTEGER) as amount,
                created_at
            FROM scholar_donations
            WHERE scholar_id = $1
            AND verification_status = 'verified'
            ORDER BY created_at DESC
        `, [req.params.scholarId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching donation history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new scholar donation
router.post('/', upload.single('proof_of_donation'), async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        const { 
            scholar_id, 
            donor_name, 
            donor_email, 
            donor_phone, 
            amount,
            payment_method 
        } = req.body;
        const proof_image = req.file ? `/uploads/scholardonations/${req.file.filename}` : null;

        // Replace db.query with pool.query format
        const result = await client.query(
            'INSERT INTO scholar_donations (scholar_id, donor_name, donor_email, donor_phone, amount, payment_method, proof_image) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [
                scholar_id,
                donor_name || null,
                donor_email || null,
                donor_phone || null,
                amount,
                payment_method || null,
                proof_image
            ]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating scholar donation:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Create a new scholar donation (alternative endpoint)
router.post('/submit', upload.single('proof'), async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        const { 
            scholarId,
            amount,
            name,
            email,
            phone,
            message,
            paymentMethod,
            sponsorId
        } = req.body;
        const proof_image = req.file ? `/uploads/scholardonations/${req.file.filename}` : null;

        console.log('Processing donation with:', { 
            scholar_id: scholarId, 
            sponsor_id: sponsorId, 
            donor_name: name, 
            donor_email: email, 
            donor_phone: phone, 
            amount, 
            payment_method: paymentMethod,
            proof_image,
            message 
        });

        // First check if the scholar exists
        const scholarCheck = await client.query(
            'SELECT u.id FROM users u WHERE u.id = $1 AND u.role = $2',
            [scholarId, 'scholar']
        );

        if (scholarCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                error: 'Scholar not found', 
                details: `No scholar found with ID ${scholarId}. The donation must be linked to a valid scholar account.`
            });
        }

        // Replace db.query with pool.query format
        const result = await client.query(
            `INSERT INTO scholar_donations (
                scholar_id, sponsor_id, donor_name, donor_email, 
                donor_phone, amount, payment_method, proof_image, message
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
                scholarId,
                sponsorId || null, 
                name,
                email,
                phone,
                amount,
                paymentMethod,
                proof_image,
                message || null
            ]
        );

        const newDonation = result.rows[0];

        // Get scholar details to include in notification
        const scholarResult = await client.query(`
            SELECT name as full_name
            FROM users
            WHERE id = $1 AND role = 'scholar'
        `, [scholarId]);
        
        const scholarName = scholarResult.rows[0]?.full_name || 'Unknown Scholar';
        
        // Add debug for notification process
        console.log('Starting admin notification process...');
        
        // First check if we can get admin IDs
        try {
            const adminIds = await notificationModel.getAllAdminIds();
            console.log(`Found ${adminIds.length} admin IDs:`, adminIds);
            
            if (!adminIds || adminIds.length === 0) {
                console.warn('⚠️ No admin IDs found - notifications will not be sent!');
                
                // Try to diagnose the issue
                const adminUsersCheck = await client.query('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)', ['admin_users']);
                if (!adminUsersCheck.rows[0].exists) {
                    console.error('❌ admin_users table does not exist in the database!');
                    
                    // Check if there are admin roles in the users table
                    const adminRolesCheck = await client.query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);
                    console.log(`Found ${adminRolesCheck.rows[0].count} users with admin role`);
                    
                    // If admins are in users table, create temp notifications
                    if (adminRolesCheck.rows[0].count > 0) {
                        console.log('Creating notifications using users table instead of admin_users...');
                        const adminUsers = await client.query('SELECT id FROM users WHERE role = $1', ['admin']);
                        const adminUserIds = adminUsers.rows.map(user => user.id);
                        
                        await notificationModel.createScholarDonationNotification(adminUserIds, {
                            content: `New scholar donation: ${amount} for ${scholarName} from ${name || 'Anonymous'} is waiting for verification.`,
                            donationId: newDonation.id,
                            donorId: sponsorId || null,
                            donorName: name || 'Anonymous',
                            donorAvatar: '/images/donate-icon.png'
                        });
                        
                        console.log(`Created ${adminUserIds.length} notifications via users table`);
                    }
                }
            } else {
                // Send notification to admins using the specialized function
                await notificationUtils.notifyScholarDonation(
                    newDonation.id,
                    scholarId,
                    scholarName,
                    sponsorId,
                    name || 'Anonymous',
                    parseFloat(amount)
                );
                console.log('✅ Admin notifications sent successfully');
            }
        } catch (notificationError) {
            console.error('❌ Failed to send admin notification:', notificationError);
            console.error('Stack trace:', notificationError.stack);
        }

        await client.query('COMMIT');
        res.status(201).json(newDonation);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error submitting scholar donation:', error);
        
        // Check for foreign key violation
        if (error.code === '23503') {
            if (error.constraint === 'scholar_donations_scholar_id_fkey') {
                return res.status(400).json({ 
                    error: 'Invalid scholar ID',
                    details: 'The specified scholar does not exist in the system.'
                });
            }
            if (error.constraint === 'scholar_donations_sponsor_id_fkey') {
                return res.status(400).json({ 
                    error: 'Invalid sponsor ID',
                    details: 'The specified sponsor does not exist in the system.'
                });
            }
        }
        
        res.status(500).json({ error: 'Internal server error', details: error.message });
    } finally {
        client.release();
    }
});

// Verify donation
router.put('/:id/verify', authenticateToken, async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        // Update the donation status
        const result = await client.query(`
            UPDATE scholar_donations
            SET verification_status = 'verified', verified_at = NOW(), verified_by = $1
            WHERE id = $2
            RETURNING *
        `, [req.user.id, req.params.id]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Donation not found' });
        }

        // Get the donation with related data
        const donation = result.rows[0];

        // Use "content" column instead of "message"
        if (donation.sponsor_id) {
            await client.query(`
                INSERT INTO notifications (user_id, type, content, related_id, created_at)
                VALUES ($1, 'donation_verified', 'Your donation has been verified', $2, NOW())
            `, [
                donation.sponsor_id,
                donation.id
            ]);
            
            // Get sponsor's email to send verification email
            const sponsorResult = await client.query(`
                SELECT name, email FROM users WHERE id = $1
            `, [donation.sponsor_id]);
            
            // Get scholar's name for the email
            const scholarResult = await client.query(`
                SELECT name FROM users WHERE id = $1
            `, [donation.scholar_id]);
            
            if (sponsorResult.rows.length > 0 && scholarResult.rows.length > 0) {
                const sponsor = sponsorResult.rows[0];
                const scholar = scholarResult.rows[0];
                
                // Send email notification
                try {
                    await emailService.sendDonationVerificationEmail(
                        sponsor.email,
                        sponsor.name,
                        scholar.name,
                        donation.amount,
                        donation.id
                    );
                    console.log(`Verification email sent to ${sponsor.email}`);
                } catch (emailError) {
                    console.error('Failed to send verification email:', emailError);
                    // Continue with the process even if email fails
                }
            }
        } else if (donation.donor_email) {
            // For anonymous donations that include an email
            try {
                // Get scholar's name for the email
                const scholarResult = await client.query(`
                    SELECT name FROM users WHERE id = $1
                `, [donation.scholar_id]);
                
                if (scholarResult.rows.length > 0) {
                    const scholar = scholarResult.rows[0];
                    
                    await emailService.sendDonationVerificationEmail(
                        donation.donor_email,
                        donation.donor_name || 'Donor',
                        scholar.name,
                        donation.amount,
                        donation.id
                    );
                    console.log(`Verification email sent to anonymous donor: ${donation.donor_email}`);
                }
            } catch (emailError) {
                console.error('Failed to send verification email to anonymous donor:', emailError);
                // Continue with the process even if email fails
            }
        }

        await client.query('COMMIT');
        res.json(donation);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error verifying donation:', error);
        res.status(500).json({ error: 'Failed to verify donation', details: error.message });
    } finally {
        client.release();
    }
});

// Reject donation
router.put('/:id/reject', authenticateToken, async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        // Extract reason and provide default if empty
        const { reason } = req.body;
        const rejectionReason = reason || null;
        
        // Update the donation status
        const result = await client.query(`
            UPDATE scholar_donations
            SET verification_status = 'rejected', 
                rejected_at = NOW(),         -- Set rejected_at instead of verified_at
                rejected_by = $1,            -- Set rejected_by instead of verified_by
                verified_at = NULL,          -- Clear verified_at field
                verified_by = NULL,          -- Clear verified_by field
                rejection_reason = $2
            WHERE id = $3
            RETURNING *
        `, [req.user.id, rejectionReason, req.params.id]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Donation not found' });
        }

        // Get the donation with related data
        const donation = result.rows[0];

        // Use "content" column instead of "message"
        if (donation.sponsor_id) {
            const notificationText = rejectionReason
                ? `Your donation was rejected. Reason: ${rejectionReason}`
                : 'Your donation was rejected.';
                
            await client.query(`
                INSERT INTO notifications (user_id, type, content, related_id, created_at)
                VALUES ($1, 'donation_rejected', $2, $3, NOW())
            `, [
                donation.sponsor_id,
                notificationText,
                donation.id
            ]);
            
            // Get sponsor's email to send rejection email
            const sponsorResult = await client.query(`
                SELECT name, email FROM users WHERE id = $1
            `, [donation.sponsor_id]);
            
            // Get scholar's name for the email
            const scholarResult = await client.query(`
                SELECT name FROM users WHERE id = $1
            `, [donation.scholar_id]);
            
            if (sponsorResult.rows.length > 0 && scholarResult.rows.length > 0) {
                const sponsor = sponsorResult.rows[0];
                const scholar = scholarResult.rows[0];
                
                // Send email notification
                try {
                    await emailService.sendDonationRejectionEmail(
                        sponsor.email,
                        sponsor.name,
                        scholar.name,
                        donation.amount,
                        rejectionReason,
                        donation.id
                    );
                    console.log(`Rejection email sent to ${sponsor.email}`);
                } catch (emailError) {
                    console.error('Failed to send rejection email:', emailError);
                    // Continue with the process even if email fails
                }
            }
        } else if (donation.donor_email) {
            // For anonymous donations that include an email
            try {
                // Get scholar's name for the email
                const scholarResult = await client.query(`
                    SELECT name FROM users WHERE id = $1
                `, [donation.scholar_id]);
                
                if (scholarResult.rows.length > 0) {
                    const scholar = scholarResult.rows[0];
                    
                    await emailService.sendDonationRejectionEmail(
                        donation.donor_email,
                        donation.donor_name || 'Donor',
                        scholar.name,
                        donation.amount,
                        rejectionReason,
                        donation.id
                    );
                    console.log(`Rejection email sent to anonymous donor: ${donation.donor_email}`);
                }
            } catch (emailError) {
                console.error('Failed to send rejection email to anonymous donor:', emailError);
                // Continue with the process even if email fails
            }
        }

        await client.query('COMMIT');
        res.json(donation);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error rejecting donation:', error);
        res.status(500).json({ error: 'Failed to reject donation', details: error.message });
    } finally {
        client.release();
    }
});

// Add this new route to handle POST /scholardonations/verify/:id
router.post('/verify/:id', authenticateToken, async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        console.log(`Verifying donation with ID: ${req.params.id} (POST method)`);
        
        // Update the donation status
        const result = await client.query(`
            UPDATE scholar_donations
            SET verification_status = 'verified', verified_at = NOW(), verified_by = $1
            WHERE id = $2
            RETURNING *
        `, [req.user.id, req.params.id]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Donation not found' });
        }

        // Get the donation with related data
        const donation = result.rows[0];

        // Create a notification for the donor if they are a registered user
        // Use "content" column instead of "message"
        if (donation.sponsor_id) {
            await client.query(`
                INSERT INTO notifications (user_id, type, content, related_id, created_at)
                VALUES ($1, 'donation_verified', 'Your donation has been verified', $2, NOW())
            `, [
                donation.sponsor_id,
                donation.id // Use donation ID directly as related_id
            ]);
            
            // Get sponsor's email to send verification email
            const sponsorResult = await client.query(`
                SELECT name, email FROM users WHERE id = $1
            `, [donation.sponsor_id]);
            
            // Get scholar's name for the email
            const scholarResult = await client.query(`
                SELECT name FROM users WHERE id = $1
            `, [donation.scholar_id]);
            
            if (sponsorResult.rows.length > 0 && scholarResult.rows.length > 0) {
                const sponsor = sponsorResult.rows[0];
                const scholar = scholarResult.rows[0];
                
                // Send email notification
                try {
                    await emailService.sendDonationVerificationEmail(
                        sponsor.email,
                        sponsor.name,
                        scholar.name,
                        donation.amount,
                        donation.id
                    );
                    console.log(`Verification email sent to ${sponsor.email}`);
                } catch (emailError) {
                    console.error('Failed to send verification email:', emailError);
                    // Continue with the process even if email fails
                }
            }
        } else if (donation.donor_email) {
            // For anonymous donations that include an email
            try {
                // Get scholar's name for the email
                const scholarResult = await client.query(`
                    SELECT name FROM users WHERE id = $1
                `, [donation.scholar_id]);
                
                if (scholarResult.rows.length > 0) {
                    const scholar = scholarResult.rows[0];
                    
                    await emailService.sendDonationVerificationEmail(
                        donation.donor_email,
                        donation.donor_name || 'Donor',
                        scholar.name,
                        donation.amount,
                        donation.id
                    );
                    console.log(`Verification email sent to anonymous donor: ${donation.donor_email}`);
                }
            } catch (emailError) {
                console.error('Failed to send verification email to anonymous donor:', emailError);
                // Continue with the process even if email fails
            }
        }

        await client.query('COMMIT');
        res.json(donation);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error verifying donation:', error);
        res.status(500).json({ error: 'Failed to verify donation', details: error.message });
    } finally {
        client.release();
    }
});

// Also add a similar route for rejection with POST
router.post('/reject/:id', authenticateToken, async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        // Extract reason and provide default if empty
        const { reason } = req.body;
        const rejectionReason = reason || null;
        
        console.log(`Rejecting donation with ID: ${req.params.id} (POST method), reason: ${rejectionReason || 'None provided'}`);
        
        // Update the donation status
        const result = await client.query(`
            UPDATE scholar_donations
            SET verification_status = 'rejected', 
                rejected_at = NOW(),         -- Set rejected_at instead of verified_at
                rejected_by = $1,            -- Set rejected_by instead of verified_by
                verified_at = NULL,          -- Clear verified_at field
                verified_by = NULL,          -- Clear verified_by field
                rejection_reason = $2
            WHERE id = $3
            RETURNING *
        `, [req.user.id, rejectionReason, req.params.id]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Donation not found' });
        }

        // Get the donation with related data
        const donation = result.rows[0];

        // Create a notification for the donor if they are a registered user
        // Use "content" column instead of "message"
        if (donation.sponsor_id) {
            const notificationText = rejectionReason
                ? `Your donation was rejected. Reason: ${rejectionReason}`
                : 'Your donation was rejected.';
                
            await client.query(`
                INSERT INTO notifications (user_id, type, content, related_id, created_at)
                VALUES ($1, 'donation_rejected', $2, $3, NOW())
            `, [
                donation.sponsor_id,
                notificationText,
                donation.id
            ]);
            
            // Get sponsor's email to send rejection email
            const sponsorResult = await client.query(`
                SELECT name, email FROM users WHERE id = $1
            `, [donation.sponsor_id]);
            
            // Get scholar's name for the email
            const scholarResult = await client.query(`
                SELECT name FROM users WHERE id = $1
            `, [donation.scholar_id]);
            
            if (sponsorResult.rows.length > 0 && scholarResult.rows.length > 0) {
                const sponsor = sponsorResult.rows[0];
                const scholar = scholarResult.rows[0];
                
                // Send email notification
                try {
                    await emailService.sendDonationRejectionEmail(
                        sponsor.email,
                        sponsor.name,
                        scholar.name,
                        donation.amount,
                        rejectionReason,
                        donation.id
                    );
                    console.log(`Rejection email sent to ${sponsor.email}`);
                } catch (emailError) {
                    console.error('Failed to send rejection email:', emailError);
                    // Continue with the process even if email fails
                }
            }
        } else if (donation.donor_email) {
            // For anonymous donations that include an email
            try {
                // Get scholar's name for the email
                const scholarResult = await client.query(`
                    SELECT name FROM users WHERE id = $1
                `, [donation.scholar_id]);
                
                if (scholarResult.rows.length > 0) {
                    const scholar = scholarResult.rows[0];
                    
                    await emailService.sendDonationRejectionEmail(
                        donation.donor_email,
                        donation.donor_name || 'Donor',
                        scholar.name,
                        donation.amount,
                        rejectionReason,
                        donation.id
                    );
                    console.log(`Rejection email sent to anonymous donor: ${donation.donor_email}`);
                }
            } catch (emailError) {
                console.error('Failed to send rejection email to anonymous donor:', emailError);
                // Continue with the process even if email fails
            }
        }

        await client.query('COMMIT');
        res.json(donation);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error rejecting donation:', error);
        res.status(500).json({ error: 'Failed to reject donation', details: error.message });
    } finally {
        client.release();
    }
});

// Get donation statistics
router.get('/stats', async (req, res) => {
    try {
        // Get total number of donors (distinct sponsors)
        const donorsResult = await db.query(`
            SELECT COUNT(DISTINCT sponsor_id) as total_donors
            FROM scholar_donations
            WHERE sponsor_id IS NOT NULL
        `);

        // Get total amount donated
        const amountResult = await db.query(`
            SELECT COALESCE(SUM(amount::numeric), 0) as total_amount
            FROM scholar_donations
            WHERE verification_status = 'verified'
        `);

        // Get count of donations by status
        const statusResult = await db.query(`
            SELECT verification_status, COUNT(*) as count
            FROM scholar_donations
            GROUP BY verification_status
        `);
        
        const statusCounts = statusResult.rows.reduce((acc, row) => {
            acc[row.verification_status] = parseInt(row.count);
            return acc;
        }, { pending: 0, verified: 0, rejected: 0 });

        res.json({
            totalDonors: parseInt(donorsResult.rows[0].total_donors),
            totalAmount: parseFloat(amountResult.rows[0].total_amount),
            statusCounts
        });
    } catch (error) {
        console.error('Error fetching donation stats:', error);
        res.status(500).json({ error: 'Failed to fetch donation statistics', details: error.message });
    }
});

module.exports = router;

module.exports = router;
