import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../config/axios'; // Replace axios import
import { PATHS } from '../../routes/paths';
import '../../styles/Auth.css';
import { motion, AnimatePresence } from 'framer-motion';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    navigate(-1);
  };

  const validateEmail = (email: string): boolean => {
    setEmailError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }

    // RFC 5322 compliant email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    setEmailError('');

    if (!validateEmail(email)) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post('/forgot-password', { email });
      setMessage(response.data.message);
      setEmail(''); // Clear email field after successful submission
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      validateEmail(e.target.value);
    }
  };

  return (
    <div className="auth-container-register full-screen">
      <div className="auth-inner-container-forgot-password">
        <div className="back-button" onClick={handleBack}>
          <svg viewBox="0 0 24 24" fill="#242424">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </div>
        
        <AnimatePresence mode='wait'>
          <motion.div
            key="forgot-password-form"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="forgot-password-content"
          >
            <h1>Forgot Password</h1>
            <div className="forgot-password-description">
              <p>Enter the email address you used when you joined and we'll send you instructions to reset your password.</p>
              <p>For security reasons, we do NOT store your password. So rest assured that we will never send your password via email.</p>
            </div>
            <form onSubmit={handleSubmit} className="forgot-password-form">
              <div className="form-group-forgot">
                <h3>Email</h3>
                <input 
                  type="email" 
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => validateEmail(email)}
                  placeholder="Enter your email"
                  className={emailError ? 'error-input' : ''}
                  required
                />
                {emailError && <span className="error-text">{emailError}</span>}
              </div>
              
              {message && <p className="success-message">{message}</p>}
              {error && <p className="error-message">{error}</p>}
              
              <button 
                type="submit" 
                className="auth-button-forgot"
                disabled={isLoading || !!emailError}
              >
                {isLoading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ForgotPassword;