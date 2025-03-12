import React, { useState, useEffect, useRef } from 'react';
import '../../styles/admin/Forms.css';
import api from '../../config/axios';

interface VolunteerEditFormProps {
  volunteer: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

interface SkillOption {
  value: string;
  label: string;
  examples: string;
}

const VolunteerEditForm = ({ volunteer, onSubmit, onCancel }: VolunteerEditFormProps) => {
  // Split the existing name into components if available
  const splitName = (fullName: string) => {
    if (!fullName) return { first: '', middle: '', last: '', extension: '' };
    
    const nameParts = fullName.trim().split(' ');
    
    // Try to detect if the last part is an extension (Jr., Sr., III, etc.)
    let extension = '';
    let last = nameParts[nameParts.length - 1];
    
    const extensionPattern = /^(Jr\.|Sr\.|I|II|III|IV|V)$/i;
    if (nameParts.length > 1 && extensionPattern.test(last)) {
      extension = last;
      nameParts.pop();
      last = nameParts[nameParts.length - 1] || '';
    }
    
    // Handle the case with 3+ name parts (first, middle, last)
    let first = nameParts[0] || '';
    let middle = '';
    
    if (nameParts.length > 2) {
      // Everything between first and last name is considered middle name
      middle = nameParts.slice(1, -1).join(' ');
    } else if (nameParts.length === 2) {
      // With only 2 parts, assume first and last name
      last = nameParts[1];
    }
    
    return { first, middle, last, extension };
  };
  
  // Get name components from the full name
  const nameComponents = splitName(volunteer.name || '');

  const [formData, setFormData] = useState({
    // Add separate name fields
    first_name: volunteer.first_name || nameComponents.first,
    middle_name: volunteer.middle_name || nameComponents.middle,
    last_name: volunteer.last_name || nameComponents.last,
    name_extension: volunteer.name_extension || nameComponents.extension,
    gender: volunteer.gender || 'male', // Default to male if not provided
    
    // Keep existing fields
    email: volunteer.email || '',
    username: volunteer.username || '',
    phone: volunteer.phone || '',
    date_of_birth: volunteer.date_of_birth ? 
      new Date(volunteer.date_of_birth).toISOString().split('T')[0] : '',
    status: volunteer.status || 'active',
    is_verified: volunteer.is_verified || false,
    password: '', // Add password field
    skills: [] as string[], // Skills array
    hasDisability: null as boolean | null, // Whether the volunteer has disability
    disabilityType: [] as string[], // Types of disabilities
    disabilityDetails: '' // Additional disability details
  });

  // Add state for validation errors and submission state
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalEmail] = useState(volunteer.email || '');
  const [originalUsername] = useState(volunteer.username || '');

  // Add refs for the form fields that might have errors
  const emailInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dateOfBirthRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  
  // Add refs for new fields
  const firstNameInputRef = useRef<HTMLInputElement>(null);
  const lastNameInputRef = useRef<HTMLInputElement>(null);

