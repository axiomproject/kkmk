import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import logo from '../../img/kmlogo.png';
import { PATHS } from '../../routes/paths';
import '../../styles/admin/AdminHomeHeader.css';

const AdminHomeHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isStaff = user?.role === 'staff';
  const defaultProfilePic = '/assets/default-avatar.png';  // Update default avatar path
  const baseUrl = 'http://localhost:5175'; // Add base URL
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const toggleMobileMenu = () => {
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

      <div className="actions-container">
        <div className="profile-dropdown-container" ref={dropdownRef}>
          <div className="profile-trigger" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
            <img 
              src={user?.profilePhoto ? `${baseUrl}${user.profilePhoto}` : defaultProfilePic}
              alt={user?.name || 'Admin'}
              className="admin-avatar"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null; 
                target.src = defaultProfilePic;
                console.log('Fallback to default avatar:', defaultProfilePic);
              }}
            />
            <span className="admin-name">{user?.name}</span>
            <span className="material-icons">keyboard_arrow_down</span>
          </div>
          <div className={`profile-dropdown-menu ${showProfileDropdown ? 'active' : ''}`}>
            <div className="profile-header">
              <div className="profile-info">
                <span className="profile-name">{user?.name}</span>
                <span className="profile-roles">{user?.role}</span>
              </div>
            </div>
       
            <Link to={isStaff ? PATHS.STAFF.DASHBOARD : PATHS.ADMIN.DASHBOARD} className="dropdown-item">
              {isStaff ? 'Staff Dashboard' : 'Admin Dashboard'}
            </Link>
            <div className="dropdown-item" onClick={() => {
                    navigate('Forum');
                    setShowProfileDropdown(false);
                  }}>
                    Forum
                  </div>
            <Link to={PATHS.ADMIN.SETTINGS} className="dropdown-item">
              Settings
            </Link>
            <div className="dropdown-item" onClick={handleLogout}>
              Logout
            </div>
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
    </header>
  );
};

export default AdminHomeHeader;
