const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db'); // Keep this import

// REMOVE the Pool creation and use the imported db connection instead
// This is causing the performance issue by creating a separate connection pool

const createUser = async (
  firstName,
  middleName,
  lastName,
  extension,
  gender,
  name, // We'll ignore this parameter and construct our own
  username, 
  email, 
  phone, // Add phone parameter
  password, 
  dateOfBirth, 
  role = 'volunteer', 
  faceData = null,
  guardianName = null,
  guardianPhone = null,
  address = null,
  educationLevel = null,
  school = null,
  parentsIncome = null,  // Add parents' income parameter
  skills = null,
  disability = null,     // Add disability parameter
  documentPaths = null,  // Add document paths parameter
  salaryRange = null     // Add salary range parameter
) => {
  try {
    // First check if email or username already exists
    const existingUser = await db.query(
      'SELECT email, username FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];
      
      // Be specific about which field caused the conflict
      if (existing.email === email) {
        const error = new Error('Email already registered');
        error.field = 'email';
        error.status = 409;
        throw error;
      }
      
      if (existing.username === username) {
        const error = new Error('Username already taken');
        error.field = 'username';
        error.status = 409;
        throw error;
      }
    }

    // Construct the full name from components
    // Filter out null/undefined/empty values and join with spaces
    const fullName = [firstName, middleName, lastName, extension]
      .filter(part => part && part.trim())
      .join(' ');

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

    // Make sure we never pass null to the email field
    const emailValue = email || `${username}@placeholder.com`;

    // Format skills as JSON if provided
    const skillsJson = skills ? JSON.stringify(skills) : null;
    
    // Format disability information as JSON if provided
    const disabilityJson = disability ? JSON.stringify(disability) : null;
    
    // Format document paths as JSON if provided
    const documentPathsJson = documentPaths ? JSON.stringify(documentPaths) : null;

    // If role is volunteer, extract skill evidence from documentPaths
    let skillEvidence = null;
    if (role === 'volunteer' && documentPaths && documentPaths.skillEvidence) {
      skillEvidence = documentPaths.skillEvidence;
    }

    // Replace pool.query with db.query for consistent connection pooling
    const result = await db.query(
      `INSERT INTO users (
        first_name, middle_name, last_name, name_extension, gender,
        name, username, email, phone, password, date_of_birth, 
        verification_token, is_verified, role, created_at,
        face_descriptors, face_landmarks, has_face_verification,
        guardian_name, guardian_phone, address, education_level, school,
        parents_income, skills, disability, document_paths, salary_range,
        skill_evidence
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29) 
      RETURNING *`,
      [
        firstName, middleName, lastName, extension, gender,
        fullName, // Use our constructed fullName instead of the provided name parameter
        username, emailValue, phone, hashedPassword, dateOfBirth, 
        verificationToken, false, role, new Date(),
        face_descriptors, face_landmarks, faceData !== null,
        guardianName, guardianPhone, address, educationLevel, school,
        parentsIncome, skillsJson, disabilityJson, documentPathsJson, salaryRange,
        skillEvidence // Add the skill evidence path
      ]
    );

    return { user: result.rows[0], verificationToken };
  } catch (error) {
    // Enhance error with field information if it's a database constraint error
    if (error.code === '23505') { // PostgreSQL unique constraint violation code
      if (error.constraint === 'users_email_key') {
        error.field = 'email';
        error.status = 409;
        error.message = 'Email already registered';
      } else if (error.constraint === 'users_username_key') {
        error.field = 'username';
        error.status = 409;
        error.message = 'Username already taken';
      }
    }
    throw error;
  }
};

const findUserByEmailOrUsername = async (identifier) => {
  // Replace pool with db
  const result = await db.query(
    `SELECT id, email, name, first_name, middle_name, last_name, name_extension, gender,
            username, profile_photo, cover_photo, intro, 
            known_as, date_of_birth, phone, password, is_verified, role,
            facebook_url, twitter_url, instagram_url, status,
            guardian_name, guardian_phone, address, education_level, school, skills, disability,
            salary_range
     FROM users 
     WHERE email = $1 OR username = $1`,
    [identifier]
  );
  return result.rows[0];
};

