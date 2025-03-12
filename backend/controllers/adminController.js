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
    res.json(volunteer);
  } catch (error) {
    console.error('Error fetching volunteer:', error);
    res.status(500).json({ error: 'Failed to fetch volunteer details' });
  }
};

const createVolunteer = async (req, res) => {
  try {
    const { username, email, password, skills, disability, date_of_birth, ...otherData } = req.body;

    // Validate minimum age (16 years)
    if (date_of_birth) {
      const birthDate = new Date(date_of_birth);
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

    // First check if username or email already exists
    const checkExistingQuery = await db.query(
      'SELECT username, email FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (checkExistingQuery.rows.length > 0) {
      const existingUser = checkExistingQuery.rows[0];
      
      if (existingUser.username === username) {
        return res.status(400).json({ 
          error: 'Username already taken', 
          field: 'username',
          message: 'This username is already registered. Please choose another username.'
        });
      }
      
      if (existingUser.email === email) {
        return res.status(400).json({ 
          error: 'Email already registered', 
          field: 'email',
          message: 'This email is already registered. Please use another email address.'
        });
      }
    }
    
    // Process skills and disability fields if they exist
    let processedData = { ...otherData };
    
    // Format skills as JSON string if provided
    if (skills && Array.isArray(skills)) {
      processedData.skills = JSON.stringify(skills);
    }
    
    // Format disability object as JSON string if provided
    if (disability !== undefined) {
      processedData.disability = disability ? JSON.stringify(disability) : null;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Call the model function with processed data
    const newVolunteer = await AdminModel.createVolunteer({
      ...processedData,
      username,
      email,
      date_of_birth,
      password: hashedPassword
    });

    console.log('New volunteer created:', newVolunteer);
    res.status(201).json(newVolunteer);
  } catch (error) {
    console.error('Error creating volunteer:', error);
    
    // Check for specific database constraint violations
    if (error.code === '23505') { // PostgreSQL unique constraint violation code
      if (error.constraint === 'users_username_key') {
        return res.status(400).json({ 
          error: 'Username already taken',
          field: 'username',
          message: 'This username is already registered. Please choose another username.'
        });
      } else if (error.constraint === 'users_email_key') {
        return res.status(400).json({ 
          error: 'Email already registered',
          field: 'email',
          message: 'This email is already registered. Please use another email address.'
        });
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to create volunteer',
      details: error.message 
    });
  }
};

const updateVolunteer = async (req, res) => {
  try {
    // Log the request body for debugging
    console.log('Update volunteer request body:', req.body);
    
    const { id } = req.params;
    const updates = req.body;
    
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
