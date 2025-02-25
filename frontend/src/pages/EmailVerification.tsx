import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { PATHS } from '../routes/paths';
import '../styles/Auth.css';

const EmailVerification = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const verificationAttempted = useRef(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token || verificationAttempted.current) return;
      verificationAttempted.current = true;

      try {
        console.log('Starting email verification...');
        console.log('Token:', token);
        
        const response = await axios.get(`http://localhost:5175/api/verify-email/${token}`);
        console.log('Verification response:', response.data);
        
        setStatus('success');
        setMessage(response.data.message);
        
      } catch (error: any) {
        console.error('Verification error:', error);
        setStatus('error');
        const errorMessage = error.response?.data?.error || 'Verification failed';
        setMessage(errorMessage);
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="auth-container full-screen">
      <div className="auth-inner-container">
        <h2>Email Verification</h2>
        {status === 'verifying' && (
          <div className="verification-status">
            <p>Verifying your email...</p>
            {/* Add a loading spinner here if desired */}
          </div>
        )}
        {status === 'success' && (
          <div className="verification-status success">
            <p className="success-message">{message}</p>
            <p>
              Click <Link to={PATHS.LOGIN}>here</Link> to login.
            </p>
          </div>
        )}
        {status === 'error' && (
          <div className="verification-status error">
            <p className="error-message">{message}</p>
            <p>
              Please try registering again or contact support.<br />
              <Link to={PATHS.REGISTER}>Register</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;
