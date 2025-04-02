const AdminModel = require('../models/adminModel');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// User Management
const getUsers = async (req, res) => {
  try {
    const users = await AdminModel.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const updatedUser = await AdminModel.updateUser(id, updates);
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await AdminModel.deleteUser(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Staff Management
const adminController = {
  async getStaffMembers(req, res) {
    try {
      const staff = await AdminModel.getAllStaff();
      res.json(staff);
    } catch (error) {
      console.error('Error fetching staff:', error);
      res.status(500).json({ error: 'Failed to fetch staff members' });
    }
  },

  async getStaffMember(req, res) {
    try {
      const { id } = req.params;
      const staff = await AdminModel.getStaffById(id);
      if (!staff) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      res.json(staff);
    } catch (error) {
      console.error('Error fetching staff member:', error);
      res.status(500).json({ error: 'Failed to fetch staff member' });
    }
  },

  async createStaffMember(req, res) {
    try {
      const { password, ...staffData } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const staff = await AdminModel.createStaffMember({
        ...staffData,
        password: hashedPassword
      });
      res.status(201).json(staff);
    } catch (error) {
      console.error('Error creating staff:', error);
      res.status(500).json({ error: 'Failed to create staff member' });
    }
  },

  async updateStaffMember(req, res) {
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      
      // If password is provided, hash it
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      const staff = await AdminModel.updateStaffMember(id, updates);
      res.json(staff);
    } catch (error) {
      console.error('Error updating staff:', error);
      res.status(500).json({ error: 'Failed to update staff member' });
    }
  },

  async deleteStaffMember(req, res) {
    try {
      const { id } = req.params;
      const result = await AdminModel.deleteStaffMember(id);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      res.json({ message: 'Staff member deleted successfully' });
    } catch (error) {
      console.error('Error deleting staff:', error);
      res.status(500).json({ error: 'Failed to delete staff member' });
    }
  }
};

// Volunteer Management
const getVolunteers = async (req, res) => {
  try {
    const volunteers = await AdminModel.getVolunteers();
    res.json(volunteers);
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    res.status(500).json({ error: 'Failed to fetch volunteers' });
  }
};

const getVolunteerById = async (req, res) => {
  try {
    const { id } = req.params;
    const volunteer = await AdminModel.getVolunteerById(id);
    
    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }
    
    // Log the volunteer data to debug skill_evidence
    console.log('Volunteer data:', {
      id: volunteer.id,
      name: volunteer.name,
      skillEvidence: volunteer.skill_evidence,
      hasSkills: !!volunteer.skills
    });
    
    res.json(volunteer);
  } catch (error) {
    console.error('Error fetching volunteer by ID:', error);
    res.status(500).json({ error: 'Failed to fetch volunteer details' });
  }
};

// Modify the createVolunteer function to handle FormData with skill evidence

const createVolunteer = async (req, res) => {
  try {
    // Check if user is admin or staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    console.log('Create volunteer request received');
    console.log('Content-Type:', req.headers['content-type']);
    
    // Debug the req.files object
    if (req.files) {
      console.log('Files received:', Object.keys(req.files));
      // Check for skillEvidence specifically
      if (req.files.skillEvidence) {
        console.log('Skill evidence file details:', {
          filename: req.files.skillEvidence[0].filename,
          originalname: req.files.skillEvidence[0].originalname,
          mimetype: req.files.skillEvidence[0].mimetype,
          size: req.files.skillEvidence[0].size
        });
      } else {
        console.log('No skillEvidence file found in req.files');
      }
    } else {
      console.log('No files found in request');
    }
    
    // Extract fields from request body
    const {
      first_name,
      middle_name,
      last_name,
      name_extension,
      gender,
      username,
      email,
      password,
      phone,
      date_of_birth,
      status,
      is_verified,
      name,
      skills: skillsJson,
      disability: disabilityJson
    } = req.body;

    // Parse skills and disability from JSON strings
    let skills = [];
    try {
      if (skillsJson) {
        skills = JSON.parse(skillsJson);
        console.log('Parsed skills:', skills);
      }
    } catch (e) {
      console.error('Error parsing skills:', e);
    }

    let disability = null;
    try {
      if (disabilityJson) {
        disability = JSON.parse(disabilityJson);
        console.log('Parsed disability:', disability);
      }
    } catch (e) {
      console.error('Error parsing disability:', e);
    }

    // Process skill evidence file
    let skillEvidence = null;
    if (req.files && req.files.skillEvidence && req.files.skillEvidence.length > 0) {
      skillEvidence = `/uploads/volunteer-evidence/${req.files.skillEvidence[0].filename}`;
      console.log('Skill evidence path set to:', skillEvidence);
    }

    // Create full name if not provided
    const fullName = name || [
      first_name,
      middle_name,
      last_name,
      name_extension
    ].filter(Boolean).join(' ');
    
    // Create volunteer data object
    const volunteerData = {
      name: fullName,
      first_name,
      middle_name,
      last_name,
      name_extension,
      username,
      email,
      password, // Will be hashed below
      phone,
      date_of_birth,
      status: status || 'active',
      is_verified: is_verified === 'true' || is_verified === true,
      skills,
      disability,
      gender,
      skill_evidence: skillEvidence // Include skill evidence path in the data
    };
    
    console.log('Creating volunteer with data:', {
      ...volunteerData,
      password: '[REDACTED]',
      skill_evidence: skillEvidence  // Log this explicitly
    });

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    volunteerData.password = await bcrypt.hash(volunteerData.password, salt);

    // Call the admin model to create the volunteer
    const volunteer = await AdminModel.createVolunteer(volunteerData);

    if (!volunteer) {
      throw new Error('Failed to create volunteer');
    }

    console.log('Volunteer created successfully with ID:', volunteer.id);
    console.log('Volunteer data saved:', {
      ...volunteer,
      skill_evidence: volunteer.skill_evidence // Check this was saved correctly
    });
    
    res.status(201).json({
      success: true,
      message: 'Volunteer created successfully',
      volunteer
    });

  } catch (error) {
    console.error('Error creating volunteer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create volunteer'
    });
  }
};

