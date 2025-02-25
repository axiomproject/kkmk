import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import kkmkLogo from '../../img/kmlogo.png';
import { PATHS } from '../../routes/paths';
import defaultAvatarImg from '../../../../public/images/default-avatar.jpg'; // Add this import

const AdminHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const defaultProfilePic = defaultAvatarImg;  // Update this line
  const baseUrl = 'http://localhost:5175'; // Add base URL

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    console.log('Current user:', user); // Add this debug log
  }, [user]);

  // Add a useEffect to monitor user changes
  useEffect(() => {
    console.log('AdminHeader user updated:', user);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getProfilePhotoUrl = () => {
    console.log('Getting profile photo for user:', user); // Debug log
    
    if (!user?.profilePhoto) {
      console.log('No profile photo, using default');
      return defaultProfilePic;
    }
    
    // Debug logs
    console.log('User role:', user.role);
    console.log('Profile photo path:', user.profilePhoto);
    console.log('Base URL:', baseUrl);
    
    const photoPath = user.profilePhoto.startsWith('http') 
      ? user.profilePhoto 
      : `${baseUrl}${user.profilePhoto}`;
    
    console.log('Final photo URL:', photoPath);
    // Add timestamp to force reload
    return `${photoPath}?t=${new Date().getTime()}`;
  };

  return (
    <header className="admin-header">
      <div className="header-left">
        <img src={kkmkLogo} alt="KKMK Logo" className="admin-logo" />
      </div>
      <div className="header-right">
        <div 
          ref={dropdownRef}
          className={`admin-profile ${showDropdown ? 'active' : ''}`} 
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <img 
            src={getProfilePhotoUrl()}
            alt={user?.name || 'User'}
            className="admin-avatar"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null; // Prevent infinite loop
              target.src = defaultProfilePic;
              console.log('Failed to load profile photo:', target.src);
              console.log('User object:', user);
            }}
          />
          <span className="admin-name">{user?.name}</span>
          <span className="material-icons">keyboard_arrow_down</span>
          
          <div className={`admin-dropdown ${showDropdown ? 'show' : ''}`}>
            <div className="dropdown-header">
              <strong>{user?.name}</strong>
              <span>{user?.role}</span>
            </div>
            <Link to={PATHS.HOME} className="dropdown-item">
              Home Page
            </Link>
            <Link to={PATHS.ADMIN.SETTINGS} className="dropdown-item">
              Settings
            </Link>
            <div className="dropdown-item" onClick={handleLogout}>
              Logout
            </div>
          </div>
        </div>
      </div>

    
    </header>
  );
};

export default AdminHeader;
