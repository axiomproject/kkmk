import React, { useState, useEffect } from 'react';
import '../../styles/admin/Forms.css';

interface NewScholarFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  submitError?: { field?: string, detail?: string } | null; // Add this prop
}

const NewScholarForm = ({ onSubmit, onCancel, submitError }: NewScholarFormProps) => {
  const educationLevels = [
    'Elementary',
    'Junior High School',
    'Senior High School',
    'Vocational',
    'College',
    'Graduate School'
  ];
  
  const incomeRanges = [
    'below P10,000',
    'P10,001 - P15,000',
    'P15,001 - P20,000',
    'P20,001 - P25,000',
    'P25,001 - P30,000',
    'P30,001 and above'
  ];

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    name_extension: '',
    name: '', // Keep for compatibility
    username: '',
    email: '', // Add email field to initial state
    password: '',
    phone: '',
    status: 'active',
    is_verified: false,
    date_of_birth: '',
    gender: 'male',
    guardian_name: '',
    guardian_phone: '',
    address: '',
    education_level: '',
    school: '',
    parents_income: '',
    role: 'scholar',
    favorite_subject: '',
    favorite_activity: '',
    favorite_color: '',
    other_details: ''
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Add useEffect to handle server-side errors
  useEffect(() => {
    if (submitError && submitError.field) {
      setErrors(prev => ({
        ...prev,
        [submitError.field as string]: submitError.detail || `This ${submitError.field} is already in use`
      }));
    }
  }, [submitError]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    // First name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    // Last name validation
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    
    // Date of Birth validation - minimum age of 5 years
    if (formData.date_of_birth) {
      const dobDate = new Date(formData.date_of_birth);
      const today = new Date();
      const minAgeDate = new Date();
      minAgeDate.setFullYear(today.getFullYear() - 5);
      
      if (dobDate > minAgeDate) {
        newErrors.date_of_birth = 'Scholar must be at least 5 years old';
      }
    }
    
    // Phone validation (optional)
    if (formData.phone && !/^\d{10,15}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    // Guardian phone validation (optional)
    if (formData.guardian_phone && !/^\d{10,15}$/.test(formData.guardian_phone.replace(/\D/g, ''))) {
      newErrors.guardian_phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Generate full name from components
    const fullName = [
      formData.first_name,
      formData.middle_name,
      formData.last_name,
      formData.name_extension
    ].filter(Boolean).join(' ');
    
    // Add additional fields required for both users and scholars tables
    const submissionData = {
      // Basic personal info for users table
      first_name: formData.first_name,
      middle_name: formData.middle_name || null,
      last_name: formData.last_name,
      name_extension: formData.name_extension || null,
      name: fullName,
      
      // Account info for users table
      username: formData.username,
      password: formData.password,
      email: formData.email,
      phone: formData.phone || null,
      status: formData.status || 'active',
      is_verified: formData.is_verified,
      
      // Personal info shared between tables
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender,
      guardian_name: formData.guardian_name || null,
      guardian_phone: formData.guardian_phone || null,
      address: formData.address || null,
      education_level: formData.education_level || null, // Maps to grade_level in scholars table
      school: formData.school || null,
      parents_income: formData.parents_income || null,
      
      // Scholar-specific fields for scholars table
      favorite_subject: formData.favorite_subject || null,
      favorite_activity: formData.favorite_activity || null,
      favorite_color: formData.favorite_color || null,
      other_details: formData.other_details || null,
      current_amount: 0,  // Default values
      amount_needed: 0,   // Default values
      
      // Role definition
      role: 'scholar'
    };
    
    // Note: The scholars table status will automatically be set to "inactive" if is_verified is true
    // This is handled by the backend model
    
    console.log('Submitting scholar data:', submissionData);
    onSubmit(submissionData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-contents scholar-edit-form">
        <div className="modal-header">
          <h2>New Scholar</h2>
          <button className="close-button" onClick={onCancel}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="edit-form scholar-form">
          {/* Personal Information Section */}
          <div className="form-section">
            <div className="form-section-title">Personal Information</div>
            
            {/* Name fields - 4 columns in one row */}
            <div className="form-row">
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="first_name">First Name:</label>
                  <input
                    id="first_name"
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter first name"
                    className={errors.first_name ? 'error-input' : ''}
                  />
                  {errors.first_name && <span className="error-text">{errors.first_name}</span>}
                </div>
              </div>
              
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="middle_name">Middle Name:</label>
                  <input
                    id="middle_name"
                    type="text"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleChange}
                    placeholder="Enter middle name (optional)"
                  />
                </div>
              </div>
              
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="last_name">Last Name:</label>
                  <input
                    id="last_name"
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter last name"
                    className={errors.last_name ? 'error-input' : ''}
                  />
                  {errors.last_name && <span className="error-text">{errors.last_name}</span>}
                </div>
              </div>
              
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="name_extension">Name Extension:</label>
                  <input
                    id="name_extension"
                    type="text"
                    name="name_extension"
                    value={formData.name_extension}
                    onChange={handleChange}
                    placeholder="Jr., Sr., III, etc."
                  />
                </div>
              </div>
            </div>
            
            {/* Second row - Gender, DOB, Phone */}
            <div className="form-row">
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="gender">Gender:</label>
                  <select 
                    id="gender"
                    name="gender" 
                    value={formData.gender} 
                    onChange={handleChange}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="date_of_birth">Date of Birth:</label>
                  <input
                    id="date_of_birth"
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {errors.date_of_birth && <span className="error-text">{errors.date_of_birth}</span>}
                </div>
              </div>
              
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="phone">Phone:</label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>
              </div>
            </div>
          </div>
          
          {/* Account Information Section */}
          <div className="form-section">
            <div className="form-section-title">Account Information</div>
            <div className="form-row three-columns">
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="username">Username:</label>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="Enter username"
                    className={errors.username ? 'error-input' : ''}
                  />
                  {errors.username && <span className="error-text">{errors.username}</span>}
                </div>
              </div>
              
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="email">Email:</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter email"
                    className={`scholar-email-input ${errors.email ? 'error-input' : ''}`}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
              </div>
              
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="status">Status:</label>
                  <select id="status" name="status" value={formData.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password:</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter password"
                className="full-width-field"
              />
            </div>
          </div>
          
          {/* Guardian Information */}
          <div className="form-section">
            <div className="form-section-title">Guardian Information</div>
            <div className="form-row">
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="guardian_name">Guardian Name:</label>
                  <input
                    id="guardian_name"
                    type="text"
                    name="guardian_name"
                    value={formData.guardian_name}
                    onChange={handleChange}
                    placeholder="Enter guardian's name"
                  />
                </div>
              </div>
              
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="guardian_phone">Guardian Phone:</label>
                  <input
                    id="guardian_phone"
                    type="tel"
                    name="guardian_phone"
                    value={formData.guardian_phone}
                    onChange={handleChange}
                    placeholder="Enter guardian's phone"
                  />
                  {errors.guardian_phone && <span className="error-text">{errors.guardian_phone}</span>}
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="address">Address:</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter address"
                rows={2}
                className="full-width-field"
              />
            </div>
          </div>
          
          {/* Education Information */}
          <div className="form-section">
            <div className="form-section-title">Education Information</div>
            <div className="form-row three-columns">
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="education_level">Education Level:</label>
                  <select
                    id="education_level"
                    name="education_level"
                    value={formData.education_level}
                    onChange={handleChange}
                  >
                    <option value="">Select Education Level</option>
                    {educationLevels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="school">School:</label>
                  <input
                    id="school"
                    type="text"
                    name="school"
                    value={formData.school}
                    onChange={handleChange}
                    placeholder="Enter school name"
                  />
                </div>
              </div>
              
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="parents_income">Parents' Income:</label>
                  <select
                    id="parents_income"
                    name="parents_income"
                    value={formData.parents_income}
                    onChange={handleChange}
                  >
                    <option value="">Select income range</option>
                    {incomeRanges.map((range) => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">Create Scholar</button>
            <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewScholarForm;
