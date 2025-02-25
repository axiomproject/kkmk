const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');

const createUser = async (name, username, email, password, dateOfBirth, role = 'volunteer', faceData = null) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    let face_descriptors = null;
    let face_landmarks = null;

    if (faceData) {
      const parsedData = JSON.parse(faceData);
      // Convert descriptors to proper PostgreSQL array format
      face_descriptors = parsedData.descriptors.map(desc => 
        Array.isArray(desc) ? desc : Array.from(desc)
      );
      // Keep landmarks as JSON
      face_landmarks = JSON.stringify(parsedData.landmarks);
    }

    const result = await db.query(
      `INSERT INTO users (
        name, username, email, password, date_of_birth, 
        verification_token, is_verified, role, created_at,
        face_descriptors, face_landmarks, has_face_verification
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [
        name, username, email, hashedPassword, dateOfBirth, 
        verificationToken, false, role, new Date(),
        face_descriptors, face_landmarks, faceData !== null
      ]
    );

    return { user: result.rows[0], verificationToken };
  } catch (error) {
    console.error('Detailed error in createUser:', error);
    if (error.message.includes('double precision[]')) {
      console.error('Face descriptors data:', face_descriptors);
    }
    throw error;
  }
};

const findUserByEmailOrUsername = async (identifier) => {
  try {
    console.log('Finding user by email or username:', identifier);
    
    // First check if the identifier exists
    if (!identifier) {
      throw new Error('Email or username is required');
    }

    // Modify the query to handle both email and username cases
    const result = await db.query(
      `SELECT id, email, name, username, profile_photo, cover_photo, intro, 
              known_as, date_of_birth, phone, password, is_verified, role,
              facebook_url, twitter_url, instagram_url, status
       FROM users 
       WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)`,
      [identifier]
    );

    // Add debug logging
    console.log('Database query result:', {
      rowCount: result.rowCount,
      firstRow: result.rows[0] ? 'Found' : 'Not found'
    });

    // Handle case where no user is found
    if (!result.rows[0]) {
      console.log('No user found with identifier:', identifier);
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error in findUserByEmailOrUsername:', error);
    throw error;
  }
};

const updateUserPhotos = async (userId, profilePhoto, coverPhoto) => {
  console.log('Updating user photos for userId:', userId);
  const query = `
    UPDATE users 
    SET profile_photo = COALESCE($1, profile_photo),
        cover_photo = COALESCE($2, cover_photo)
    WHERE id = $3 
    RETURNING id, email, name, username, profile_photo, cover_photo, intro, known_as, date_of_birth, phone`;

  const result = await db.query(query, [profilePhoto, coverPhoto, userId]);
  console.log('Updated user:', result.rows[0]);
  return result.rows[0];
};

const updateUserInfo = async (userId, intro, knownAs) => {
  console.log('Updating user info for userId:', userId);
  const query = `
    UPDATE users 
    SET intro = COALESCE($1, intro),
        known_as = COALESCE($2, known_as)
    WHERE id = $3 
    RETURNING id, email, name, username, profile_photo, cover_photo, intro, known_as, date_of_birth, phone`;

  const result = await db.query(query, [intro, knownAs, userId]);
  console.log('Updated user info:', result.rows[0]);
  return result.rows[0];
};

const updateUserDetails = async (userId, name, email, username, dateOfBirth, phone, intro, knownAs) => {
  console.log('Updating user details for userId:', userId);
  const query = `
    UPDATE users 
    SET name = COALESCE($1, name),
        email = COALESCE($2, email),
        username = COALESCE($3, username),
        date_of_birth = COALESCE($4, date_of_birth),
        phone = COALESCE($5, phone),
        intro = COALESCE($6, intro),
        known_as = COALESCE($7, known_as)
    WHERE id = $8 
    RETURNING id, email, name, username, profile_photo, cover_photo, intro, known_as, date_of_birth, phone`;

  const result = await db.query(query, [name, email, username, dateOfBirth, phone, intro, knownAs, userId]);
  console.log('Updated user details:', result.rows[0]);
  return result.rows[0];
};

const updateUserPassword = async (userId, oldPassword, newPassword) => {
  // First verify the old password
  const user = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
  if (!user.rows[0]) {
    throw new Error('User not found');
  }

  const isValidPassword = await bcrypt.compare(oldPassword, user.rows[0].password);
  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }

  // Hash and update the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const result = await db.query(
    'UPDATE users SET password = $1 WHERE id = $2 RETURNING id',
    [hashedPassword, userId]
  );

  return result.rows[0];
};

const verifyEmail = async (token) => {
  console.log('Starting verification process for token:', token);
  
  try {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // First check if user is already verified
      const alreadyVerifiedQuery = `
        SELECT id, email, is_verified 
        FROM users 
        WHERE id IN (
          SELECT id FROM users WHERE verification_token = $1
        ) AND is_verified = TRUE`;
      
      const verifiedCheck = await client.query(alreadyVerifiedQuery, [token]);
      
      if (verifiedCheck.rows.length > 0) {
        await client.query('COMMIT');
        console.log('User was already verified:', verifiedCheck.rows[0]);
        return { ...verifiedCheck.rows[0], alreadyVerified: true };
      }
      
      // If not already verified, check for valid token
      const verifyQuery = `
        UPDATE users 
        SET is_verified = TRUE,
            verification_token = NULL
        WHERE verification_token = $1
        RETURNING id, email, is_verified`;
      
      const result = await client.query(verifyQuery, [token]);
      
      if (result.rows.length === 0) {
        await client.query('COMMIT');
        console.log('No user found with token:', token);
        return null;
      }
      
      await client.query('COMMIT');
      console.log('Verification successful for user:', result.rows[0]);
      return result.rows[0];
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error during verification:', error);
    throw error;
  }
};

const createPasswordResetToken = async (email) => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

  const result = await db.query(
    'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3 RETURNING email',
    [resetToken, resetTokenExpiry, email]
  );

  return result.rows[0] ? resetToken : null;
};

const verifyResetToken = async (token) => {
  const result = await db.query(
    'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
    [token]
  );
  return result.rows[0];
};

const resetPassword = async (token, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const result = await db.query(
    'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = $2 AND reset_token_expiry > NOW() RETURNING id',
    [hashedPassword, token]
  );
  return result.rows[0];
};

const updateUserSocials = async (userId, facebookUrl, twitterUrl, instagramUrl) => {
  const query = `
    UPDATE users 
    SET facebook_url = COALESCE($1, facebook_url),
        twitter_url = COALESCE($2, twitter_url),
        instagram_url = COALESCE($3, instagram_url)
    WHERE id = $4 
    RETURNING id, email, name, username, profile_photo, cover_photo, intro, 
              known_as, date_of_birth, phone, facebook_url, twitter_url, 
              instagram_url, role, is_verified`;

  const result = await db.query(query, [facebookUrl, twitterUrl, instagramUrl, userId]);
  return result.rows[0];
};

const updateLastLogin = async (userId) => {
  const query = `
    UPDATE users 
    SET last_login = NOW()
    WHERE id = $1 
    RETURNING last_login`;

  const result = await db.query(query, [userId]);
  return result.rows[0];
};

const updateFaceData = async (userId, faceData) => {
  const query = `
    UPDATE users 
    SET face_data = $1,
        has_face_verification = TRUE
    WHERE id = $2 
    RETURNING id`;

  const result = await db.query(query, [faceData, userId]);
  return result.rows[0];
};

const normalizeAndPrepareFaceData = (faceData) => {
  try {
    const parsedData = typeof faceData === 'string' ? JSON.parse(faceData) : faceData;
    
    // Calculate global center and scale for all points
    const allPoints = [
      ...(parsedData.leftEye || []),
      ...(parsedData.rightEye || []),
      ...(parsedData.nose || []),
      ...(parsedData.mouth || []),
      ...(parsedData.jawline || [])
    ];

    if (allPoints.length === 0) {
      throw new Error('Invalid face data structure');
    }

    // Calculate center
    const center = {
      x: allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length,
      y: allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length
    };

    // Calculate scale (max distance from center)
    const scale = Math.max(...allPoints.map(p => 
      Math.sqrt(Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2))
    ));

    // Normalize all features relative to the same center and scale
    const normalizedData = {};
    for (const [feature, points] of Object.entries(parsedData)) {
      if (Array.isArray(points)) {
        normalizedData[feature] = points.map(p => ({
          x: (p.x - center.x) / scale,
          y: (p.y - center.y) / scale
        }));
      }
    }

    return normalizedData;
  } catch (error) {
    console.error('Error normalizing face data:', error);
    return null;
  }
};

const calculateFeatureSimilarity = (points1, points2) => {
  try {
    const len = Math.min(points1.length, points2.length);
    let totalSimilarity = 0;
    let pointCount = 0;

    for (let i = 0; i < len; i++) {
      const p1 = points1[i];
      const p2 = points2[i];
      
      if (!p1?.x || !p1?.y || !p2?.x || !p2?.y) continue;

      const distance = Math.sqrt(
        Math.pow(p1.x - p2.x, 2) + 
        Math.pow(p1.y - p2.y, 2)
      );

      // Convert distance to similarity score (0-1)
      const similarity = 1 / (1 + distance);
      totalSimilarity += similarity;
      pointCount++;
    }

    return pointCount > 0 ? totalSimilarity / pointCount : 0;
  } catch (error) {
    console.error('Error calculating feature similarity:', error);
    return 0;
  }
};

const calculateFaceSimilarity = (stored, incoming) => {
  try {
    const storedData = typeof stored === 'string' ? JSON.parse(stored) : stored;
    const incomingData = typeof incoming === 'string' ? JSON.parse(incoming) : incoming;

    const weights = {
      leftEye: 0.25,    // Key features with higher weights
      rightEye: 0.25,
      nose: 0.2,
      mouth: 0.15,
      jawline: 0.15
    };

    let totalScore = 0;
    let totalWeight = 0;
    let featureScores = {};  // Track individual feature scores

    for (const [feature, weight] of Object.entries(weights)) {
      if (storedData[feature] && incomingData[feature]) {
        const score = compareFeaturePoints(
          storedData[feature],
          incomingData[feature]
        );
        featureScores[feature] = score;  // Store individual score
        totalScore += score * weight;
        totalWeight += weight;
      }
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Log detailed scoring
    console.log('Feature scores:', featureScores);
    console.log('Final weighted score:', finalScore);

    return finalScore;
  } catch (error) {
    console.error('Error in similarity calculation:', error);
    return 0;
  }
};

const compareFeaturePoints = (points1, points2) => {
  try {
    const len = Math.min(points1.length, points2.length);
    let totalSimilarity = 0;

    for (let i = 0; i < len; i++) {
      const p1 = points1[i];
      const p2 = points2[i];

      // Calculate direct point similarity
      const distance = Math.sqrt(
        Math.pow(p1.x - p2.x, 2) + 
        Math.pow(p1.y - p2.y, 2)
      );

      // Convert distance to similarity score (0-1)
      const pointSimilarity = 1 / (1 + distance * 2);
      totalSimilarity += pointSimilarity;
    }

    return totalSimilarity / len;
  } catch (error) {
    console.error('Error comparing points:', error);
    return 0;
  }
};

const validateFaceData = (faceData) => {
  if (!faceData) return false;
  
  try {
    const data = typeof faceData === 'string' ? JSON.parse(faceData) : faceData;
    
    // Check required facial features
    const requiredFeatures = ['leftEye', 'rightEye', 'nose', 'mouth'];
    const hasAllFeatures = requiredFeatures.every(feature => 
      Array.isArray(data[feature]) && data[feature].length > 0
    );
    
    // Validate point coordinates
    const hasValidPoints = Object.values(data).every(points =>
      Array.isArray(points) && points.every(point =>
        typeof point.x === 'number' && 
        typeof point.y === 'number' &&
        !isNaN(point.x) && 
        !isNaN(point.y)
      )
    );

    return hasAllFeatures && hasValidPoints;
  } catch (error) {
    console.error('Face data validation error:', error);
    return false;
  }
};

const findUserByFaceData = async (faceData) => {
  try {
    const { descriptor } = JSON.parse(faceData);
    const users = await db.query(
      'SELECT * FROM users WHERE face_descriptors IS NOT NULL'
    );
    
    let bestMatch = null;
    let highestSimilarity = 0;
    
    for (const user of users.rows) {
      if (!user.face_descriptors || !user.face_descriptors.length) continue;

      // Ensure descriptors are in the correct format
      for (const storedDescriptor of user.face_descriptors) {
        if (!Array.isArray(storedDescriptor)) continue;
        
        const similarity = 1 - euclideanDistance(
          Array.from(descriptor),
          Array.from(storedDescriptor)
        );
        
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = user;
        }
      }
    }
    
    const SIMILARITY_THRESHOLD = 0.6;
    console.log(`Best match similarity: ${highestSimilarity}, threshold: ${SIMILARITY_THRESHOLD}`);
    
    if (highestSimilarity > SIMILARITY_THRESHOLD) {
      const { password, face_descriptors, face_landmarks, ...safeUser } = bestMatch;
      return {
        authenticated: true,
        user: safeUser,
        similarity: highestSimilarity,
        message: 'Face authentication successful'
      };
    }
    
    return {
      authenticated: false,
      similarity: highestSimilarity,
      message: highestSimilarity > 0.4 ? 
        'Face partially matched. Please try again.' : 
        'Face not recognized. Please use password login.',
      needsRescan: highestSimilarity > 0.4
    };
  } catch (error) {
    console.error('Face recognition error:', error);
    throw error;
  }
};

const euclideanDistance = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error('Invalid descriptor format');
  }
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
  );
};

const updateUserLocation = async (userId, latitude, longitude) => {
  try {
    const result = await db.query(
      `UPDATE users 
       SET 
        latitude = $1,
        longitude = $2,
        location_updated_at = CURRENT_TIMESTAMP,
        location_remark = NULL,
        scheduled_visit = NULL,
        location_verified = FALSE,
        remark_added_at = NULL
       WHERE id = $3
       RETURNING id, latitude, longitude, location_updated_at`,
      [latitude, longitude, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error updating user location:', error);
    throw error;
  }
};

const archiveUser = async (userId) => {
  try {
    const result = await db.query(
      `UPDATE users 
       SET status = 'inactive'
       WHERE id = $1
       RETURNING id`,
      [userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error archiving user:', error);
    throw error;
  }
};

const deleteUser = async (userId) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Delete all related data in order of dependencies
    await client.query('DELETE FROM report_cards WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM user_locations WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM user_verifications WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
    // Add any other related tables here
    
    // Finally delete the user
    const result = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in deleteUser:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { 
  createUser, 
  findUserByEmailOrUsername,
  updateUserPhotos,
  updateUserInfo,
  updateUserDetails,
  updateLastLogin,
  updateUserPassword,
  verifyEmail,
  createPasswordResetToken,
  verifyResetToken,
  resetPassword,
  updateUserSocials,
  updateLastLogin,
  updateFaceData,
  findUserByFaceData,
  updateUserLocation,
  archiveUser,
  deleteUser,
};

