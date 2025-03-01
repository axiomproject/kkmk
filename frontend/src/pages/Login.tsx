import React, { useState, useRef, useCallback } from 'react';
import api from '../config/axios';
import { useNavigate, Link } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import { LoginResponse } from '../types/auth';
import '../styles/Auth.css';
import kkmkLogo from '../img/kmlogo.png';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import LoginFaceVerification from '../components/LoginFaceVerification';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  const [faceLoginAttempts, setFaceLoginAttempts] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingFace, setIsProcessingFace] = useState(false);
  const MAX_FACE_LOGIN_ATTEMPTS = 3;
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showMpinInput, setShowMpinInput] = useState(false);
  const [mpin, setMpin] = useState('');
  const [mpinError, setMpinError] = useState('');
  const [tempAuthData, setTempAuthData] = useState<{token: string, user: any} | null>(null);
  const mpinInputRef = useRef<HTMLInputElement>(null);
  const [inactiveAccount, setInactiveAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleMpinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMpinError('');

    if (!mpin || mpin.length !== 4 || !/^\d+$/.test(mpin)) {
      setMpinError('Please enter a valid 4-digit MPIN');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await api.post('/admin/auth/verify-mpin', {
        mpin,
        token: tempAuthData?.token
      });

      // If MPIN verification is successful, complete the login
      if (response.data.verified) {
        if (tempAuthData) {
          login(tempAuthData.user, tempAuthData.token);
          navigate(PATHS.ADMIN.DASHBOARD);
        }
      }
    } catch (error: any) {
      setMpinError(error.response?.data?.error || 'MPIN verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optimize user login with debounce/state guard
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    setError('');
    setInactiveAccount(false);
    setIsSubmitting(true);
    
    try {
      let response;
      
      if (identifier.includes('@kkmk.com')) {
        if (identifier.startsWith('staff.')) {
          // Staff login remains unchanged
          response = await api.post('/staff/auth/login', {
            email: identifier,
            password
          });

          if (response.data.token && response.data.user) {
            login(response.data.user, response.data.token);
            navigate('/staff/dashboard');
          }
        } else {
          // Admin login with MPIN check
          response = await api.post('/admin/auth/login', {
            email: identifier,
            password
          });

          if (response.data.requireMpin) {
            // Store temporary auth data and show MPIN input
            setTempAuthData({
              token: response.data.token,
              user: response.data.user
            });
            setShowMpinInput(true);
          } else {
            // Regular login if MPIN is not enabled
            login(response.data.user, response.data.token);
            navigate(PATHS.ADMIN.DASHBOARD);
          }
        }
      } else {
        // Regular user login with optimizations
        response = await api.post('/login', {
          email: identifier,
          password
        });
  
        if (response.data.token && response.data.user) {
          // First store the data - do this asynchronously
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // Then update auth context
          await login(response.data.user, response.data.token);
          
          // Finally navigate
          if (response.data.user.role === 'admin') {
            navigate('/admin/dashboard');
          } else if (response.data.user.role === 'staff') {
            navigate('/staff/dashboard');
          } else {
            navigate(PATHS.VOLUNTEER_PROFILE);
          }
        }
      }
    } catch (err: any) {
      if (err.response?.data?.inactive) {
        setInactiveAccount(true);
        setError(err.response.data.error);
      } else {
        setError(err.response?.data?.error || 'Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optimize face login with useCallback and state guards
  const handleFaceLogin = useCallback(async (faceData: string) => {
    // Prevent processing multiple face login attempts simultaneously
    if (isProcessingFace) return;
    
    try {
      setError('');
      setInactiveAccount(false);
      setIsProcessingFace(true);
      
      const response = await api.post('/login/face', { 
        faceData,
        attemptNumber: faceLoginAttempts + 1
      });
  
      // Handle rescan request
      if (response.data.needsRescan) {
        setFaceLoginAttempts(prev => prev + 1);
        if (faceLoginAttempts < MAX_FACE_LOGIN_ATTEMPTS) {
          setShowFaceLogin(true);
          setError(response.data.message || 'Please try face verification again');
        } else {
          setError('Maximum face login attempts reached. Please use password login');
          setShowFaceLogin(false);
        }
        return;
      }
  
      // Handle successful login
      if (response.data.token && response.data.user) {
        // Store token and user data simultaneously
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Update auth context
        await login(response.data.user, response.data.token);
        
        // Navigate based on role
        navigate(response.data.user.role === 'admin' ? 
          PATHS.ADMIN.DASHBOARD : PATHS.VOLUNTEER_PROFILE);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      if (err.response?.data?.inactive) {
        setInactiveAccount(true);
        setError(err.response.data.error);
      } else {
        const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Face login failed';
        setError(errorMessage);
        if (err.response?.status === 401) {
          setFaceLoginAttempts(prev => prev + 1);
          if (faceLoginAttempts >= MAX_FACE_LOGIN_ATTEMPTS) {
            setShowFaceLogin(false);
          }
        }
      }
    } finally {
      setIsProcessingFace(false);
    }
  }, [faceLoginAttempts, isProcessingFace, login, navigate]);
  
  const handleFaceLoginFailure = () => {
    setError('Face login failed after multiple attempts. Please use password login.');
    setShowFaceLogin(false);
  };

  const focusMpinInput = () => {
    if (mpinInputRef.current) {
      mpinInputRef.current.focus();
    }
  };

  return (
    <div className="auth-container full-screen">
      <div className="auth-inner-container">
        <AnimatePresence mode='wait'>
          <motion.div
            key={showMpinInput ? "mpin-form" : "login-form"}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            <img src={kkmkLogo} 
              alt="KKMK Logo" 
              className="auth-logo"
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer' }} 
            />
            
            {!showMpinInput ? (
              // Regular login form
              <>
                <h1>Welcome</h1>
                <p>Sign in to KMFI</p>
                {error && (
                  <p className={`error-message ${inactiveAccount ? 'inactive-account' : ''}`}>
                    {error}
                    {inactiveAccount && (
                      <button 
                        className="contact-admin-link"
                        onClick={() => navigate('/contact')}
                      >
                        Contact Administrator
                      </button>
                    )}
                  </p>
                )}
                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="form-groups">
                    <input 
                      type="text" 
                      value={identifier} 
                      onChange={(e) => setIdentifier(e.target.value)} 
                      placeholder="Username or Email"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-groups">
                    <div className="password-input-wrapper">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Password"
                        disabled={isSubmitting}
                        className="password-input"
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
                  </div>
                  <p className="forgot-password">
                    <Link to={PATHS.FORGOT_PASSWORD}>Forgot Password?</Link>
                  </p>
                  <button 
                    type="submit" 
                    className="auth-button" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Logging in...' : 'Login'}
                  </button>
                </form>
                <button 
                  type="button" 
                  className="face-login-button"
                  onClick={() => setShowFaceLogin(true)}
                  disabled={isProcessingFace}
                >
                  {isProcessingFace ? 'Processing...' : 'Login with Face'}
                </button>

                {showFaceLogin && (
                  <LoginFaceVerification
                    onClose={() => setShowFaceLogin(false)}
                    onSuccess={handleFaceLogin}
                    onFailure={handleFaceLoginFailure}
                  />
                )}
                <p className="auth-link">
                  Don't have an account? <Link to={PATHS.REGISTER}>Sign up</Link>
                </p>
              </>
            ) : (
              // MPIN verification form
              <>
                <h1>Enter MPIN</h1>
                <p>Please enter your 4-digit MPIN to complete login</p>
                {mpinError && <p className="error-message">{mpinError}</p>}
                <form onSubmit={handleMpinSubmit} className="auth-form mpin-form">
                  <div className="mpin-input-container" onClick={focusMpinInput}>
                    <input
                      ref={mpinInputRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={mpin}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (/^\d+$/.test(value) && value.length <= 4)) {
                          setMpin(value);
                        }
                      }}
                      className="mpin-hidden-input"
                      autoFocus
                      disabled={isSubmitting}
                    />
                    <div className="mpin-display">
                      {[...Array(4)].map((_, index) => (
                        <div
                          key={index}
                          className={`mpin-digit ${index < mpin.length ? 'filled' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="auth-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify MPIN'}
                  </button>
                  <button 
                    type="button" 
                    className="auth-button secondary"
                    onClick={() => {
                      setShowMpinInput(false);
                      setTempAuthData(null);
                      setMpin('');
                    }}
                    disabled={isSubmitting}
                  >
                    Back to Login
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Login;
