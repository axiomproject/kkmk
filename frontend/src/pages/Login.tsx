import React, { useState, useRef } from 'react';
import axios from 'axios';
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
  const MAX_FACE_LOGIN_ATTEMPTS = 3;
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showMpinInput, setShowMpinInput] = useState(false);
  const [mpin, setMpin] = useState('');
  const [mpinError, setMpinError] = useState('');
  const [tempAuthData, setTempAuthData] = useState<{token: string, user: any} | null>(null);
  const mpinInputRef = useRef<HTMLInputElement>(null);
  const [inactiveAccount, setInactiveAccount] = useState(false);

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

    try {
      const response = await axios.post('http://localhost:5175/api/admin/auth/verify-mpin', {
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInactiveAccount(false);
    
    try {
      let response;
      const baseUrl = 'http://localhost:5175';
      
      if (identifier.includes('@kkmk.com')) {
        if (identifier.startsWith('staff.')) {
          // Staff login remains unchanged
          console.log('Attempting staff login...');
          response = await axios.post(`${baseUrl}/api/staff/auth/login`, {
            email: identifier,
            password
          });

          if (response.data.token && response.data.user) {
            login(response.data.user, response.data.token);
            navigate('/staff/dashboard');
          }
        } else {
          // Admin login with MPIN check
          response = await axios.post(`${baseUrl}/api/admin/auth/login`, {
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
        // Regular user login remains unchanged
        response = await axios.post(`${baseUrl}/api/login`, {
          email: identifier,
          password
        });
  
        if (response.data.token && response.data.user) {
          // First store the data
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
      console.error('Login error:', err);
      if (err.response?.data?.inactive) {
        setInactiveAccount(true);
        setError(err.response.data.error);
      } else {
        setError(err.response?.data?.error || 'Login failed');
      }
    }
  };

  const handleFaceLogin = async (faceData: string) => {
    const baseUrl = 'http://localhost:5175';
    try {
      setError('');
      setInactiveAccount(false);
      console.log('Attempting face login...');
      
      const response = await axios.post(`${baseUrl}/api/login/face`, { 
        faceData,
        attemptNumber: faceLoginAttempts + 1
      });
  
      console.log('Face login response:', response.data);
  
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
        console.log('Face login successful');
        login(response.data.user, response.data.token);
        navigate(response.data.user.role === 'admin' ? 
          PATHS.ADMIN.DASHBOARD : PATHS.VOLUNTEER_PROFILE);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Face login error:', err);
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
    }
  };
  

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
          style={{ cursor: 'pointer' }} />
            
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
                  <div className="form-group">
                    <input 
                      type="text" 
                      value={identifier} 
                      onChange={(e) => setIdentifier(e.target.value)} 
                      placeholder="Username or Email"
                    />
                  </div>
                  <div className="form-group">
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Password"
                    />
                  </div>
                  <p className="forgot-password">
                    <Link to={PATHS.FORGOT_PASSWORD}>Forgot Password?</Link>
                  </p>
                  <button type="submit" className="auth-button">Login</button>
                </form>
                <button 
                  type="button" 
                  className="face-login-button"
                  onClick={() => setShowFaceLogin(true)}
                >
                  Login with Face
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
                  <button type="submit" className="auth-button">Verify MPIN</button>
                  <button 
                    type="button" 
                    className="auth-button secondary"
                    onClick={() => {
                      setShowMpinInput(false);
                      setTempAuthData(null);
                      setMpin('');
                    }}
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
