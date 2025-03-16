import React, { useState, useEffect } from 'react';
import api from '../config/axios'; // Replace axios import
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/Auth.css';
import { RegistrationResponse } from '../types/auth';
import FaceVerification from '../components/FaceVerification';
import { isEmailDuplicateError, isUsernameDuplicateError } from '../utils/errorParser';

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
  schoolRegistrationForm?: string;
  psaDocument?: string;
  parentsId?: string;
  reportCard?: string;
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
  
  // Add new state variables for document uploads
  const [schoolRegistrationForm, setSchoolRegistrationForm] = useState<File | null>(null);
  const [psaDocument, setPsaDocument] = useState<File | null>(null);
  const [parentsId, setParentsId] = useState<File | null>(null);
  const [reportCard, setReportCard] = useState<File | null>(null);
  
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
    // Check if there's a preselectedRole in location state
    if (location.state?.preselectedRole) {
      setRole(location.state.preselectedRole);
      setStep('form');
    } 
    // Also check localStorage as a fallback
    else {
      const preselectedRole = localStorage.getItem('preselectedRole');
      if (preselectedRole === 'scholar' || preselectedRole === 'volunteer' || preselectedRole === 'sponsor') {
        setRole(preselectedRole);
        setStep('form');
        // Clear from localStorage after use
        localStorage.removeItem('preselectedRole');
      }
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

    // Date of Birth validation - role-specific minimum age requirements
    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of Birth is required';
    } else {
      const dobDate = new Date(dateOfBirth);
      const today = new Date();
      
      // Calculate minimum age based on role
      let minAge = 5; // Default minimum age (for scholars)
      
      if (role === 'volunteer') {
        minAge = 16; // Volunteers must be at least 16
      } else if (role === 'sponsor') {
        minAge = 18; // Sponsors must be at least 18
      }
      
      const minAgeDate = new Date();
      minAgeDate.setFullYear(today.getFullYear() - minAge);
      
      if (dobDate > minAgeDate) {
        newErrors.dateOfBirth = `You must be at least ${minAge} years old to register as a ${role}`;
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

      // Document upload validations
      if (!schoolRegistrationForm) {
        newErrors.schoolRegistrationForm = 'School registration form is required';
      } else if (schoolRegistrationForm.size > 5 * 1024 * 1024) { // 5MB limit
        newErrors.schoolRegistrationForm = 'File is too large (max 5MB)';
      }
      
      if (!psaDocument) {
        newErrors.psaDocument = 'PSA Birth Certificate is required';
      } else if (psaDocument.size > 5 * 1024 * 1024) {
        newErrors.psaDocument = 'File is too large (max 5MB)';
      }
      
      if (!parentsId) {
        newErrors.parentsId = "Parent's ID is required";
      } else if (parentsId.size > 5 * 1024 * 1024) {
        newErrors.parentsId = 'File is too large (max 5MB)';
      }
      
      if (!reportCard) {
        newErrors.reportCard = 'Latest report card or grade slip is required';
      } else if (reportCard.size > 5 * 1024 * 1024) {
        newErrors.reportCard = 'File is too large (max 5MB)';
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
    
    // If we have errors, scroll to the top to show the error messages
    if (Object.keys(newErrors).length > 0) {
      // Use setTimeout to ensure the errors are rendered before scrolling
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, 100);
      
      // If there's a specific field with error, try to focus it
      const firstErrorField = Object.keys(newErrors)[0];
      const errorElement = document.getElementById(firstErrorField);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    
    return Object.keys(newErrors).length === 0;
  };

  // Completely rewrite the form submission function with better error handling
const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  setError('');
  setSuccess('');
  
  if (!validateForm()) return;

  try {
    const fullName = [firstName, middleName, lastName, extension].filter(Boolean).join(' ');
    
    // Create FormData object
    const formData = new FormData();
    formData.append('firstName', firstName);
    formData.append('middleName', middleName);
    formData.append('lastName', lastName);
    formData.append('extension', extension);
    formData.append('fullName', fullName);
    formData.append('gender', gender);
    formData.append('username', username);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('dateOfBirth', dateOfBirth);
    formData.append('role', role || '');
    formData.append('phone', phone);
    
    // Add face verification data
    if (faceData) {
      formData.append('faceData', faceData);
    }
    
    // Add role-specific data
    if (role === 'scholar') {
      formData.append('guardianName', guardianName);
      formData.append('guardianPhone', guardianPhone);
      formData.append('address', address);
      formData.append('educationLevel', educationLevel);
      formData.append('school', school);
      formData.append('parentsIncome', parentsIncome);
      
      // Add document files
      if (schoolRegistrationForm) formData.append('schoolRegistrationForm', schoolRegistrationForm);
      if (psaDocument) formData.append('psaDocument', psaDocument);
      if (parentsId) formData.append('parentsId', parentsId);
      if (reportCard) formData.append('reportCard', reportCard);
    } else if (role === 'volunteer') {
      formData.append('skills', JSON.stringify(skills));
      formData.append('hasDisability', hasDisability === null ? '' : String(hasDisability));
      
      if (hasDisability) {
        formData.append('disabilityTypes', JSON.stringify(disabilityType));
        formData.append('disabilityDetails', otherDisabilityDetails);
      }
    }
    
    // First check for potential conflicts before full submission
    let hasConflict = false;
    
    // Check email availability
    try {
      const emailCheck = await api.get(`/check-email?email=${encodeURIComponent(email)}`);
      if (!emailCheck.data.available) {
        setErrors(prev => ({
          ...prev,
          email: 'This email is already registered. Please use another email or try to login.',
          username: undefined // Clear any username errors
        }));
        setError('Email is already registered');
        hasConflict = true;
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        setErrors(prev => ({
          ...prev,
          email: 'This email is already registered. Please use another email or try to login.',
          username: undefined
        }));
        setError('Email is already registered');
        hasConflict = true;
      }
    }
    
    // Only check username if email is fine
    if (!hasConflict) {
      try {
        const usernameCheck = await api.get(`/check-username?username=${encodeURIComponent(username)}`);
        if (!usernameCheck.data.available) {
          setErrors(prev => ({
            ...prev,
            username: 'This username is already taken. Please choose another username.',
            email: undefined // Clear any email errors
          }));
          setError('Username is already taken');
          hasConflict = true;
        }
      } catch (error: any) {
        if (error.response?.status === 409) {
          setErrors(prev => ({
            ...prev,
            username: 'This username is already taken. Please choose another username.',
            email: undefined
          }));
          setError('Username is already taken');
          hasConflict = true;
        }
      }
    }
    
    // Don't proceed with form submission if there are conflicts
    if (hasConflict) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    const response = await api.post('/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    // Set success message based on role or from response
    if (role === 'scholar') {
      setSuccess('Registration successful. Please wait for admin to verify your account.');
    } else {
      setSuccess(response.data.message || 'Registration successful. Please check your email to verify your account and also check the spam folder');
    }
    
    // Store current scroll position before showing success popup
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty('--popup-scroll-y', `${scrollY}px`);
    
    // Show success popup
    setShowSuccessPopup(true);
    
    // Reset form after successful submission (optional)
    if (role === 'volunteer' || role === 'sponsor') {
      // Only clear form for non-scholars, since scholars need verification
      setTimeout(() => {
        setStep('role');
        setRole(undefined);
        // Other form reset logic...
      }, 3000); // Wait 3 seconds after success to reset form
    }
    
  } catch (err: any) {
    console.error('Registration error:', err);
    
    // Log the actual error response for debugging
    console.log('Error response data:', err.response?.data);
    console.log('Error status:', err.response?.status);
    
    // Get the error data from the response if available
    const responseError = err.response?.data || {};
    
    // Always clear existing field errors to prevent stale error messages
    setErrors(prev => ({
      ...prev,
      email: undefined,
      username: undefined
    }));
    
    // Handle specific field errors based on the field property from backend
    if (responseError.field === 'email') {
      setErrors(prev => ({
        ...prev,
        email: responseError.detail || responseError.error || 'Email already registered'
      }));
      setError('Email is already registered. Please use a different email.');
    }
    else if (responseError.field === 'username') {
      setErrors(prev => ({
        ...prev,
        username: responseError.detail || responseError.error || 'Username already taken'
      }));
      setError('Username is already taken. Please choose another username.');
    }
    else if (responseError.error) {
      // If no field is specified but we have an error message
      const errorLowerCase = responseError.error.toLowerCase();
      
      if (errorLowerCase.includes('email')) {
        setErrors(prev => ({
          ...prev,
          email: responseError.detail || 'Email already registered'
        }));
        setError('Email is already registered. Please use a different email.');
      }
      else if (errorLowerCase.includes('username')) {
        setErrors(prev => ({
          ...prev,
          username: responseError.detail || 'Username already taken'
        }));
        setError('Username is already taken. Please choose another username.');
      }
      else {
        // Generic error message
        setError(responseError.error || 'Registration failed. Please try again.');
      }
    }
    else {
      // Fallback for unexpected error formats
      setError('Registration failed. Please try again or contact support.');
    }
    
    // Scroll to the error message
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

  // Add an additional check for email availability
  const checkEmailAvailability = async (email: string) => {
    try {
      const response = await api.get(`/check-email?email=${encodeURIComponent(email)}`);
      return response.data.available;
    } catch (error: any) {
      // If we get a 409 status, the email is already taken
      if (error.response?.status === 409) {
        return false;
      }
      // For other errors, assume the email might be available to avoid false negatives
      console.error('Error checking email availability:', error);
      return true;
    }
  };

  // Add an additional check for username availability
  const checkUsernameAvailability = async (username: string) => {
    try {
      const response = await api.get(`/check-username?username=${encodeURIComponent(username)}`);
      return response.data.available;
    } catch (error: any) {
      // If we get a 409 status, the username is already taken
      if (error.response?.status === 409) {
        return false;
      }
      // For other errors, assume the username might be available to avoid false negatives
      console.error('Error checking username availability:', error);
      return true;
    }
  };

  const handleRoleSelect = (selectedRole: 'volunteer' | 'scholar' | 'sponsor') => {
    // Check eligibility if selecting scholar role
    if (selectedRole === 'scholar') {
      // Ask user if they are from Payatas area
      const isFromPayatas = window.confirm(
        "KMFI Scholar Program Eligibility Check\n\n" +
        "Scholars must be residents of Payatas, Quezon City to be eligible.\n\n" +
        "Are you a resident of Payatas area?"
      );
      
      if (!isFromPayatas) {
        // User is not from Payatas - show alert and redirect to homepage
        alert(
          "We're sorry, but KMFI's scholar program is currently only available to residents of Payatas, Quezon City.\n\n" +
          "Thank you for your interest. You may still explore other ways to get involved with our organization."
        );
        
        // Navigate back to homepage
        navigate('/');
        return; // Stop the function execution here
      }
    }
    
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

  // Success Popup Component - Updated for better animation and scroll position
const renderSuccessPopup = () => (
  <motion.div 
    className="success-popup-overlay"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    // Auto-dismiss after 8 seconds
    onAnimationComplete={() => {
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 8000);
    }}
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

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    const value = e.target.value;
    // Allow only letters, spaces, and basic punctuation for names
    if (/^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.,-]*$/.test(value) || value === '') {
      setter(value);
      // If there was an error for this field, clear it when user starts typing a valid value
      if (errors[e.target.id as keyof ValidationErrors]) {
        setErrors(prev => ({
          ...prev,
          [e.target.id]: undefined
        }));
      }
    }
  };
  
  // Enhance the username input handler with a debounced availability check
  const handleUsernameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow only letters, numbers, and underscores for username
    if (/^[a-zA-Z0-9_]*$/.test(value) || value === '') {
      setUsername(value);
      
      // Clear error when user changes the username
      if (errors.username || error.includes('Username is already taken')) {
        setErrors(prev => ({
          ...prev,
          username: undefined
        }));
        if (error.includes('Username is already taken')) {
          setError('');
        }
      }
      
      // Add debounced username check if it's a valid format and length
      if (value && value.length >= 3) {
        // Clear any previous timeout
        if (window.usernameCheckTimeout) {
          clearTimeout(window.usernameCheckTimeout);
        }
        
        // Set a new timeout to check username availability
        window.usernameCheckTimeout = setTimeout(async () => {
          try {
            const isAvailable = await checkUsernameAvailability(value);
            if (!isAvailable && username === value) { // Make sure the username hasn't changed during the delay
              setErrors(prev => ({
                ...prev,
                username: 'This username is already taken. Please choose another username.'
              }));
            }
          } catch (error) {
            console.error('Username availability check failed:', error);
            // Don't set error on check failure
          }
        }, 600); // Wait for 600ms after user stops typing
      }
    }
  };
  
  // Enhance the email input handler with a debounced availability check
  const handleEmailInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear error when user changes the email
    if (errors.email || error.includes('Email is already registered')) {
      setErrors(prev => ({
        ...prev,
        email: undefined
      }));
      if (error.includes('Email is already registered')) {
        setError('');
      }
    }
    
    // Add debounced email check if it's a valid email format
    if (value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      // Clear any previous timeout
      if (window.emailCheckTimeout) {
        clearTimeout(window.emailCheckTimeout);
      }
      
      // Set a new timeout to check email availability
      window.emailCheckTimeout = setTimeout(async () => {
        try {
          const isAvailable = await checkEmailAvailability(value);
          if (!isAvailable && email === value) { // Make sure the email hasn't changed during the delay
            setErrors(prev => ({
              ...prev,
              email: 'This email is already registered. Please use another email or try to login.'
            }));
          }
        } catch (error) {
          console.error('Email availability check failed:', error);
          // Don't set error on check failure
        }
      }, 600); // Wait for 600ms after user stops typing
    }
  };
  
  const handlePasswordInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear error when user changes the password
    if (errors.password) {
      setErrors(prev => ({
        ...prev,
        password: undefined
      }));
    }
  };
  
  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers, +, and spaces for phone numbers
    if (/^[0-9+\s]*$/.test(value) || value === '') {
      setPhone(value);
      if (errors.phone) {
        setErrors(prev => ({
          ...prev,
          phone: undefined
        }));
      }
    }
  };
  
  const handleGuardianPhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers, +, and spaces for phone numbers
    if (/^[0-9+\s]*$/.test(value) || value === '') {
      setGuardianPhone(value);
      if (errors.guardianPhone) {
        setErrors(prev => ({
          ...prev,
          guardianPhone: undefined
        }));
      }
    }
  };

  const handleSchoolInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSchool(e.target.value);
    if (errors.school) {
      setErrors(prev => ({
        ...prev,
        school: undefined
      }));
    }
  };

  const handleGuardianNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only letters, spaces, and basic punctuation for names
    if (/^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.,-]*$/.test(value) || value === '') {
      setGuardianName(value);
      if (errors.guardianName) {
        setErrors(prev => ({
          ...prev,
          guardianName: undefined
        }));
      }
    }
  };
  
  const handleAddressInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAddress(e.target.value);
    if (errors.address) {
      setErrors(prev => ({
        ...prev,
        address: undefined
      }));
    }
  };
  
  const handleEducationLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEducationLevel(e.target.value);
    if (errors.educationLevel) {
      setErrors(prev => ({
        ...prev,
        educationLevel: undefined
      }));
    }
  };
  
  const handleParentsIncomeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setParentsIncome(e.target.value);
    if (errors.parentsIncome) {
      setErrors(prev => ({
        ...prev,
        parentsIncome: undefined
      }));
    }
  };

  const handleDateOfBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateOfBirth(e.target.value);
    if (errors.dateOfBirth) {
      setErrors(prev => ({
        ...prev,
        dateOfBirth: undefined
      }));
    }
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGender(e.target.value as 'male' | 'female' | 'other');
    if (errors.gender) {
      setErrors(prev => ({
        ...prev,
        gender: undefined
      }));
    }
  };

  const handleDisabilityDetailsInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setOtherDisabilityDetails(e.target.value);
    if (errors.disabilityDetails) {
      setErrors(prev => ({
        ...prev,
        disabilityDetails: undefined
      }));
    }
  };

  const handleTermsCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAcceptedTerms(e.target.checked);
    if (errors.terms && e.target.checked) {
      setErrors(prev => ({
        ...prev,
        terms: undefined
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void, errorKey: keyof ValidationErrors) => {
    const file = e.target.files?.[0] || null;
    setter(file);
    if (file && errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: undefined
      }));
    }
  };

  // Add function to handle file removal
  const handleRemoveFile = (setter: (file: File | null) => void, errorKey: keyof ValidationErrors) => {
    setter(null);
    // Clear any error for this field when removing the file
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: undefined
      }));
    }
  };

  const renderRegistrationForm = () => (
    <div className="registration-form">
      <h4>Complete your registration</h4>
      <p>Please fill in your details</p>
      {error && <p className="error-message" id="error-message">{error}</p>}
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="form-section">
          <h5>Personal Information</h5>
          <div className="form-group-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => handleNameInput(e, setFirstName)}
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
                onChange={(e) => handleNameInput(e, setMiddleName)}
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
                onChange={(e) => handleNameInput(e, setLastName)}
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
                onChange={(e) => handleNameInput(e, setExtension)}
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
                onChange={handleGenderChange}
                className={errors.gender ? 'error-input' : ''}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <span className="error-text">{errors.gender}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="dateOfBirth">
                Date of Birth * 
                {role === 'volunteer' && <span className="age-hint">(16+ years old)</span>}
                {role === 'sponsor' && <span className="age-hint">(18+ years old)</span>}
              </label>
              <input
                type="date"
                id="dateOfBirth"
                value={dateOfBirth}
                onChange={handleDateOfBirthChange}
                placeholder="Date of Birth"
                max={(() => {
                  const today = new Date();
                  let minAge = role === 'volunteer' ? 16 : (role === 'sponsor' ? 18 : 5);
                  today.setFullYear(today.getFullYear() - minAge);
                  return today.toISOString().split('T')[0];
                })()}
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
              onChange={handlePhoneInput}
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
              onChange={handleUsernameInput}
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
              onChange={handleEmailInput}
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
                onChange={handlePasswordInput}
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
          <>
            <div className="form-section">
              <h5>Scholar Information</h5>
              <div className="form-group">
                <label htmlFor="guardianName">Guardian Name *</label>
                <input
                  type="text"
                  id="guardianName"
                  value={guardianName}
                  onChange={handleGuardianNameInput}
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
                  onChange={handleGuardianPhoneInput}
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
                  onChange={handleAddressInput}
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
                  onChange={handleParentsIncomeChange}
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
                    onChange={handleEducationLevelChange}
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
                    onChange={handleSchoolInput}
                    placeholder="School name"
                    className={errors.school ? 'error-input' : ''}
                  />
                  {errors.school && <span className="error-text">{errors.school}</span>}
                </div>
              </div>
            </div>
            
            {/* Enhanced Document Upload Section */}
            <div className="form-section">
              <h5>Required Documents</h5>
              <p className="document-info">Please upload the following required documents (PDF, JPG, or PNG files, max 5MB each):</p>
              
              <div className="form-group document-upload-container">
                <label htmlFor="schoolRegistrationForm">School Registration Form *</label>
                <div className={`file-upload-wrapper ${errors.schoolRegistrationForm ? 'has-error' : ''}`}>
                  {!schoolRegistrationForm ? (
                    <>
                      <label htmlFor="schoolRegistrationForm" className="file-upload-label">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                          <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                        </svg>
                        <span>Click to upload</span>
                      </label>
                      <input
                        type="file"
                        id="schoolRegistrationForm"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, setSchoolRegistrationForm, 'schoolRegistrationForm')}
                        className="file-input"
                      />
                    </>
                  ) : (
                    <div className="file-preview">
                      <div className="file-info">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5V8H19v12H5V4h8v-.5zM7 13h10v1H7v-1zm0 3h10v1H7v-1zm0-6h5v1H7v-1z"/>
                        </svg>
                        <span className="file-name">{schoolRegistrationForm.name}</span>
                      </div>
                      <button 
                        type="button" 
                        className="remove-file-btn"
                        onClick={() => handleRemoveFile(setSchoolRegistrationForm, 'schoolRegistrationForm')}
                        title="Remove file"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                {errors.schoolRegistrationForm && <span className="error-text">{errors.schoolRegistrationForm}</span>}
              </div>
              
              <div className="form-group document-upload-container">
                <label htmlFor="psaDocument">PSA Birth Certificate *</label>
                <div className={`file-upload-wrapper ${errors.psaDocument ? 'has-error' : ''}`}>
                  {!psaDocument ? (
                    <>
                      <label htmlFor="psaDocument" className="file-upload-label">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                          <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                        </svg>
                        <span>Click to upload</span>
                      </label>
                      <input
                        type="file"
                        id="psaDocument"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, setPsaDocument, 'psaDocument')}
                        className="file-input"
                      />
                    </>
                  ) : (
                    <div className="file-preview">
                      <div className="file-info">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5V8H19v12H5V4h8v-.5zM7 13h10v1H7v-1zm0 3h10v1H7v-1zm0-6h5v1H7v-1z"/>
                        </svg>
                        <span className="file-name">{psaDocument.name}</span>
                      </div>
                      <button 
                        type="button" 
                        className="remove-file-btn"
                        onClick={() => handleRemoveFile(setPsaDocument, 'psaDocument')}
                        title="Remove file"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                {errors.psaDocument && <span className="error-text">{errors.psaDocument}</span>}
              </div>
              
              <div className="form-group document-upload-container">
                <label htmlFor="parentsId">Parent's ID *</label>
                <div className={`file-upload-wrapper ${errors.parentsId ? 'has-error' : ''}`}>
                  {!parentsId ? (
                    <>
                      <label htmlFor="parentsId" className="file-upload-label">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                          <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                        </svg>
                        <span>Click to upload</span>
                      </label>
                      <input
                        type="file"
                        id="parentsId"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, setParentsId, 'parentsId')}
                        className="file-input"
                      />
                    </>
                  ) : (
                    <div className="file-preview">
                      <div className="file-info">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5V8H19v12H5V4h8v-.5zM7 13h10v1H7v-1zm0 3h10v1H7v-1zm0-6h5v1H7v-1z"/>
                        </svg>
                        <span className="file-name">{parentsId.name}</span>
                      </div>
                      <button 
                        type="button" 
                        className="remove-file-btn"
                        onClick={() => handleRemoveFile(setParentsId, 'parentsId')}
                        title="Remove file"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                {errors.parentsId && <span className="error-text">{errors.parentsId}</span>}
              </div>
              
              <div className="form-group document-upload-container">
                <label htmlFor="reportCard">Latest Report Card/Grade Slip *</label>
                <div className={`file-upload-wrapper ${errors.reportCard ? 'has-error' : ''}`}>
                  {!reportCard ? (
                    <>
                      <label htmlFor="reportCard" className="file-upload-label">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                          <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                        </svg>
                        <span>Click to upload</span>
                      </label>
                      <input
                        type="file"
                        id="reportCard"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, setReportCard, 'reportCard')}
                        className="file-input"
                      />
                    </>
                  ) : (
                    <div className="file-preview">
                      <div className="file-info">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5V8H19v12H5V4h8v-.5zM7 13h10v1H7v-1zm0 3h10v1H7v-1zm0-6h5v1H7v-1z"/>
                        </svg>
                        <span className="file-name">{reportCard.name}</span>
                      </div>
                      <button 
                        type="button" 
                        className="remove-file-btn"
                        onClick={() => handleRemoveFile(setReportCard, 'reportCard')}
                        title="Remove file"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                {errors.reportCard && <span className="error-text">{errors.reportCard}</span>}
              </div>
            </div>
          </>
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
                      onChange={(e) => {
                        handleSkillChange(e);
                        if (errors.skills && e.target.checked) {
                          setErrors(prev => ({
                            ...prev,
                            skills: undefined
                          }));
                        }
                      }}
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
                    onChange={() => {
                      setHasDisability(true);
                      if (errors.disability) {
                        setErrors(prev => ({
                          ...prev,
                          disability: undefined
                        }));
                      }
                    }}
                  />
                  <label htmlFor="disability-yes">Yes</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="disability-no"
                    name="hasDisability"
                    checked={hasDisability === false}
                    onChange={() => {
                      setHasDisability(false);
                      if (errors.disability) {
                        setErrors(prev => ({
                          ...prev,
                          disability: undefined
                        }));
                      }
                    }}
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
                        onChange={(e) => {
                          handleDisabilityTypeChange(e);
                          if (errors.disability && disabilityType.length === 0 && e.target.checked) {
                            setErrors(prev => ({
                              ...prev,
                              disability: undefined
                            }));
                          }
                        }}
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
                      onChange={handleDisabilityDetailsInput}
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
            onChange={handleTermsCheck}
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
            onClick={() => {
              setShowFaceVerification(true);
              // Clear any face verification errors
              if (errors.face) {
                setErrors(prev => ({
                  ...prev,
                  face: undefined
                }));
              }
            }}
            disabled={faceVerified} // Disable button when face is already verified
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
