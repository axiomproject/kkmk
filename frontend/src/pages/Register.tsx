import React, { useState, useEffect } from 'react';
import api from '../config/axios'; // Replace axios import
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/Auth.css';
import { RegistrationResponse } from '../types/auth';
import FaceVerification from '../components/FaceVerification';

interface ValidationErrors {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  extension?: string;
  gender?: string;
  username?: string;
  email?: string;
  password?: string;
  dateOfBirth?: string;
  role?: string;
  terms?: string;
  face?: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  educationLevel?: string;
  school?: string;
  skills?: string;
  phone?: string;
  parentsIncome?: string;
  disability?: string;
  disabilityDetails?: string;
}

interface SkillOption {
  value: string;
  label: string;
  examples: string;
}

const Register: React.FC = () => {
  const location = useLocation();
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [role, setRole] = useState<'volunteer' | 'scholar' | 'sponsor'>();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [extension, setExtension] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceData, setFaceData] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  
  // Scholar specific fields
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [address, setAddress] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [school, setSchool] = useState('');
  const [parentsIncome, setParentsIncome] = useState('');
  
  // Volunteer specific fields
  const [skills, setSkills] = useState<string[]>([]);
  const [hasDisability, setHasDisability] = useState<boolean | null>(null);
  const [disabilityType, setDisabilityType] = useState<string[]>([]);
  const [otherDisabilityDetails, setOtherDisabilityDetails] = useState('');
  
  const navigate = useNavigate();

  // Available education levels
  const educationLevels = [
    'Elementary',
    'Junior High School',
    'Senior High School',
    'Vocational',
    'College',
    'Graduate School'
  ];
  
  // Volunteer skills options with examples
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

  useEffect(() => {
    // Check if there's a preselectedRole
    if (location.state?.preselectedRole) {
      setRole(location.state.preselectedRole);
      setStep('form');
    }
  }, [location.state]);

  const pageVariants = {
    initial: {
      opacity: 0
    },
    in: {
      opacity: 1
    },
    out: {
      opacity: 0
    }
  };

  const pageTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.3
  };

  const handleBack = () => {
    if (step === 'form') {
      // Reset form data when going back to role selection
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setExtension('');
      setGender('male');
      setUsername('');
      setEmail('');
      setPassword('');
      setDateOfBirth('');
      setError('');
      setErrors({});
      setAcceptedTerms(false);
      setFaceVerified(false);
      setFaceData('');
      setGuardianName('');
      setGuardianPhone('');
      setAddress('');
      setEducationLevel('');
      setSchool('');
      setSkills([]);
      setPhone('');
      setParentsIncome('');
      setHasDisability(null);
      setDisabilityType([]);
      setOtherDisabilityDetails('');
      
      // Go back to role selection
      setStep('role');
      setRole(undefined);
    } else {
      navigate(-1);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // First name validation
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (firstName.length < 2 || firstName.length > 50) {
      newErrors.firstName = 'First name must be between 2 and 50 characters';
    }

    // Last name validation
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (lastName.length < 2 || lastName.length > 50) {
      newErrors.lastName = 'Last name must be between 2 and 50 characters';
    }

    // Gender validation
    if (!gender) {
      newErrors.gender = 'Gender is required';
    }

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3 || username.length > 20) {
      newErrors.username = 'Username must be between 3 and 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation - required for all roles
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Date of Birth validation - minimum age of 5 years
    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of Birth is required';
    } else {
      const dobDate = new Date(dateOfBirth);
      const today = new Date();
      const minAgeDate = new Date();
      minAgeDate.setFullYear(today.getFullYear() - 5);
      
      if (dobDate > minAgeDate) {
        newErrors.dateOfBirth = 'You must be at least 5 years old to register';
      }
    }

    // Role validation
    if (!role) {
      newErrors.role = 'Role is required';
    }

    // Scholar specific validations
    if (role === 'scholar') {
      if (!guardianName.trim()) {
        newErrors.guardianName = 'Guardian name is required';
      }
      
      if (!guardianPhone.trim()) {
        newErrors.guardianPhone = 'Guardian phone is required';
      } else if (!/^\d{10,15}$/.test(guardianPhone.replace(/\D/g, ''))) {
        newErrors.guardianPhone = 'Please enter a valid phone number';
      }
      
      if (!address.trim()) {
        newErrors.address = 'Address is required';
      }
      
      if (!educationLevel) {
        newErrors.educationLevel = 'Education level is required';
      }
      
      if (!school.trim()) {
        newErrors.school = 'School is required';
      }

      if (!parentsIncome) {
        newErrors.parentsIncome = 'Parents\' income is required';
      }
    }
    
    // Volunteer specific validations
    if (role === 'volunteer') {
      if (skills.length === 0) {
        newErrors.skills = 'Please select at least one skill';
      }
      
      if (hasDisability === null) {
        newErrors.disability = 'Please specify if you have any disability';
      }
      
      if (hasDisability === true && disabilityType.length === 0) {
        newErrors.disability = 'Please select at least one disability type';
      }
      
      if (hasDisability === true && disabilityType.length > 0 && !otherDisabilityDetails.trim()) {
        newErrors.disabilityDetails = 'Please provide details about your disability';
      }
    }

    // Phone validation for all roles
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10,15}$/.test(phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) return;

    try {
      const fullName = [firstName, middleName, lastName, extension].filter(Boolean).join(' ');
      
      // Prepare disability information for volunteers
      let disabilityInfo = null;
      if (role === 'volunteer' && hasDisability === true) {
        disabilityInfo = {
          types: disabilityType,
          details: otherDisabilityDetails
        };
      }
      
      // Add console.log to debug
      console.log('Submitting registration with role:', role);
      
      const registrationData = {
        firstName,
        middleName,
        lastName, 
        extension,
        gender,
        name: fullName, // Keep the name field for now for backward compatibility
        username,
        email, // Include email for all roles
        phone, // Add phone to registration data for all roles
        password,
        dateOfBirth,
        role, // Make sure role is properly sent to the backend
        faceData: faceVerified ? faceData : null,
        // Scholar specific fields
        guardianName: role === 'scholar' ? guardianName : undefined,
        guardianPhone: role === 'scholar' ? guardianPhone : undefined, 
        address: role === 'scholar' ? address : undefined,
        educationLevel: role === 'scholar' ? educationLevel : undefined,
        school: role === 'scholar' ? school : undefined,
        parentsIncome: role === 'scholar' ? parentsIncome : undefined,
        // Volunteer specific fields
        skills: role === 'volunteer' ? skills : undefined,
        disability: role === 'volunteer' ? (hasDisability ? disabilityInfo : null) : undefined
      };

      // Log data to debug
      console.log('Registration data sent to server:', JSON.stringify(registrationData));
      
      const response = await api.post('/register', registrationData);
      
      // Different success message based on role
      if (role === 'scholar') {
        setSuccess('Registration successful. Please wait for admin to verify your account.');
      } else {
        setSuccess(response.data.message);
      }
      
      setShowSuccessPopup(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Check for specific error types
      const errorMessage = err.response?.data?.error || '';
      
      // Handle duplicate username error
      if (errorMessage.includes('duplicate key') && errorMessage.includes('users_username_key')) {
        setErrors(prev => ({
          ...prev,
          username: 'This username is already taken. Please choose another username.'
        }));
        setError('Username is already taken');
      } 
      // Handle duplicate email error
      else if (errorMessage.includes('duplicate key') && errorMessage.includes('users_email_key')) {
        setErrors(prev => ({
          ...prev,
          email: 'This email is already registered. Please use another email or try to login.'
        }));
        setError('Email is already registered');
      }
      // Generic error handling
      else {
        setError(err.response?.data?.error || 'Registration failed. Please try again.');
      }
      
      // Scroll to the error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRoleSelect = (selectedRole: 'volunteer' | 'scholar' | 'sponsor') => {
    // Reset form fields when changing roles
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setExtension('');
    setGender('male');
    setUsername('');
    setEmail('');
    setPassword('');
    setDateOfBirth('');
    setError('');
    setErrors({});
    setAcceptedTerms(false);
    setFaceVerified(false);
    setFaceData('');
    setGuardianName('');
    setGuardianPhone('');
    setAddress('');
    setEducationLevel('');
    setSchool('');
    setSkills([]);
    setPhone('');
    setParentsIncome('');
    setHasDisability(null);
    setDisabilityType([]);
    setOtherDisabilityDetails('');
    
    // Set the new role - add console.log to debug
    console.log('Selected role:', selectedRole);
    setRole(selectedRole);
    
    // Add a small delay before transition to make it smoother
    setTimeout(() => setStep('form'), 50);
  };

  const handleSkillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (e.target.checked) {
      setSkills(prev => [...prev, value]);
    } else {
      setSkills(prev => prev.filter(skill => skill !== value));
    }
  };

  const handleDisabilityTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (e.target.checked) {
      setDisabilityType(prev => [...prev, value]);
    } else {
      setDisabilityType(prev => prev.filter(type => type !== value));
    }
  };

  const closeModal = (setter: (value: boolean) => void) => {
    setIsClosingModal(true);
    setTimeout(() => {
      setter(false);
      setIsClosingModal(false);
    }, 300);
  };

  const handleTermsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTermsModal(true);
  };

  const handleNotificationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowNotificationModal(true);
  };

  const handleFaceVerificationSuccess = (faceData: string) => {
    setFaceData(faceData);
    setFaceVerified(true);
    setShowFaceVerification(false);
  };

  const renderRoleSelection = () => (
    <div className="role-selection">
      <h4>Choose your role</h4>
      <p>Select how you want to join KMFI</p>
      <div className="role-buttons">
        <button 
          className={`role-button ${role === 'volunteer' ? 'selected' : ''}`}
          onClick={() => handleRoleSelect('volunteer')}
        >
          <h5>Volunteer</h5>
          <p>Join as a volunteer to help and support</p>
        </button>
        <button 
          className={`role-button ${role === 'scholar' ? 'selected' : ''}`}
          onClick={() => handleRoleSelect('scholar')}
        >
          <h5>Scholar</h5>
          <p>Apply as a scholar to receive support</p>
        </button>
        <button 
          className={`role-button ${role === 'sponsor' ? 'selected' : ''}`}
          onClick={() => handleRoleSelect('sponsor')}
        >
          <h5>Sponsor</h5>
          <p>Register as a sponsor to provide support</p>
        </button>
      </div>
    </div>
  );

  const renderTermsModal = () => (
    <div 
      className={`modal-overlay ${isClosingModal ? 'closing' : ''}`} 
      onClick={() => closeModal(setShowTermsModal)}
    >
      <div 
        className={`modal-content ${isClosingModal ? 'closing' : ''}`} 
        onClick={e => e.stopPropagation()}
      >
        <h2>Terms of Service</h2>
        <div className="modal-body">
          <div className="terms-content">
            <h3>1. Acceptance of Terms</h3>
            <p>By accessing and using KKMK's services, you agree to be bound by these Terms of Service.</p>

            <h3>2. User Responsibilities</h3>
            <p>Users must:</p>
            <ul>
              <li>Provide accurate and truthful information</li>
              <li>Maintain the confidentiality of their account</li>
              <li>Use the service in accordance with all applicable laws</li>
            </ul>

            <h3>3. Role-Specific Terms</h3>
            <h4>For Volunteers:</h4>
            <ul>
              <li>Commit to assigned responsibilities</li>
              <li>Maintain professional conduct</li>
              <li>Respect confidentiality of scholars</li>
            </ul>

            <h4>For Scholars:</h4>
            <ul>
              <li>Maintain academic requirements</li>
              <li>Provide progress reports as requested</li>
              <li>Use support resources responsibly</li>
            </ul>

            <h4>For Sponsors:</h4>
            <ul>
              <li>Fulfill committed support obligations</li>
              <li>Respect privacy of scholars</li>
              <li>Adhere to sponsorship guidelines</li>
            </ul>

            <h3>4. Privacy</h3>
            <p>We are committed to protecting your privacy. Your personal information will be handled as described in our Privacy Policy.</p>

            <h3>5. Code of Conduct</h3>
            <p>Users must not:</p>
            <ul>
              <li>Harass or discriminate against others</li>
              <li>Share inappropriate or offensive content</li>
              <li>Misuse platform resources</li>
            </ul>

            <h3>6. Termination</h3>
            <p>We reserve the right to terminate or suspend accounts that violate these terms.</p>

            <h3>7. Changes to Terms</h3>
            <p>We may modify these terms at any time. Continued use of the service implies acceptance of changes.</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button onClick={() => closeModal(setShowTermsModal)}>Close</button>
        </div>
      </div>
    </div>
  );

  const renderNotificationModal = () => (
    <div 
      className={`modal-overlay ${isClosingModal ? 'closing' : ''}`} 
      onClick={() => closeModal(setShowNotificationModal)}
    >
      <div 
        className={`modal-content ${isClosingModal ? 'closing' : ''}`} 
        onClick={e => e.stopPropagation()}
      >
        <h2>Notification Settings</h2>
        <div className="modal-body">
          {/* Add your notification settings content here */}
          <p>Your notification settings content goes here...</p>
        </div>
        <button onClick={() => closeModal(setShowNotificationModal)}>Close</button>
      </div>
    </div>
  );

  // Success Popup Component - Updated for better animation
  const renderSuccessPopup = () => (
    <motion.div 
      className="success-popup-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className={`success-popup ${isClosingModal ? 'closing' : ''}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 300,
          damping: 25,
          duration: 0.3
        }}
      >
        <div className="success-popup-content">
          <div className="success-icon">✓</div>
          <p>{success || 'Registration successful. Please check your email to verify your account.'}</p>
          <button 
            className="close-popup-btn"
            onClick={() => setShowSuccessPopup(false)}
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  const renderRegistrationForm = () => (
    <div className="registration-form">
      <h4>Complete your registration</h4>
      <p>Please fill in your details</p>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-section">
          <h5>Personal Information</h5>
          <div className="form-group-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className={errors.firstName ? 'error-input' : ''}
              />
              {errors.firstName && <span className="error-text">{errors.firstName}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="middleName">Middle Name</label>
              <input
                type="text"
                id="middleName"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Middle name (optional)"
              />
            </div>
          </div>
          <div className="form-group-row">
            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className={errors.lastName ? 'error-input' : ''}
              />
              {errors.lastName && <span className="error-text">{errors.lastName}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="extension">Extension</label>
              <input
                type="text"
                id="extension"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                placeholder="Jr., Sr., III, etc. (optional)"
              />
            </div>
          </div>
          
          <div className="form-group-row">
            <div className="form-group">
              <label htmlFor="gender">Gender *</label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                className={errors.gender ? 'error-input' : ''}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <span className="error-text">{errors.gender}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth *</label>
              <input
                type="date"
                id="dateOfBirth"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                placeholder="Date of Birth"
                max={new Date().toISOString().split('T')[0]}
                className={errors.dateOfBirth ? 'error-input' : ''}
              />
              {errors.dateOfBirth && <span className="error-text">{errors.dateOfBirth}</span>}
            </div>
          </div>
          
          {/* Add phone number field for all roles */}
          <div className="form-group">
            <label htmlFor="phone">Phone Number *</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className={errors.phone ? 'error-input' : ''}
            />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>
        </div>
        
        <div className="form-section">
          <h5>Account Information</h5>
          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className={errors.username ? 'error-input' : ''}
            />
            {errors.username && <span className="error-text">{errors.username}</span>}
          </div>
          
          {/* Include email field for all roles, including scholars */}
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={errors.email ? 'error-input' : ''}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`password-input ${errors.password ? 'error-input' : ''}`}
              />
              {password.length > 0 && (
                <span 
                  className="password-toggle-icon" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </span>
              )}
            </div>
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>
        </div>
        
        {/* Scholar specific fields */}
        {role === 'scholar' && (
          <div className="form-section">
            <h5>Scholar Information</h5>
            <div className="form-group">
              <label htmlFor="guardianName">Guardian Name *</label>
              <input
                type="text"
                id="guardianName"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Guardian's full name"
                className={errors.guardianName ? 'error-input' : ''}
              />
              {errors.guardianName && <span className="error-text">{errors.guardianName}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="guardianPhone">Guardian Phone *</label>
              <input
                type="tel"
                id="guardianPhone"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="Guardian's phone number"
                className={errors.guardianPhone ? 'error-input' : ''}
              />
              {errors.guardianPhone && <span className="error-text">{errors.guardianPhone}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="address">Address *</label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Complete address"
                rows={3}
                className={errors.address ? 'error-input' : ''}
              />
              {errors.address && <span className="error-text">{errors.address}</span>}
            </div>

            {/* Parents' Income Field - Add it before the education fields */}
            <div className="form-group">
              <label htmlFor="parentsIncome">Parents' total monthly income *</label>
              <select
                id="parentsIncome"
                value={parentsIncome}
                onChange={(e) => setParentsIncome(e.target.value)}
                className={errors.parentsIncome ? 'error-input' : ''}
              >
                <option value="">Select income range</option>
                <option value="below P10,000">below P10,000</option>
                <option value="P10,001 - P15,000">P10,001 - P15,000</option>
                <option value="P15,001 - P20,000">P15,001 - P20,000</option>
                <option value="P20,001 - P25,000">P20,001 - P25,000</option>
                <option value="P25,001 - P30,000">P25,001 - P30,000</option>
                <option value="P30,001 and above">P30,001 and above</option>
              </select>
              {errors.parentsIncome && <span className="error-text">{errors.parentsIncome}</span>}
            </div>
            
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="educationLevel">Education Level *</label>
                <select
                  id="educationLevel"
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className={errors.educationLevel ? 'error-input' : ''}
                >
                  <option value="">Select Education Level</option>
                  {educationLevels.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                {errors.educationLevel && <span className="error-text">{errors.educationLevel}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="school">School *</label>
                <input
                  type="text"
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="School name"
                  className={errors.school ? 'error-input' : ''}
                />
                {errors.school && <span className="error-text">{errors.school}</span>}
              </div>
            </div>
          </div>
        )}
        
        {/* Volunteer specific fields */}
        {role === 'volunteer' && (
          <div className="form-section">
            <h5>Volunteer Skills</h5>
            <p className="skills-info">Select all the skills that you would like to volunteer:</p>
            
            <div className="skills-grid">
              {skillOptions.map((skill) => (
                <div key={skill.value} className="skill-checkbox-container">
                  <div className="skill-checkbox">
                    <input
                      type="checkbox"
                      id={`skill-${skill.value}`}
                      value={skill.value}
                      checked={skills.includes(skill.value)}
                      onChange={handleSkillChange}
                    />
                    <label htmlFor={`skill-${skill.value}`}>{skill.label}</label>
                  </div>
                  <p className="skill-examples">{skill.examples}</p>
                </div>
              ))}
            </div>
            {errors.skills && <span className="error-text skills-error">{errors.skills}</span>}
            
            {/* Disability section for volunteers */}
            <h5 className="mt-4">Disability Information</h5>
            <p className="disability-info">As an inclusive organization, we welcome volunteers of all abilities. This information helps us provide appropriate support.</p>
            
            <div className="disability-question">
              <label>Do you have any disability?</label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="disability-yes"
                    name="hasDisability"
                    checked={hasDisability === true}
                    onChange={() => setHasDisability(true)}
                  />
                  <label htmlFor="disability-yes">Yes</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="disability-no"
                    name="hasDisability"
                    checked={hasDisability === false}
                    onChange={() => setHasDisability(false)}
                  />
                  <label htmlFor="disability-no">No</label>
                </div>
              </div>
              {errors.disability && <span className="error-text">{errors.disability}</span>}
            </div>
            
            {hasDisability === true && (
              <div className="disability-types">
                <label>Type of disability (select all that apply):</label>
                <div className="disability-checkbox-grid">
                  {disabilityTypes.map((type) => (
                    <div key={type} className="disability-checkbox">
                      <input
                        type="checkbox"
                        id={`disability-${type}`}
                        value={type}
                        checked={disabilityType.includes(type)}
                        onChange={handleDisabilityTypeChange}
                      />
                      <label htmlFor={`disability-${type}`}>{type}</label>
                    </div>
                  ))}
                </div>
                
                {disabilityType.length > 0 && (
                  <div className="form-group mt-2">
                    <label htmlFor="otherDisabilityDetails">Please specify details about your disability:</label>
                    <textarea
                      id="otherDisabilityDetails"
                      value={otherDisabilityDetails}
                      onChange={(e) => setOtherDisabilityDetails(e.target.value)}
                      placeholder="Please provide details about your disability (nature, accommodations needed, etc.)"
                      rows={3}
                      className={errors.disabilityDetails ? 'error-input' : ''}
                    />
                    {errors.disabilityDetails && <span className="error-text">{errors.disabilityDetails}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="terms-checkbox">
          <input
            type="checkbox"
            id="terms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className={errors.terms ? 'error-input' : ''}
          />
          <label htmlFor="terms">
            I agree with KMFI's{' '}
            <span className="terms-link" onClick={handleTermsClick}>
              Terms of Service
            </span>
            , Privacy Policy, and default{' '}
            <span className="terms-link" onClick={handleNotificationClick}>
               Notification Settings
            </span>
            .
          </label>
          {errors.terms && <span className="error-text">{errors.terms}</span>}
        </div>
        
        <div className="face-verification-section">
          <button
            type="button"
            className={`face-verify-button ${faceVerified ? 'verified' : ''}`}
            onClick={() => setShowFaceVerification(true)}
          >
            {faceVerified ? 'Face Verified ✓' : 'Verify Face'}
          </button>
        </div>
        {showFaceVerification && (
          <FaceVerification
            onClose={() => setShowFaceVerification(false)}
            onSuccess={handleFaceVerificationSuccess}
          />
        )}
        <button type="submit" className="auth-button-register">Register</button>
      </form>
      {showTermsModal && renderTermsModal()}
      {showNotificationModal && renderNotificationModal()}
    </div>
  );

  return (
    <div className="auth-container full-screen">
      <div className="auth-inner-container-register">
        <div className="back-button" onClick={handleBack}>
          <svg viewBox="0 0 24 24" fill="#242424">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </div>
        
        <AnimatePresence mode='wait'>
          <motion.div
            key={step}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            style={{ width: '100%' }}
          >
            {step === 'role' ? renderRoleSelection() : (
              <>
                {renderRegistrationForm()}
                <p className="auth-account-link">
                  Already have an account? <Link to="/login">Sign In</Link>
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        
        <AnimatePresence>
          {showSuccessPopup && renderSuccessPopup()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Register;
