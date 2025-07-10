const AdminModel = require('../models/adminModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { uploads, uploadToCloudinary } = require('../config/cloudinaryConfig');

// Use the pre-configured multer instances
const uploadVolunteerEvidence = uploads.admin;

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

const createVolunteer = async (req, res) => {
  try {
    // Check if user is admin or staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    uploadVolunteerEvidence.single('skillEvidence')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
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

      // Get Cloudinary URL for skill evidence
      const skillEvidence = req.file ? req.file.path : null;

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
        password, // Will be hashed in the model
        phone,
        date_of_birth,
        status: status || 'active',
        is_verified: is_verified === 'true' || is_verified === true,
        skills,
        disability,
        gender,
        skill_evidence: skillEvidence
      };

      const volunteer = await AdminModel.createVolunteer(volunteerData);
      res.status(201).json(volunteer);
    });
  } catch (error) {
    console.error('Error creating volunteer:', error);
    res.status(500).json({ error: 'Failed to create volunteer' });
  }
};

const updateVolunteer = async (req, res) => {
  try {
    const { id } = req.params;
    
    uploadVolunteerEvidence.single('skillEvidence')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const updates = { ...req.body };

      // Parse JSON fields if they exist
      if (updates.skills) {
        try {
          updates.skills = JSON.parse(updates.skills);
        } catch (e) {
          console.error('Error parsing skills:', e);
        }
      }

      if (updates.disability) {
        try {
          updates.disability = JSON.parse(updates.disability);
        } catch (e) {
          console.error('Error parsing disability:', e);
        }
      }

      // Update skill evidence if new file was uploaded
      if (req.file) {
        updates.skill_evidence = req.file.path;
      }

      const volunteer = await AdminModel.updateVolunteer(id, updates);
      res.json(volunteer);
    });
  } catch (error) {
    console.error('Error updating volunteer:', error);
    res.status(500).json({ error: 'Failed to update volunteer' });
  }
};

const deleteVolunteer = async (req, res) => {
  try {
    const { id } = req.params;
    await AdminModel.deleteVolunteer(id);
    res.json({ message: 'Volunteer deleted successfully' });
  } catch (error) {
    console.error('Error deleting volunteer:', error);
    res.status(500).json({ error: 'Failed to delete volunteer' });
  }
};

const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No profile photo uploaded' });
    }

    const { id } = req.params;
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file, 'admin');
    const photoUrl = result.url;

    const updatedProfile = await AdminModel.updateProfilePhoto(id, photoUrl);
    res.json(updatedProfile);
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({ error: 'Failed to update profile photo' });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // If a new photo was uploaded, add it to the updates
    if (req.file) {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file, 'admin');
      updates.profile_photo = result.url;
    }

    // If password is being updated, hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedProfile = await AdminModel.updateAdminProfile(id, updates);
    res.json(updatedProfile);
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({ error: 'Failed to update admin profile' });
  }
};

module.exports = {
  ...adminController,
  getUsers,
  updateUser,
  deleteUser,
  getVolunteers,
  getVolunteerById,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
  updateProfilePhoto,
  updateAdminProfile
};