  // Add gender options
  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  // Function to scroll to and focus the first field with an error
  const scrollToFirstError = (errorFields: {[key: string]: string}) => {
    const fieldRefs: {[key: string]: React.RefObject<HTMLInputElement>} = {
      first_name: firstNameInputRef,
      last_name: lastNameInputRef,
      username: usernameInputRef,
      email: emailInputRef,
      name: nameInputRef,
      date_of_birth: dateOfBirthRef,
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
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToFirstError(errors);
    }
  }, [errors]);

  // Initialize skills and disability data from volunteer object
  useEffect(() => {
    let parsedSkills = volunteer.skills;
    let parsedDisability = volunteer.disability;

    // Parse skills if they're stored as a string
    if (typeof volunteer.skills === 'string') {
      try {
        parsedSkills = JSON.parse(volunteer.skills);
      } catch (e) {
        console.error('Error parsing skills:', e);
        parsedSkills = [];
      }
    }

    // Parse disability if it's stored as a string
    if (typeof volunteer.disability === 'string') {
      try {
        parsedDisability = JSON.parse(volunteer.disability);
      } catch (e) {
        console.error('Error parsing disability:', e);
        parsedDisability = null;
      }
    }

    setFormData(prev => ({
      ...prev,
      skills: Array.isArray(parsedSkills) ? parsedSkills : [],
      hasDisability: parsedDisability ? true : false,
      disabilityType: parsedDisability?.types || [],
      disabilityDetails: parsedDisability?.details || ''
    }));
  }, [volunteer]);

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

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    // Validate first name
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    
    // Validate last name
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    
    // Validate email if it's changed from the original
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Validate username if it's changed from the original
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    // Validate password only if one is provided (optional on edit)
    if (formData.password && formData.password.length > 0 && formData.password.length < 6) {
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

  // Add functions to check email and username availability
  const checkEmailAvailability = async (email: string): Promise<boolean> => {
    try {
      // Only check if email has been changed from original
      if (email === originalEmail) return false;
      
      const response = await api.get(`/check-email?email=${encodeURIComponent(email)}`);
      return !response.data.available;
    } catch (error: any) {
      console.error('Error checking email:', error);
      // Check if the error response indicates email is taken
      if (error.response?.status === 409) {
        return true; // Email is taken
      }
      // Default to false to avoid blocking submission
      return false;
    }
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      // Only check if username has been changed from original
      if (username === originalUsername) return false;
      
      const response = await api.get(`/check-username?username=${encodeURIComponent(username)}`);
      return !response.data.available;
    } catch (error: any) {
      console.error('Error checking username:', error);
      // Check if the error response indicates username is taken
      if (error.response?.status === 409) {
        return true; // Username is taken
      }
      // Default to false to avoid blocking submission
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setErrors({}); // Clear any previous errors
    
    try {
      // Check if email or username is already taken but exclude current user's email/username
      let emailTaken = false;
      let usernameTaken = false;
      
      // Only check email if it changed from original
      if (formData.email !== originalEmail) {
        emailTaken = await checkEmailAvailability(formData.email);
      }
      
      // Only check username if it changed from original
      if (formData.username !== originalUsername) {
        usernameTaken = await checkUsernameAvailability(formData.username);
      }
      
      if (emailTaken || usernameTaken) {
        const newErrors: {[key: string]: string} = {};
        if (emailTaken) newErrors.email = 'Email is already taken';
        if (usernameTaken) newErrors.username = 'Username is already taken';
        setErrors(newErrors);
        setIsSubmitting(false);
        return;
      }
      
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
        name: fullName, // Add the combined full name
        // Only include password if it's not empty
        password: formData.password || undefined,
        // Format disability information
        disability: formData.hasDisability ? {
          types: formData.disabilityType,
          details: formData.disabilityDetails
        } : null
      } as Partial<typeof formData>;

      // Remove intermediate form fields
      delete finalData.hasDisability;
      delete finalData.disabilityType;
      delete finalData.disabilityDetails;

      await onSubmit(finalData);
      // If we get here without throwing, submission was successful
    } catch (error: any) {
      console.error('Error updating volunteer:', error);
      
      // Handle specific errors from server
      if (error.response?.data) {
        const newErrors: {[key: string]: string} = {};
        
        if (error.response.data.field === 'username') {
          newErrors.username = error.response.data.message || 'Username already taken';
        } else if (error.response.data.field === 'email') {
          newErrors.email = error.response.data.message || 'Email already registered';
        } else if (error.response.data.field === 'date_of_birth') {
          newErrors.date_of_birth = error.response.data.message || 'Invalid date of birth';
        } else {
          // Generic error
          newErrors.form = error.response.data.message || error.response.data.error || 'An error occurred';
        }
        
        setErrors(newErrors);
      } else {
        setErrors({ form: 'Failed to update volunteer' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-contents wide-form">
        <div className="modal-header">
          <h2>Edit Volunteer</h2>
          <button className="close-button" onClick={onCancel}>&times;</button>
        </div>

        {/* Add global error message if present */}
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
            
            {/* Name fields - structured in form-row for consistency */}
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
                  ref={firstNameInputRef}
                  className={errors.first_name ? 'error-input' : ''}
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
                  ref={lastNameInputRef}
                  className={errors.last_name ? 'error-input' : ''}
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
                  ref={emailInputRef}
                  className={errors.email ? 'error-input' : ''}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Phone Number:</label>
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
                className={errors.date_of_birth ? 'error-input' : ''}
                ref={dateOfBirthRef}
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
                  placeholder="Enter username"
                  ref={usernameInputRef}
                  className={errors.username ? 'error-input' : ''}
                />
                {errors.username && <span className="error-message">{errors.username}</span>}
              </div>

              <div className="form-group">
                <label>Password: <span className="optional-field">(Leave empty to keep current)</span></label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  ref={passwordInputRef}
                  className={errors.password ? 'error-input' : ''}
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
            <p className="section-description">Select all the skills this volunteer has:</p>
            
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
            
            {formData.hasDisability === true && (
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
              {isSubmitting ? <span className="spinner"></span> : 'Save Changes'}
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

export default VolunteerEditForm;
