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
  description: string; // Changed from 'examples' to 'description' to match NewVolunteerForm
}

// Add disability types array
const disabilityTypes = [
  'Physical',
  'Visual',
  'Hearing',
  'Cognitive',
  'Learning',
  'Speech',
  'Mental Health',
  'Other'
];

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

  // Updated skill options with descriptions to match NewVolunteerForm
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

  // Add state for skill evidence file
  const [skillEvidence, setSkillEvidence] = useState<File | null>(null);
  const [currentSkillEvidence, setCurrentSkillEvidence] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [removeEvidence, setRemoveEvidence] = useState<boolean>(false);

  // Add skill selection handler
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
    
    // If removing all skills, prompt to remove evidence too
    if (formData.skills.length <= 1 && (skillEvidence || currentSkillEvidence)) {
      if (window.confirm('Do you want to remove the skill evidence too?')) {
        setSkillEvidence(null);
        setCurrentSkillEvidence(null);
        setRemoveEvidence(true);
      }
    }
  };

  // Add handler for skill evidence file upload
  const handleSkillEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSkillEvidence(file);
    
    if (file) {
      // If uploading a new file, we're not removing the evidence
      setRemoveEvidence(false);
      
      // Clear errors if they exist
      if (errors.skillEvidence) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.skillEvidence;
          return newErrors;
        });
      }
    }
  };

  // Add handler to remove current skill evidence
  const handleRemoveSkillEvidence = () => {
    setSkillEvidence(null);
    setCurrentSkillEvidence(null);
    setRemoveEvidence(true);
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

  // Function to get the filename from a URL
  const getFilenameFromUrl = (url: string) => {
    if (!url) return 'Evidence File';
    const parts = url.split('/');
    return parts[parts.length - 1];
  };
  
  // Function to display file size in human-readable format
  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Effect to initialize form data from volunteer prop
  useEffect(() => {
    if (volunteer) {
      // Parse skills from volunteer data
      let parsedSkills = [];
      if (volunteer.skills) {
        if (typeof volunteer.skills === 'string') {
          try {
            parsedSkills = JSON.parse(volunteer.skills);
          } catch (e) {
            console.error('Error parsing skills:', e);
            parsedSkills = [];
          }
        } else if (Array.isArray(volunteer.skills)) {
          parsedSkills = volunteer.skills;
        }
      }

      // Parse disability from volunteer data
      let hasDisability = false;
      let disabilityType: string[] = [];
      let disabilityDetails = '';

      if (volunteer.disability) {
        let parsedDisability = null;
        if (typeof volunteer.disability === 'string') {
          try {
            parsedDisability = JSON.parse(volunteer.disability);
          } catch (e) {
            console.error('Error parsing disability:', e);
          }
        } else {
          parsedDisability = volunteer.disability;
        }

        // Fix: Proper check for hasDisability value
        if (parsedDisability) {
          // Check if parsedDisability has a hasDisability property
          if (parsedDisability.hasDisability !== undefined) {
            hasDisability = parsedDisability.hasDisability === true;
          } else if (parsedDisability.types && parsedDisability.types.length > 0) {
            // If no explicit hasDisability flag but has types, assume true
            hasDisability = true;
          }
          
          disabilityType = parsedDisability.types || [];
          disabilityDetails = parsedDisability.details || '';
        }
      }

      // Set current skill evidence if exists
      if (volunteer.skill_evidence) {
        setCurrentSkillEvidence(volunteer.skill_evidence);
      }

      // Debug log for name fields
      console.log('Volunteer name fields:', {
        first_name: volunteer.first_name,
        middle_name: volunteer.middle_name,
        last_name: volunteer.last_name,
        name_extension: volunteer.name_extension,
        name: volunteer.name
      });

      // If individual name fields aren't available, try to split from full name
      let firstName = volunteer.first_name;
      let middleName = volunteer.middle_name;
      let lastName = volunteer.last_name;
      let nameExtension = volunteer.name_extension;

      if ((!firstName || !lastName) && volunteer.name) {
        // Only split name if individual fields are missing
        const nameComponents = splitName(volunteer.name || '');
        firstName = firstName || nameComponents.first;
        middleName = middleName || nameComponents.middle;
        lastName = lastName || nameComponents.last;
        nameExtension = nameExtension || nameComponents.extension;
      }

      // Set form data from volunteer
      setFormData({
        first_name: firstName || '',
        middle_name: middleName || '',
        last_name: lastName || '',
        name_extension: nameExtension || '',
        gender: volunteer.gender || 'male',
        username: volunteer.username || '',
        email: volunteer.email || '',
        phone: volunteer.phone || '',
        date_of_birth: volunteer.date_of_birth ? new Date(volunteer.date_of_birth).toISOString().split('T')[0] : '',
        status: volunteer.status || 'active',
        is_verified: volunteer.is_verified || false,
        password: '',
        skills: parsedSkills,
        hasDisability,
        disabilityType,
        disabilityDetails
      });
    }
  }, [volunteer]);

  // Update the disability section JSX
  const renderDisabilitySection = () => (
    <div className="form-section">
      <h3 className="section-title">
        <span className="section-icon material-icons">accessibility</span>
        Disability Information
      </h3>
      <p className="section-description">We support volunteers of all abilities. This information helps us provide appropriate support.</p>
      
      <div className="disability-question">
        <p>Do you have any disabilities or conditions we should be aware of?</p>
        <div className="radio-options">
          <label className={formData.hasDisability === true ? 'radio-selected' : ''}>
            <input
              type="radio"
              name="hasDisability"
              checked={formData.hasDisability === true}
              onChange={() => handleDisabilityChange(true)}
            />
            Yes
          </label>
          <label className={formData.hasDisability === false ? 'radio-selected' : ''}>
            <input
              type="radio"
              name="hasDisability"
              checked={formData.hasDisability === false}
              onChange={() => handleDisabilityChange(false)}
            />
            No
          </label>
        </div>
      </div>
      
      {formData.hasDisability && (
        <div className="disability-details">
          <div className="form-group">
            <label>Type of disability/condition:</label>
            <div className="checkbox-group">
              {disabilityTypes.map(type => (
                <label key={type} className="checkbox-label">
                  <input
                    type="checkbox"
                    name="disabilityType"
                    value={type}
                    checked={formData.disabilityType.includes(type)}
                    onChange={handleDisabilityTypeChange}
                  />
                  {type}
                </label>
              ))}   
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="disabilityDetails">Additional details (optional):</label>
            <textarea
              id="disabilityDetails"
              name="disabilityDetails"
              value={formData.disabilityDetails}
              onChange={handleChange}
              placeholder="Please provide any details that would help us accommodate your needs"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );

  // Add or modify the skills section renderer to match NewVolunteerForm
  const renderSkillsSection = () => (
    <div className="form-section">
      <h3 className="section-title">
        <span className="section-icon material-icons">build</span>
        Skills
      </h3>
      <p className="section-description">Select skills this volunteer has:</p>
      
      {/* Skills dropdown */}
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
      
      {/* Skill evidence upload or display existing */}
      {formData.skills.length > 0 && (
        <div className="form-group document-upload-container">
          <label htmlFor="skillEvidence">Skill Evidence/Certificate <span className="upload-hint">(Certificate, proof of training, or other evidence)</span></label>
          
          <div className={`file-upload-wrapper ${errors.skillEvidence ? 'has-error' : ''}`}>
            {/* Case 1: No evidence (neither current nor new) */}
            {!skillEvidence && !currentSkillEvidence && (
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
            )}
            
            {/* Case 2: New file selected */}
            {skillEvidence && (
              <div className="file-preview">
                <div className="file-info">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5V8H19v12H5V4h8v-.5zM7 13h10v1H7v-1zm0 3h10v1H7v-1zm0-6h5v1H7v-1z"/>
                  </svg>
                  <span className="file-name">
                    {skillEvidence.name} 
                    <span className="file-size">({formatFileSize(skillEvidence.size)})</span>
                  </span>
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
            
            {/* Case 3: Display current evidence */}
            {!skillEvidence && currentSkillEvidence && !removeEvidence && (
              <div className="file-preview current-evidence">
                <div className="file-info">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5V8H19v12H5V4h8v-.5zM7 13h10v1H7v-1zm0 3h10v1H7v-1zm0-6h5v1H7v-1z"/>
                  </svg>
                  <span className="file-name">
                    {getFilenameFromUrl(currentSkillEvidence)}
                    <span className="current-evidence-label"> (Current Evidence)</span>
                  </span>
                </div>
                <div className="evidence-actions">
                  <a 
                    href={currentSkillEvidence} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="view-evidence-btn"
                    title="View evidence"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  </a>
                  <label htmlFor="skillEvidence" className="change-evidence-btn" title="Change evidence">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                    <input
                      type="file"
                      id="skillEvidence"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleSkillEvidenceChange}
                      className="file-input"
                    />
                  </label>
                  <button 
                    type="button" 
                    className="remove-file-btn"
                    onClick={handleRemoveSkillEvidence}
                    title="Remove evidence"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="evidence-hint">Upload a certificate, training record, or proof of experience for your primary skill.</p>
          {errors.skillEvidence && <span className="error-message">{errors.skillEvidence}</span>}
        </div>
      )}
    </div>
  );

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

          {renderSkillsSection()}

          {renderDisabilitySection()}

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
