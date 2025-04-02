import React, { useState } from 'react';
import '../../styles/admin/Forms.css';
import api from '../../config/axios';

interface NewVolunteerFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

interface SkillOption {
  value: string;
  label: string;
  description: string;
}

const NewVolunteerForm = ({ onSubmit, onCancel }: NewVolunteerFormProps) => {
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    name_extension: '',
    gender: 'male',
    username: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '',
    status: 'active',
    is_verified: false,
    skills: [] as string[],
    hasDisability: false,
    disabilityType: [] as string[],
    disabilityDetails: ''
  });
  
  // Add state for skill evidence file
  const [skillEvidence, setSkillEvidence] = useState<File | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  
  // Add state for validation errors
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Updated skill options with descriptions
  const skillOptions: SkillOption[] = [
    { value: 'tutoring', label: 'Tutoring/Academic Support', description: 'Helping students with homework, teaching subjects, conducting study sessions' },
    { value: 'mentoring', label: 'Mentoring', description: 'Providing guidance, career advice, and personal development support' },
    { value: 'counseling', label: 'Community Counseling', description: 'Offering emotional support, conflict resolution, and basic mental health services' },
    { value: 'healthcare', label: 'Healthcare Support', description: 'First aid, health education, medical assistance, health awareness programs' },
    { value: 'arts_culture', label: 'Arts & Culture Programs', description: 'Teaching music, art, dance, theater, organizing cultural events' },
    { value: 'sports_recreation', label: 'Sports & Recreation', description: 'Coaching sports, organizing games, planning recreational activities' },
    { value: 'environmental', label: 'Environmental Projects', description: 'Clean-ups, recycling initiatives, environmental education' },
    { value: 'food_distribution', label: 'Food Distribution', description: 'Preparing meals, distributing food packages, managing food banks' },
    { value: 'shelter_support', label: 'Shelter Support', description: 'Working in shelters, housing programs, construction assistance' },
    { value: 'administrative', label: 'Administrative Support', description: 'Office management, data entry, record keeping, documentation' },
    { value: 'event_planning', label: 'Event Planning', description: 'Organizing community events, fundraisers, awareness programs' },
    { value: 'technical', label: 'Technical Support', description: 'Computer skills training, tech troubleshooting, digital literacy programs' },
    { value: 'elderly_support', label: 'Elderly Support', description: 'Elder care, companionship, assistance with daily activities' },
    { value: 'child_care', label: 'Child Care', description: 'Childcare services, after-school programs, recreational activities for children' },
    { value: 'translation', label: 'Translation/Interpretation', description: 'Language services for non-native speakers in the community' },
  ];

  // Available disability types
  const disabilityTypes = [
    'Physical',
    'Mental',
    'Psychological',
    'Learning',
    'Other'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Clear errors when field is edited
      if (errors[name]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  // Replace handleSkillChange with skill dropdown handling
  const handleSkillSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value && !formData.skills.includes(value)) {
      setSelectedSkill(value);
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, value]
      }));
      
      // Clear errors when a skill is selected
      if (errors.skills) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.skills;
          return newErrors;
        });
      }
    }
  };

  // Add method to remove a skill
  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
    
    // If removing all skills, clear the evidence too
    if (formData.skills.length <= 1) {
      setSkillEvidence(null);
    }
  };

  // Add handler for skill evidence file upload
  const handleSkillEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSkillEvidence(file);
    
    if (file && errors.skillEvidence) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.skillEvidence;
        return newErrors;
      });
    }
  };

  const handleDisabilityTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (e.target.checked) {
      setFormData(prev => ({
        ...prev,
        disabilityType: [...prev.disabilityType, value]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        disabilityType: prev.disabilityType.filter(type => type !== value)
      }));
    }
  };

  const handleDisabilityChange = (value: boolean) => {
    setFormData(prev => ({
      ...prev,
      hasDisability: value,
      // Clear disability info if "No" is selected
      disabilityType: value ? prev.disabilityType : [],
      disabilityDetails: value ? prev.disabilityDetails : ''
    }));
  };

  // Add refs for the form fields that might have errors
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const usernameInputRef = React.useRef<HTMLInputElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const passwordInputRef = React.useRef<HTMLInputElement>(null);
  const firstNameInputRef = React.useRef<HTMLInputElement>(null);
  const lastNameInputRef = React.useRef<HTMLInputElement>(null);
  
  // Function to scroll to and focus the first field with an error
  const scrollToFirstError = (errorFields: {[key: string]: string}) => {
    const fieldRefs: {[key: string]: React.RefObject<HTMLInputElement>} = {
      first_name: firstNameInputRef,
      last_name: lastNameInputRef,
      username: usernameInputRef,
      email: emailInputRef,
      name: nameInputRef,
      password: passwordInputRef
    };
    
    // Find the first field with an error that has a ref
    const firstErrorField = Object.keys(errorFields).find(field => fieldRefs[field]);
    
    if (firstErrorField && fieldRefs[firstErrorField]?.current) {
      // Scroll to the input
      fieldRefs[firstErrorField].current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Focus the input after a short delay to allow scrolling to complete
      setTimeout(() => {
        fieldRefs[firstErrorField].current?.focus();
      }, 400);
    }
  };
  
  // Effect to scroll to errors when they appear
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToFirstError(errors);
    }
  }, [errors]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    // Validate date of birth - minimum age of 16 years
    if (formData.date_of_birth) {
      const birthDate = new Date(formData.date_of_birth);
      const today = new Date();
      const minAgeDate = new Date();
      minAgeDate.setFullYear(today.getFullYear() - 16);
      
      if (birthDate > minAgeDate) {
        newErrors.date_of_birth = 'Volunteers must be at least 16 years old';
      }
    }
    
    // Add skill validation
    if (formData.skills.length === 0) {
      newErrors.skills = 'Please select at least one skill';
    }
    
    // Add skill evidence validation 
    if (formData.skills.length > 0 && !skillEvidence) {
      newErrors.skillEvidence = 'Please upload evidence for at least one of your skills';
    } else if (skillEvidence && skillEvidence.size > 5 * 1024 * 1024) { // 5MB limit
      newErrors.skillEvidence = 'File is too large (max 5MB)';
    }
    
    setErrors(newErrors);
    
    // Scroll to the first error if there are any
    if (Object.keys(newErrors).length > 0) {
      scrollToFirstError(newErrors);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Create full name from name components
    const fullName = [
      formData.first_name,
      formData.middle_name,
      formData.last_name,
      formData.name_extension
    ].filter(Boolean).join(' ');

    try {
      // Create FormData object for file upload
      const submitFormData = new FormData();
      
      // Add all form fields to FormData
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'skills' && key !== 'disabilityType' && key !== 'hasDisability' && key !== 'disabilityDetails') {
          submitFormData.append(key, value as string);
        }
      });
      
      // Add name field
      submitFormData.append('name', fullName); 
      
      // Add skills array as JSON string
      submitFormData.append('skills', JSON.stringify(formData.skills));
      
      // IMPORTANT: Log the file being uploaded to confirm it exists
      console.log('Skill evidence file to upload:', skillEvidence);
      
      // Add skill evidence file - ensure the field name matches exactly what the backend expects
      if (skillEvidence) {
        submitFormData.append('skillEvidence', skillEvidence);
        console.log('Added skill evidence to FormData');
      }
      
      // Add disability object if applicable
      if (formData.hasDisability) {
        const disabilityObject = {
          types: formData.disabilityType,
          details: formData.disabilityDetails
        };
        submitFormData.append('disability', JSON.stringify(disabilityObject));
      } else {
        submitFormData.append('disability', JSON.stringify({ hasDisability: false }));
      }
      
      // Debugging: Check what's in the FormData
      for (let pair of (submitFormData as any).entries()) {
        console.log(pair[0] + ': ' + (pair[0] === 'skillEvidence' ? 'File object' : pair[1]));
      }
      
      // Let the parent component handle the submission
      await onSubmit(submitFormData);
      
      // Reset form after successful submission
      setFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        name_extension: '',
        gender: 'male',
        username: '',
        email: '',
        password: '',
        phone: '',
        date_of_birth: '',
        status: 'active',
        is_verified: false,
        skills: [],
        hasDisability: false,
        disabilityType: [],
        disabilityDetails: ''
      });
      setSkillEvidence(null);
      setSelectedSkill('');
      
    } catch (error: any) {
      console.error('Error submitting form:', error);
      
      // Handle specific errors from server
      if (error.response?.data) {
        const newErrors = { ...errors };
        
        if (error.response.data.field === 'username') {
          newErrors.username = error.response.data.message || 'Username already taken';
        } else if (error.response.data.field === 'email') {
          newErrors.email = error.response.data.message || 'Email already registered';
        } else {
          // Generic error
          newErrors.form = error.response.data.message || 'An error occurred';
        }
        
        setErrors(newErrors);
        
        // Scroll to the field with the error
        setTimeout(() => {
          scrollToFirstError(newErrors);
        }, 100);
      } else {
        setErrors(prev => ({
          ...prev,
          form: 'Failed to create volunteer'
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add gender options
  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  // Define styles to override the problematic flex-direction
  const skillsGridStyle = {
    marginBottom: 0,
    paddingBottom: 0
  };
  
  // Add function to render skill badge
  const renderSkillBadge = (skill: string) => {
    const skillOption = skillOptions.find(option => option.value === skill);
    return (
      <div key={skill} className="skill-badge">
        <span className="skill-label">{skillOption?.label || skill}</span>
        <button 
          type="button"
          className="remove-skill-btn"
          onClick={() => handleRemoveSkill(skill)}
          title="Remove skill"
        >
          ×
        </button>
      </div>
    );
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-contents wide-form">
        <div className="modal-header">
          <h2>New Volunteer</h2>
          <button className="close-button" onClick={onCancel}>&times;</button>
        </div>
        
        {/* Add global error message */}
        {errors.form && (
          <div className="error-banner">
            {errors.form}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon material-icons">person</span>
              Personal Information
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>First Name:</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter first name"
                  className={errors.first_name ? 'error-input' : ''}
                  ref={firstNameInputRef}
                />
                {errors.first_name && <span className="error-message">{errors.first_name}</span>}
              </div>
              
              <div className="form-group">
                <label>Middle Name: <span className="optional-field">(Optional)</span></label>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleChange}
                  placeholder="Enter middle name"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Last Name:</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter last name"
                  className={errors.last_name ? 'error-input' : ''}
                  ref={lastNameInputRef}
                />
                {errors.last_name && <span className="error-message">{errors.last_name}</span>}
              </div>
              
              <div className="form-group">
                <label>Name Extension: <span className="optional-field">(Optional)</span></label>
                <input
                  type="text"
                  name="name_extension"
                  value={formData.name_extension}
                  onChange={handleChange}
                  placeholder="Jr., Sr., III, etc."
                />
              </div>
            </div>
            
            {/* Gender selection with improved styling */}
            <div className="form-group">
              <label>Gender:</label>
              <div className="gender-options">
                {genderOptions.map(option => (
                  <label key={option.value} className="gender-option">
                    <input
                      type="radio"
                      name="gender"
                      value={option.value}
                      checked={formData.gender === option.value}
                      onChange={handleChange}
                    />
                    <span className="radio-checkmark"></span>
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter email address"
                  className={errors.email ? 'error-input' : ''}
                  ref={emailInputRef}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Phone:</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Date of Birth:</label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                placeholder="Select date of birth"
                className={errors.date_of_birth ? 'error-input' : ''}
                max={(() => {
                  const date = new Date();
                  date.setFullYear(date.getFullYear() - 16);
                  return date.toISOString().split('T')[0];
                })()}
              />
              {errors.date_of_birth && <span className="error-message">{errors.date_of_birth}</span>}
              <span className="form-note">Volunteers must be at least 16 years old</span>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon material-icons">account_circle</span>
              Account Information
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Create username"
                  className={errors.username ? 'error-input' : ''}
                  ref={usernameInputRef}
                />
                {errors.username && <span className="error-message">{errors.username}</span>}
              </div>

              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Create password"
                  className={errors.password ? 'error-input' : ''}
                  ref={passwordInputRef}
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Status:</label>
                <select name="status" value={formData.status} onChange={handleChange} className="status-select">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              
              <div className="form-group verification-checkbox">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="is_verified"
                    checked={formData.is_verified}
                    onChange={handleChange}
                  />
                  <span className="checkbox-label">Verified Account</span>
                </label>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon material-icons">build</span>
              Skills
            </h3>
            <p className="section-description">Select skills this volunteer has:</p>
            
            {/* Replace checkbox grid with dropdown */}
            <div className="form-group">
              <label htmlFor="skills">Select Skills</label>
              <select
                id="skills"
                value={selectedSkill}
                onChange={handleSkillSelect}
                className={errors.skills ? 'error-input' : ''}
              >
                <option value="">-- Select a skill to add --</option>
                {skillOptions.map(skill => (
                  <option 
                    key={skill.value} 
                    value={skill.value}
                    disabled={formData.skills.includes(skill.value)}
                  >
                    {skill.label}
                  </option>
                ))}
              </select>
              {errors.skills && <span className="error-message">{errors.skills}</span>}
            </div>
            
            {/* Display selected skills as badges */}
            {formData.skills.length > 0 && (
              <div className="selected-skills">
                <label>Selected skills:</label>
                <div className="skill-badges">
                  {formData.skills.map(skill => renderSkillBadge(skill))}
                </div>
                
                {/* Show description for selected skills */}
                <div className="skills-description">
                  {formData.skills.map(skill => {
                    const skillOption = skillOptions.find(option => option.value === skill);
                    return skillOption ? (
                      <div key={skill} className="skill-description-item">
                        <strong>{skillOption.label}:</strong> {skillOption.description}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            
            {/* Add skill evidence upload */}
            {formData.skills.length > 0 && (
              <div className="form-group document-upload-container">
                <label htmlFor="skillEvidence">Skill Evidence/Certificate <span className="upload-hint">(Certificate, proof of training, or other evidence)</span></label>
                <div className={`file-upload-wrapper ${errors.skillEvidence ? 'has-error' : ''}`}>
                  {!skillEvidence ? (
                    <>
                      <label htmlFor="skillEvidence" className="file-upload-label">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                          <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                        </svg>
                        <span>Upload evidence of skills</span>
                      </label>
                      <input
                        type="file"
                        id="skillEvidence"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleSkillEvidenceChange}
                        className="file-input"
                      />
                    </>
                  ) : (
                    <div className="file-preview">
                      <div className="file-info">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5V8H19v12H5V4h8v-.5zM7 13h10v1H7v-1zm0 3h10v1H7v-1zm0-6h5v1H7v-1z"/>
                        </svg>
                        <span className="file-name">{skillEvidence.name}</span>
                      </div>
                      <button 
                        type="button" 
                        className="remove-file-btn"
                        onClick={() => setSkillEvidence(null)}
                        title="Remove file"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <p className="evidence-hint">Upload a certificate, training record, or proof of experience for your primary skill.</p>
                {errors.skillEvidence && <span className="error-message">{errors.skillEvidence}</span>}
              </div>
            )}
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon material-icons">accessibility</span>
              Disability Information
            </h3>
            <p className="section-description">We support volunteers of all abilities. This information helps us provide appropriate support.</p>
            
            {/* Update the disability question with improved styling */}
            <div className="disability-question">
              <label>Does the volunteer have any disability?</label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="disability-yes"
                    name="hasDisability"
                    checked={formData.hasDisability === true}
                    onChange={() => handleDisabilityChange(true)}
                  />
                  <label htmlFor="disability-yes">Yes</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="disability-no"
                    name="hasDisability"
                    checked={formData.hasDisability === false}
                    onChange={() => handleDisabilityChange(false)}
                  />
                  <label htmlFor="disability-no">No</label>
                </div>
              </div>
            </div>
            
            {formData.hasDisability && (
              <div className="disability-types">
                <label>Type of disability (select all that apply):</label>
                <div className="disability-checkbox-grid">
                  {disabilityTypes.map((type) => (
                    <div key={type} className="disability-checkbox">
                      <input
                        type="checkbox"
                        id={`disability-${type}`}
                        value={type}
                        checked={formData.disabilityType.includes(type)}
                        onChange={handleDisabilityTypeChange}
                      />
                      <label htmlFor={`disability-${type}`}>{type}</label>
                    </div>
                  ))}
                </div>
                
                {formData.disabilityType.length > 0 && (
                  <div className="form-group mt-2">
                    <label htmlFor="disabilityDetails">Please specify details about the disability:</label>
                    <textarea
                      id="disabilityDetails"
                      name="disabilityDetails"
                      value={formData.disabilityDetails}
                      onChange={handleChange}
                      placeholder="Provide details about the disability (nature, accommodations needed, etc.)"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? <span className="spinner"></span> : 'Create Volunteer'}
            </button>
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onCancel} 
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewVolunteerForm;
