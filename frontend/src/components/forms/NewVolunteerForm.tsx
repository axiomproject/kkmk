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
  examples: string;
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
  
  // Add state for validation errors
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available skill options with examples
  const skillOptions: SkillOption[] = [
    { value: 'teaching', label: 'Teaching', examples: 'Tutoring, mentoring, curriculum development' },
    { value: 'programming', label: 'Programming', examples: 'Web development, mobile apps, data analysis' },
    { value: 'writing', label: 'Writing', examples: 'Content creation, grant writing, editing' },
    { value: 'design', label: 'Design', examples: 'Graphic design, UI/UX, illustration' },
    { value: 'fundraising', label: 'Fundraising', examples: 'Event organization, donor relations, crowdfunding' },
    { value: 'counseling', label: 'Counseling', examples: 'Emotional support, career guidance, conflict resolution' },
    { value: 'logistics', label: 'Logistics', examples: 'Event planning, transportation coordination, resource management' },
    { value: 'medical', label: 'Medical', examples: 'First aid, health education, medical assistance' },
    { value: 'social_media', label: 'Social Media', examples: 'Content strategy, community management, analytics' },
    { value: 'photography', label: 'Photography/Videography', examples: 'Event documentation, promotional material creation' },
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

  const handleSkillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (e.target.checked) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, value]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        skills: prev.skills.filter(skill => skill !== value)
      }));
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
    
    // Prepare the final data for submission
    const finalData = {
      ...formData,
      name: fullName, // Add the full name field
      disability: formData.hasDisability ? {
        types: formData.disabilityType,
        details: formData.disabilityDetails
      } : null
    } as Partial<typeof formData>;
    
    // Remove intermediate form fields
    delete finalData.hasDisability;
    delete finalData.disabilityType;
    delete finalData.disabilityDetails;
    
    try {
      // Changed: Await the promise returned by onSubmit instead of expecting it to throw
      await onSubmit(finalData);
      // If we get here, submission was successful
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
            
            <div className="skills-grid">
              {skillOptions.map((skill) => (
                <div key={skill.value} className="skill-checkbox-container">
                  <div className="skill-checkbox">
                    <input
                      type="checkbox"
                      id={`skill-${skill.value}`}
                      value={skill.value}
                      checked={formData.skills.includes(skill.value)}
                      onChange={handleSkillChange}
                    />
                    <label htmlFor={`skill-${skill.value}`}>{skill.label}</label>
                  </div>
                  <p className="skill-examples">{skill.examples}</p>
                </div>
              ))}
            </div>
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
