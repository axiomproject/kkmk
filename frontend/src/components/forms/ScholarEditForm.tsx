import React, { useState, useEffect } from 'react';
import '../../styles/admin/Forms.css';

interface ScholarEditFormProps {
  scholar: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const ScholarEditForm = ({ scholar, onSubmit, onCancel }: ScholarEditFormProps) => {
  interface FormData {
      first_name: string;
      middle_name: string;
      last_name: string;
      name_extension: string;
      name: string; // Keep for compatibility
      username: string;
      email: string;
      phone: string;
      date_of_birth: string;
      status: string;
      is_verified: boolean;
      password?: string;
      gender: string;
      guardian_name: string;
      guardian_phone: string;
      address: string;
      education_level: string;
      school: string;
      parents_income: string;
  }
  
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
  
  // Debug log to check what data is being received
  console.log("Scholar data received in EditForm:", scholar);
  
  // Split name into components during initialization
  const initializeNameFields = () => {
    // Init with empty values
    let firstName = '';
    let middleName = '';
    let lastName = '';
    let nameExtension = '';

    // First priority: use specific name fields if they exist
    if (scholar.first_name) {
      firstName = scholar.first_name || '';
      middleName = scholar.middle_name || '';
      lastName = scholar.last_name || '';
      nameExtension = scholar.name_extension || '';
      console.log("Using individual name fields:", { firstName, middleName, lastName, nameExtension });
    } 
    // Second priority: if full name exists but no specific fields, split the full name
    else if (scholar.name) {
      console.log("No individual fields found, splitting full name:", scholar.name);
      const nameParts = scholar.name.split(' ');
      
      // If there are at least 2 parts, use first and last parts
      if (nameParts.length >= 2) {
        firstName = nameParts[0];
        lastName = nameParts[nameParts.length - 1];
        
        // If more than 2 parts, the middle parts form the middle name
        if (nameParts.length > 2) {
          middleName = nameParts.slice(1, nameParts.length - 1).join(' ');
        }
      } 
      // If only one part, it's the first name
      else if (nameParts.length === 1) {
        firstName = nameParts[0];
      }
    }

    return { firstName, middleName, lastName, nameExtension };
  };

  // Get name components
  const { firstName, middleName, lastName, nameExtension } = initializeNameFields();

  // Initialize form data
  const [formData, setFormData] = useState<FormData>({
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      name_extension: nameExtension,
      name: scholar.name || '', // Keep original name for backwards compatibility
      username: scholar.username || '',
      email: scholar.email || '',
      phone: scholar.phone || '',
      date_of_birth: scholar.date_of_birth ? 
        new Date(scholar.date_of_birth).toISOString().split('T')[0] : '',
      status: scholar.status || 'active',
      is_verified: scholar.is_verified || false,
      password: '',
      gender: scholar.gender || 'male', 
      guardian_name: scholar.guardian_name || '',
      guardian_phone: scholar.guardian_phone || '',
      address: scholar.address || '',
      education_level: scholar.education_level || '',
      school: scholar.school || '',
      parents_income: scholar.parents_income || ''
  });
  
  // Log form data to verify initialization
  useEffect(() => {
    console.log("Form data initialized:", formData);
  }, []);
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});

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
    
    // Guardian phone validation
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
    
    // Create a new object with all form data except password
    const submitData = { ...formData };
    
    // Generate full name from components
    submitData.name = [
      formData.first_name,
      formData.middle_name,
      formData.last_name,
      formData.name_extension
    ].filter(Boolean).join(' ');
    
    // Only include password if it was actually entered (not empty)
    if (!submitData.password) {
      delete submitData.password;
    }
    
    // Log the data being submitted
    console.log("Submitting scholar update:", submitData);
    
    onSubmit(submitData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-contents scholar-edit-form">
        <div className="modal-header">
          <h2>Edit Scholar</h2>
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
          
          {/* Account Information Section - 3 columns per row */}
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
                  />
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
                    className="scholar-email-input"
                  />
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
              <label htmlFor="password">Password: (Leave empty to keep current)</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter new password"
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
            <button type="submit" className="submit-btn">Save Changes</button>
            <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScholarEditForm;