const updateVolunteer = async (req, res) => {
  try {
    console.log('Update volunteer request received');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Has files?', !!req.files);
    
    if (req.files) {
      console.log('Files detected:', Object.keys(req.files));
      if (req.files.skillEvidence) {
        console.log('Skill evidence file included:', req.files.skillEvidence[0].filename);
      }
    }
    
    const { id } = req.params;
    const isFormData = req.headers['content-type']?.includes('multipart/form-data');
    let updates = {};
    
    if (isFormData) {
      // Process multipart form data
      updates = { ...req.body };
      
      // Handle skill evidence file
      if (req.files && req.files.skillEvidence && req.files.skillEvidence.length > 0) {
        const evidenceFile = req.files.skillEvidence[0];
        updates.skill_evidence = `/uploads/volunteer-evidence/${evidenceFile.filename}`;
        console.log('Setting new skill evidence path:', updates.skill_evidence);
      }
      
      // Check if we need to remove the current evidence
      if (req.body.removeSkillEvidence === 'true') {
        updates.skill_evidence = null;
        console.log('Removing skill evidence');
      }
      
      // Parse JSON fields
      if (updates.skills) {
        try {
          updates.skills = JSON.parse(updates.skills);
          console.log('Parsed skills:', updates.skills);
        } catch (e) {
          console.error('Error parsing skills:', e);
        }
      }
      
      if (updates.disability) {
        try {
          updates.disability = JSON.parse(updates.disability);
          console.log('Parsed disability:', updates.disability);
        } catch (e) {
          console.error('Error parsing disability:', e);
        }
      }
    } else {
      // Regular JSON request
      updates = req.body;
    }
    
    // Validate minimum age (16 years) if date_of_birth is being updated
    if (updates.date_of_birth) {
      const birthDate = new Date(updates.date_of_birth);
      const today = new Date();
      const minAgeDate = new Date();
      minAgeDate.setFullYear(today.getFullYear() - 16);
      
      if (birthDate > minAgeDate) {
        return res.status(400).json({ 
          error: 'Age requirement not met', 
          field: 'date_of_birth',
          message: 'Volunteers must be at least 16 years old'
        });
      }
    }
    
    // Check if email or username already exists (excluding the current user)
    if (updates.email || updates.username) {
      // Get existing volunteer data first to compare changes
      const currentVolunteerResult = await db.query(
        'SELECT username, email FROM users WHERE id = $1',
        [id]
      );
      
      if (currentVolunteerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Volunteer not found' });
      }
      
      const currentVolunteer = currentVolunteerResult.rows[0];
      
      // Only check for conflicts if email or username is actually changed
      if (
        (updates.email && updates.email !== currentVolunteer.email) ||
        (updates.username && updates.username !== currentVolunteer.username)
      ) {
        // Build the query to check for duplicates excluding current user
        let query = 'SELECT username, email FROM users WHERE id != $1 AND (';
        const queryParams = [id];
        const conditions = [];
        
        if (updates.email && updates.email !== currentVolunteer.email) {
          conditions.push(`email = $${queryParams.length + 1}`);
          queryParams.push(updates.email);
        }
        
        if (updates.username && updates.username !== currentVolunteer.username) {
          conditions.push(`username = $${queryParams.length + 1}`);
          queryParams.push(updates.username);
        }
        
        query += conditions.join(' OR ') + ')';
        
        // Only run the query if we actually have conditions to check
        if (conditions.length > 0) {
          const checkExistingQuery = await db.query(query, queryParams);
          
          if (checkExistingQuery.rows.length > 0) {
            const existingUser = checkExistingQuery.rows[0];
            
            if (updates.username && existingUser.username === updates.username) {
              return res.status(400).json({ 
                error: 'Username already taken', 
                field: 'username',
                message: 'This username is already registered. Please choose another username.'
              });
            }
            
            if (updates.email && existingUser.email === updates.email) {
              return res.status(400).json({ 
                error: 'Email already registered', 
                field: 'email',
                message: 'This email is already registered. Please use another email address.'
              });
            }
          }
        }
      }
    }
    
    // Check if password is provided and hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    
    const updatedVolunteer = await AdminModel.updateVolunteer(id, updates);
    
    if (!updatedVolunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }
    
    // Log the updated volunteer (without sensitive fields)
    const { password, ...safeData } = updatedVolunteer;
    console.log('Updated volunteer data:', safeData);
    
    res.json(updatedVolunteer);
  } catch (error) {
    console.error('Error in updateVolunteer:', error);
    res.status(500).json({ error: 'Failed to update volunteer', details: error.message });
  }
};

