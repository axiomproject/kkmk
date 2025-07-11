import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import logo from '../../img/kmlogo.png';
import { PATHS } from '../../routes/paths';
import '../../styles/admin/AdminHomeHeader.css';
import defaultAvatarImg from '../../../../public/images/default-avatar.jpg';

const MobileMenu = ({ isOpen, onClose, onNavigate, isStaff, onLogout, user, getProfilePhotoUrl }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onNavigate: (path: string) => void;
  isStaff: boolean;
  onLogout: () => void;
  user: any;
  getProfilePhotoUrl: () => string;
}) => {
  const handleNavigation = (path: string) => {
    onNavigate(path);
    onClose();
  };

  return (
    <div className={`mobile-menu ${isOpen ? 'active' : ''}`}>
      <button className="mobile-menu-close" onClick={onClose}>
        <span className="material-icons">close</span>
      </button>
      <nav className="mobile-nav">
        <ul className="mobile-nav-list">
          {/* Profile section at the top */}
          <li className="mobile-nav-item profile-section" style={{ '--item-index': 0 } as React.CSSProperties}>
            <div className="mobile-profile-header">
              <img 
                src={getProfilePhotoUrl()}
                alt={user?.name || 'User'}
                className="mobile-profile-avatar"
              />
              <div className="mobile-profile-info">
                <span className="mobile-profile-name">{user?.name}</span>
                <span className="mobile-profile-role">{user?.role}</span>
              </div>
            </div>
          </li>

          {/* Admin specific items */}
          <li className="mobile-nav-item" style={{ '--item-index': 1 } as React.CSSProperties}>
            <button 
              className="mobile-nav-button"
              onClick={() => handleNavigation(isStaff ? PATHS.STAFF.DASHBOARD : PATHS.ADMIN.DASHBOARD)}
            >
              {isStaff ? 'Staff Dashboard' : 'Admin Dashboard'}
            </button>
          </li>

          <li className="mobile-nav-item" style={{ '--item-index': 2 } as React.CSSProperties}>
            <button 
              className="mobile-nav-button"
              onClick={() => handleNavigation('Forum')}
            >
              Forum
            </button>
          </li>

          <li className="mobile-nav-item" style={{ '--item-index': 3 } as React.CSSProperties}>
            <button 
              className="mobile-nav-button"
              onClick={() => handleNavigation(PATHS.ADMIN.SETTINGS)}
            >
              Settings
            </button>
          </li>

          {/* Regular navigation items */}
          <li className="mobile-nav-item" style={{ '--item-index': 4 } as React.CSSProperties}>
            <div className="mobile-nav-button section-title">
              About Us
            </div>
            <div className="mobile-dropdown">
              <button onClick={() => handleNavigation('Story')}>Our Story</button>
              <button onClick={() => handleNavigation('Partner')}>Partners and Sponsors</button>
              <button onClick={() => handleNavigation('Team')}>Meet the Team</button>
              <button onClick={() => handleNavigation('Events')}>Events</button>
              <button onClick={() => handleNavigation('Map')}>Map</button>
            </div>
          </li>

          <li className="mobile-nav-item" style={{ '--item-index': 5 } as React.CSSProperties}>
            <button 
              className="mobile-nav-button"
              onClick={() => handleNavigation('Life')}
            >
              Life with KM
            </button>
          </li>

          <li className="mobile-nav-item" style={{ '--item-index': 6 } as React.CSSProperties}>
            <div className="mobile-nav-button section-title">
              Testimonials
            </div>
            <div className="mobile-dropdown">
              <button onClick={() => handleNavigation('Graduates')}>Our Graduates</button>
              <button onClick={() => handleNavigation('Community')}>Our Community</button>
            </div>
          </li>

          <li className="mobile-nav-item" style={{ '--item-index': 7 } as React.CSSProperties}>
            <div className="mobile-nav-button section-title">
              How can you help?
            </div>
            <div className="mobile-dropdown">
              <button onClick={() => handleNavigation('Help')}>Help</button>
              <button onClick={() => handleNavigation(PATHS.STUDENTPROFILE)}>Sponsor A Student</button>
            </div>
          </li>

          <li className="mobile-nav-item" style={{ '--item-index': 8 } as React.CSSProperties}>
            <button className="mobile-nav-button" onClick={() => handleNavigation('Contact')}>
              Contact Us
            </button>
          </li>

          {/* Logout button at the bottom */}
          <li className="mobile-nav-item" style={{ '--item-index': 9 } as React.CSSProperties}>
            <button 
              className="mobile-nav-button logout-button"
              onClick={() => {
                onLogout();
                onClose();
              }}
            >
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

const AdminHomeHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isStaff = user?.role === 'staff';
  const defaultProfilePic = defaultAvatarImg;
  const baseUrl = 'http://localhost:5175';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${import.meta.env.VITE_API_URL}${path}`;
  };

  const getProfilePhotoUrl = () => {
    if (!user?.profilePhoto) {
      return defaultProfilePic;
    }
    
    return getImageUrl(user.profilePhoto);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (isMobileMenuOpen && !(event.target as Element).closest('.nav-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Effect to handle scroll lock
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('body-lock');
    } else {
      document.body.classList.remove('body-lock');
    }
    
    return () => {
      document.body.classList.remove('body-lock');
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setShowProfileDropdown(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header-container">
      <div className="logo-container">
        <img 
          src={logo} 
          alt="KM Logo" 
          className="logo-image" 
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        />
      </div>
     
      <nav className={`nav-container ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="nav-list">
          <li className="nav-item dropdown">
            <div className="nav-link-about">
              About Us <span className="dropdown-arrow">&#9662;</span>
            </div>
            <ul className="dropdown-menu">
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Story')}>
                  Our Story
                </a>
              </li>
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Partner')}>
                  Partners and Sponsors
                </a>
              </li>
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Team')}>
                  Meet the Team
                </a>
              </li>
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Events')}>
                  Events
                </a>
              </li>
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Map')}>
                  Map
                </a>
              </li>
            </ul>
          </li>
          <li className="nav-item">
            <a className="nav-link" onClick={() => handleNavigation('Life')}>
              Life with KM
            </a>
          </li>
          <li className="nav-item dropdown">
            <div className="nav-link-testimonials">
              Testimonials <span className="dropdown-arrow">&#9662;</span>
            </div>
            <ul className="dropdown-menu">
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Graduates')}>
                  Our Graduates
                </a>
              </li>
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Community')}>
                  Our Community
                </a>
              </li>
            </ul>
          </li>
          <li className="nav-item dropdown">
            <div className="nav-link-help">
              How can you help? <span className="dropdown-arrow">&#9662;</span>
            </div>
            <ul className="dropdown-menu">
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation('Help')}>
                  Help
                </a>
              </li>
              <li>
                <a className="dropdown-link" onClick={() => handleNavigation(PATHS.STUDENTPROFILE)}>
                  Sponsor A Student
                </a>
              </li>
            </ul>
          </li>
          <li className="nav-item">
            <a className="nav-link" onClick={() => navigate('Contact')}>
              Contact Us
            </a>
          </li>
        </ul>
      </nav>

      <div className="profile-section">
        <div className="profile-dropdown-container" ref={dropdownRef}>
          <div 
            className="profile-trigger"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <span className="admin-badge">{isStaff ? 'Staff' : 'Admin'}</span>
            <img 
              src={getProfilePhotoUrl()}
              alt={user?.name || 'User'}
              className="profile-avatar"
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <span className="profile-name">{user?.name}</span>
            <span className="dropdown-arrow">&#9662;</span>
          </div>

          <div className={`profile-dropdown-menu ${showProfileDropdown ? 'active' : ''}`}>
            <div className="profile-header">
              <div className="profile-info">
                <span className="profile-name">{user?.name}</span>
                <span className="profile-roles">{isStaff ? 'Staff Member' : 'Administrator'}</span>
              </div>
            </div>
            <a 
              className="dropdown-item"
              onClick={() => {
                handleNavigation(isStaff ? PATHS.STAFF.DASHBOARD : PATHS.ADMIN.DASHBOARD);
                setShowProfileDropdown(false);
              }}
            >
              {isStaff ? 'Staff Dashboard' : 'Admin Dashboard'}
            </a>
            <a 
              className="dropdown-item"
              onClick={() => {
                handleNavigation('Forum');
                    setShowProfileDropdown(false);
              }}
            >
                    Forum
            </a>
            <a 
              className="dropdown-item"
              onClick={() => {
                handleNavigation(PATHS.ADMIN.SETTINGS);
                setShowProfileDropdown(false);
              }}
            >
              Settings
            </a>
            <a 
              className="dropdown-item"
              onClick={() => {
                handleLogout();
                setShowProfileDropdown(false);
              }}
              style={{ color: '#DF2E38' }}
            >
              Logout
            </a>
          </div>
        </div>
      </div>

      <button 
        className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`} 
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        <div></div>
        <div></div>
        <div></div>
      </button>

      <MobileMenu 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleNavigation}
        isStaff={isStaff}
        onLogout={handleLogout}
        user={user}
        getProfilePhotoUrl={getProfilePhotoUrl}
      />
    </header>
  );
};

export default AdminHomeHeader;
