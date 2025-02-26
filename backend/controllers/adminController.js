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
    const { password, ...otherData } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newVolunteer = await AdminModel.createVolunteer({
      ...otherData,
      password: hashedPassword
    });

    res.status(201).json(newVolunteer);
  } catch (error) {
    console.error('Error creating volunteer:', error);
    res.status(500).json({ 
      error: 'Failed to create volunteer',
      details: error.message 
    });
  }
};

const updateVolunteer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // If password is provided, hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedVolunteer = await AdminModel.updateVolunteer(id, updates);
    res.json(updatedVolunteer);
  } catch (error) {
    console.error('Error updating volunteer:', error);
    res.status(500).json({ error: 'Failed to update volunteer' });
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
