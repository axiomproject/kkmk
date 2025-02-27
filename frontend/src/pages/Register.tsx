import React, { useState, useEffect } from 'react';
import api from '../config/axios'; // Replace axios import
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/Auth.css';
import { RegistrationResponse } from '../types/auth';
import FaceVerification from '../components/FaceVerification';

interface ValidationErrors {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  dateOfBirth?: string;
  role?: string;
  terms?: string;
  face?: string;
}

const Register: React.FC = () => {
  const location = useLocation();
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [role, setRole] = useState<'volunteer' | 'scholar' | 'sponsor'>();
  const [name, setName] = useState('');
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
  const navigate = useNavigate();

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
      setStep('role');
      setRole(undefined); // Reset role when going back to role selection
    } else {
      navigate(-1);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.length < 2 || name.length > 50) {
      newErrors.name = 'Name must be between 2 and 50 characters';
    }

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3 || username.length > 20) {
      newErrors.username = 'Username must be between 3 and 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
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

    // Date of Birth validation
    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of Birth is required';
    }

    // Add role validation
    if (!role) {
      newErrors.role = 'Role is required';
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
      const registrationData = {
        name,
        username,
        email,
        password,
        dateOfBirth,
        role,
        faceData: faceVerified ? faceData : null
      };

      const response = await api.post('/register', registrationData);
      setSuccess(response.data.message);
      setShowSuccessPopup(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  const handleRoleSelect = (selectedRole: 'volunteer' | 'scholar' | 'sponsor') => {
    setRole(selectedRole);
    // Add a small delay before transition to make it smoother
    setTimeout(() => setStep('form'), 50);
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
      <p>Select how you want to join Kmkk</p>
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
        <div className="form-group-row">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className={errors.name ? 'error-input' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="username">Username</label>
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
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
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
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={errors.password ? 'error-input' : ''}
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="dateOfBirth">Date of Birth</label>
          <input
            type="date"
            id="dateOfBirth"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            placeholder="Date of Birth"
            className={errors.dateOfBirth ? 'error-input' : ''}
          />
          {errors.dateOfBirth && <span className="error-text">{errors.dateOfBirth}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'volunteer' | 'scholar' | 'sponsor')}
            className={errors.role ? 'error-input' : ''}
          >
            <option value="volunteer">Volunteer</option>
            <option value="scholar">Scholar</option>
            <option value="sponsor">Sponsor</option>
          </select>
          {errors.role && <span className="error-text">{errors.role}</span>}
        </div>
        <div className="terms-checkbox">
          <input
            type="checkbox"
            id="terms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className={errors.terms ? 'error-input' : ''}
          />
          <label htmlFor="terms">
            I agree with kmkk's{' '}
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
            {faceVerified ? 'Face Verified ✓' : 'Verify Face (Optional)'}
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
        
        {/* Success Popup - Updated animation with AnimatePresence handled directly in renderSuccessPopup */}
        <AnimatePresence>
          {showSuccessPopup && renderSuccessPopup()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Register;