const deleteVolunteer = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Attempting to delete volunteer:', id);
    
    const result = await AdminModel.deleteVolunteer(id);
    
    if (!result) {
      return res.status(404).json({ error: 'Volunteer not found or already deleted' });
    }
    
    res.json({ message: 'Volunteer deleted successfully', id });
  } catch (error) {
    console.error('Error deleting volunteer:', error);
    res.status(500).json({ error: 'Failed to delete volunteer', details: error.message });
  }
};

const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const adminId = req.user.id;
    console.log('Admin ID from token:', adminId); // Add debug log

    if (!adminId) {
      return res.status(400).json({ error: 'Admin ID not found in token' });
    }

    // Store only the relative path in database
    const photoPath = `/uploads/admin/${req.file.filename}`;

    const result = await AdminModel.updateProfilePhoto(adminId, photoPath);
    
    // Send back the full user object with updated photo - replace db.one with db.query
    const updatedAdminResult = await db.query(
      'SELECT id, name, email, profile_photo FROM admin_users WHERE id = $1',
      [adminId]
    );
    const updatedAdmin = updatedAdminResult.rows[0];

    res.json({
      message: 'Profile photo updated successfully',
      user: {
        ...updatedAdmin,
        role: 'admin',
        profilePhoto: photoPath // Use relative path
      }
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({ 
      error: 'Failed to update profile photo',
      details: error.message
    });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { name, email, currentPassword, newPassword } = req.body;
    
    // First get the current admin user - replace db.one with db.query
    const adminResult = await db.query('SELECT * FROM admin_users WHERE id = $1', [adminId]);
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    const admin = adminResult.rows[0];

    // If changing password, verify current password
    if (newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    // Prepare updates
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (newPassword) {
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedAdmin = await AdminModel.updateAdminProfile(adminId, updates);

    res.json({
      message: 'Profile updated successfully',
      user: {
        ...updatedAdmin,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      details: error.message 
    });
  }
};

module.exports = {
  getUsers,
  updateUser,
  deleteUser,
  getStaffMembers: adminController.getStaffMembers,
  getStaffMember: adminController.getStaffMember,
  createStaffMember: adminController.createStaffMember,
  updateStaffMember: adminController.updateStaffMember,
  deleteStaffMember: adminController.deleteStaffMember,
  getVolunteers,
  getVolunteerById,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
  updateProfilePhoto,
  updateAdminProfile
};