// Continue replacing all occurrences of pool.query with db.query in all functions
const updateUserPhotos = async (userId, profilePhoto, coverPhoto) => {
  const query = `
    UPDATE users 
    SET profile_photo = COALESCE($1, profile_photo),
        cover_photo = COALESCE($2, cover_photo)
    WHERE id = $3 
    RETURNING id, email, name, username, profile_photo, cover_photo, intro, known_as, date_of_birth, phone`;

  const result = await db.query(query, [profilePhoto, coverPhoto, userId]);
  return result.rows[0];
};

const updateUserInfo = async (userId, intro, knownAs) => {
  const query = `
    UPDATE users 
    SET intro = COALESCE($1, intro),
        known_as = COALESCE($2, known_as)
    WHERE id = $3 
    RETURNING id, email, name, username, profile_photo, cover_photo, intro, known_as, date_of_birth, phone`;

  const result = await db.query(query, [intro, knownAs, userId]);
  return result.rows[0];
};

const updateUserDetails = async (
  userId, 
  firstName,
  middleName,
  lastName,
  extension,
  gender,
  name, // We'll ignore this parameter and construct our own
  email, 
  username, 
  dateOfBirth, 
  phone, 
  intro, 
  knownAs,
  guardianName,
  guardianPhone,
  address,
  educationLevel,
  school,
  skills,
  disability,
  salaryRange
) => {
  // First get the current user data to ensure we don't override the email with null
  const userResult = await db.query('SELECT email, role, first_name, middle_name, last_name, name_extension FROM users WHERE id = $1', [userId]);
  
  if (userResult.rows.length === 0) {
    return null; // User not found
  }
  
  const currentEmail = userResult.rows[0].email;
  const userRole = userResult.rows[0].role;
  
  // Use the current email if no new email is provided
  const emailToUse = email || currentEmail;

  // Determine what values to use for name components, using current values as fallback
  const firstNameToUse = firstName || userResult.rows[0].first_name;
  const middleNameToUse = middleName || userResult.rows[0].middle_name;
  const lastNameToUse = lastName || userResult.rows[0].last_name;
  const extensionToUse = extension || userResult.rows[0].name_extension;

  // Construct the full name from components - filter out null/undefined/empty values
  const fullName = [firstNameToUse, middleNameToUse, lastNameToUse, extensionToUse]
    .filter(part => part && part.trim())
    .join(' ');

  // Format skills as JSON if provided
  const skillsJson = skills ? JSON.stringify(skills) : null;
  
  // Format disability as JSON if provided
  const disabilityJson = disability ? JSON.stringify(disability) : null;
  
  // Build the query based on role
  let query;
  let params;
  
  if (userRole === 'scholar') {
    query = `
      UPDATE users 
      SET first_name = COALESCE($1, first_name),
          middle_name = COALESCE($2, middle_name),
          last_name = COALESCE($3, last_name),
          name_extension = COALESCE($4, name_extension),
          gender = COALESCE($5, gender),
          name = $6, /* Always update the name field with our constructed fullName */
          email = $7, 
          username = COALESCE($8, username),
          date_of_birth = COALESCE($9, date_of_birth),
          phone = COALESCE($10, phone),
          intro = COALESCE($11, intro),
          known_as = COALESCE($12, known_as),
          guardian_name = COALESCE($13, guardian_name),
          guardian_phone = COALESCE($14, guardian_phone),
          address = COALESCE($15, address),
          education_level = COALESCE($16, education_level),
          school = COALESCE($17, school)
      WHERE id = $18 
      RETURNING id, email, name, first_name, middle_name, last_name, name_extension, gender,
                username, profile_photo, cover_photo, intro, known_as, date_of_birth, phone,
                guardian_name, guardian_phone, address, education_level, school`;
    
    params = [
      firstName, middleName, lastName, extension, gender, 
      fullName, // Use our constructed fullName instead of the provided name parameter
      emailToUse, username, dateOfBirth, phone, intro, knownAs,
      guardianName, guardianPhone, address, educationLevel, school,
      userId
    ];
  } 
  else if (userRole === 'volunteer') {
    // ...Similar changes for volunteer...
    query = `
      UPDATE users 
      SET first_name = COALESCE($1, first_name),
          middle_name = COALESCE($2, middle_name),
          last_name = COALESCE($3, last_name),
          name_extension = COALESCE($4, name_extension),
          gender = COALESCE($5, gender),
          name = $6, /* Always update the name field with our constructed fullName */
          email = $7, 
          username = COALESCE($8, username),
          date_of_birth = COALESCE($9, date_of_birth),
          phone = COALESCE($10, phone),
          intro = COALESCE($11, intro),
          known_as = COALESCE($12, known_as),
          skills = COALESCE($13, skills),
          disability = COALESCE($14, disability)
      WHERE id = $15 
      RETURNING id, email, name, first_name, middle_name, last_name, name_extension, gender,
                username, profile_photo, cover_photo, intro, known_as, date_of_birth, phone, skills, disability`;
    
    params = [
      firstName, middleName, lastName, extension, gender, 
      fullName, // Use our constructed fullName instead of the provided name parameter
      emailToUse, username, dateOfBirth, phone, intro, knownAs,
      skillsJson, disabilityJson, userId
    ];
  }
  else if (userRole === 'sponsor') {
    query = `
      UPDATE users 
      SET first_name = COALESCE($1, first_name),
          middle_name = COALESCE($2, middle_name),
          last_name = COALESCE($3, last_name),
          name_extension = COALESCE($4, name_extension),
          gender = COALESCE($5, gender),
          name = $6, /* Always update the name field with our constructed fullName */
          email = $7, 
          username = COALESCE($8, username),
          date_of_birth = COALESCE($9, date_of_birth),
          phone = COALESCE($10, phone),
          intro = COALESCE($11, intro),
          known_as = COALESCE($12, known_as),
          salary_range = COALESCE($13, salary_range)
      WHERE id = $14 
      RETURNING id, email, name, first_name, middle_name, last_name, name_extension, gender,
                username, profile_photo, cover_photo, intro, known_as, date_of_birth, phone, salary_range`;
    
    params = [
      firstName, middleName, lastName, extension, gender, 
      fullName, // Use our constructed fullName instead of the provided name parameter
      emailToUse, username, dateOfBirth, phone, intro, knownAs,
      salaryRange, userId
    ];
  }
  else {
    // ...And for other roles...
    query = `
      UPDATE users 
      SET first_name = COALESCE($1, first_name),
          middle_name = COALESCE($2, middle_name),
          last_name = COALESCE($3, last_name),
          name_extension = COALESCE($4, name_extension),
          gender = COALESCE($5, gender),
          name = $6, /* Always update the name field with our constructed fullName */
          email = $7, 
          username = COALESCE($8, username),
          date_of_birth = COALESCE($9, date_of_birth),
          phone = COALESCE($10, phone),
          intro = COALESCE($11, intro),
          known_as = COALESCE($12, known_as)
      WHERE id = $13 
      RETURNING id, email, name, first_name, middle_name, last_name, name_extension, gender,
                username, profile_photo, cover_photo, intro, known_as, date_of_birth, phone`;
    
    params = [
      firstName, middleName, lastName, extension, gender, 
      fullName, // Use our constructed fullName instead of the provided name parameter
      emailToUse, username, dateOfBirth, phone, intro, knownAs,
      userId
    ];
  }

  const result = await db.query(query, params);
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
  try {
    // Use db.connect() instead of pool.connect()
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
        return null;
      }
      
      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    throw error;
  }
};

// Continue replacing all remaining pool.query with db.query
const createPasswordResetToken = async (email) => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

  const result = await db.query(
    'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3 RETURNING email',
    [resetToken, resetTokenExpiry, email]
  );

  return result.rows[0] ? resetToken : null;
};

// Add the missing verifyResetToken function
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

// ... other functions with pool.query replaced with db.query ...

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
    throw error;
  }
};

const deleteUser = async (userId) => {
  // Replace pool.connect with db.connect
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
    throw error;
  } finally {
    client.release();
  }
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

// Add the missing findUserByFaceData function
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
    throw error;
  }
};

// Add the supporting euclideanDistance function
const euclideanDistance = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error('Invalid descriptor format');
  }
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
  );
};

// Export all functions with updateLastLogin only once
module.exports = { 
  createUser, 
  findUserByEmailOrUsername,
  updateUserPhotos,
  updateUserInfo,
  updateUserDetails,
  updateUserPassword,
  verifyEmail,
  createPasswordResetToken,
  verifyResetToken,
  resetPassword,
  updateUserSocials,
  updateLastLogin,  // Include this only once
  updateFaceData,
  findUserByFaceData,
  updateUserLocation,
  archiveUser,
  deleteUser,
};

