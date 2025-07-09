import React, { useState, useRef, useEffect } from 'react';
import { BsBell, BsBellFill } from 'react-icons/bs'; // Add BsBellFill import
// Add these imports for expand/collapse icons
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import '../../styles/Header.css';
import logo from '../img/kmlogo.png';
import { Link, useNavigate } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import { User } from '../types/auth';
import defaultAvatar from '../img/volunteer/defaultProfile.png'; // Add a default avatar image
import packageIcon from '../img/donate-icon.png'; // Add this new import - You'll need to add this image
import Button from '@mui/material/Button';
import axios from 'axios';
import { toast } from 'react-toastify';

interface HeaderProps {
  onNavigate: (page: string) => void;
}

interface Notification {
  id: string;
  type: string;
  content: string;
  related_id: string;
  read: boolean;
  created_at: string;
  actor_name: string;
  actor_avatar: string;
  expanded?: boolean; // Add this property to track expanded state
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';

// Add helper function to resolve avatar URL correctly
const resolveAvatarUrl = (avatarUrl: string | null | undefined): string => {
  if (!avatarUrl) return defaultAvatar;
  
  // If it's already an absolute URL or data URL, return it as is
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) {
    return avatarUrl;
  }
  
  // If it's a relative path, prepend API_URL
  if (avatarUrl.startsWith('/uploads/')) {
    return `${API_URL}${avatarUrl}`;
  }
  
  // Default case: just try to use what we have
  return avatarUrl;
};

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); // Add this state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const markAllNotificationsAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      await Promise.all(
        unreadNotifications.map(notification =>
          fetch(`${API_URL}/notifications/${notification.id}/read`, {
            method: 'POST'
          })
        )
      );
      
      // Update local state to mark all as read
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Add this helper function
  const markUnreadNotificationsAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      // Send request to mark all notifications as read for this user
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      if (!user) return;

      await fetch(`${API_URL}/notifications/user/${user.id}/read-all`, {
        method: 'POST'
      });
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Add toggle function for mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    // Close other dropdowns when opening mobile menu
    setShowProfileDropdown(false);
    setShowNotifications(false);
  };

  // Add handler for navigation items
  const handleNavigation = (path: string) => {
    onNavigate(path);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  // Updated function to check if applicant is from Payatas area and redirect if ineligible
  const handleApplyAsScholar = () => {
    // Ask user if they are from Payatas area
    const isFromPayatas = window.confirm(
      "KMFI Scholar Program Eligibility Check\n\n" +
      "Scholars must be residents of Payatas, Quezon City to be eligible.\n\n" +
      "Are you a resident of Payatas area?\n\n" +
      "Press OK for Yes, Cancel for No"
    );
    
    if (isFromPayatas) {
      // User confirmed they are from Payatas - proceed with application
      onNavigate('Register');
      
      // Set the scholar role in localStorage temporarily to ensure it's picked up
      localStorage.setItem('preselectedRole', 'scholar');
      
      setIsMobileMenuOpen(false);
    } else {
      // User is not from Payatas - show alert and redirect to homepage
      alert(
        "We're sorry, but KMFI's scholar program is currently only available to residents of Payatas, Quezon City.\n\n" +
        "Thank you for your interest. You may still explore other ways to get involved with our organization."
      );
      
      // Redirect to homepage
      onNavigate('/');
    }
  };

  // Update click outside handler
  useEffect(() => {
    const handleClickOutside = async (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        if (showNotifications) {
          await markUnreadNotificationsAsRead();
          setShowNotifications(false);
        }
      }
      if (isMobileMenuOpen && !(event.target as Element).closest('.nav-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, notifications, isMobileMenuOpen]);

  React.useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Add event listener for profile photo updates
    const handleProfilePhotoUpdate = (event: CustomEvent) => {
      if (user) {
        setUser(prevUser => ({
          ...prevUser!,
          profilePhoto: event.detail.profilePhoto
        }));
      }
    };
    
    // Add event listener for user info updates (name, email)
    const handleUserInfoUpdate = (event: CustomEvent) => {
      if (user) {
        setUser(prevUser => ({
          ...prevUser!,
          name: event.detail.name,
          email: event.detail.email
        }));
      }
    };
    
    window.addEventListener('profilePhotoUpdated', handleProfilePhotoUpdate as EventListener);
    window.addEventListener('userInfoUpdated', handleUserInfoUpdate as EventListener);
    
    return () => {
      window.removeEventListener('profilePhotoUpdated', handleProfilePhotoUpdate as EventListener);
      window.removeEventListener('userInfoUpdated', handleUserInfoUpdate as EventListener);
    };
  }, [user?.id]); // Depend on user ID to ensure we have a user before updating

  useEffect(() => {
    const fetchNotifications = async () => {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user) return;

      try {
        const response = await fetch(`${API_URL}/notifications/user/${user.id}`);  // Updated URL
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
          setUnreadCount(data.filter((n: Notification) => !n.read).length);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    // Set up polling for new notifications
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    // Trigger a custom event that VolunteerProfile can listen to
    window.dispatchEvent(new Event('userLoggedOut'));
    
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    onNavigate('/');
  };


  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      await fetch(`${API_URL}/notifications/${notification.id}/read`, {
        method: 'POST'
      });
  
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Navigate based on notification type
      if (notification.type === 'post_like' || 
          notification.type === 'comment_like' || 
          notification.type === 'new_comment') {
        // Add postId to the URL as a query parameter for highlighting
        onNavigate(`Forum?postId=${notification.related_id}`);
      } else if (notification.type.includes('post') || notification.type.includes('comment')) {
        // Handle other post or comment related notifications
        onNavigate(`Forum?postId=${notification.related_id}`);
      }
      
      setShowNotifications(false);
  
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleEventResponse = async (notification: Notification, confirmed: boolean) => {
    try {
      // Add debug logging
      console.log('Notification data:', notification);
      console.log('Event ID from notification:', notification.related_id);
  
      const eventId = notification.type === 'event_reminder' 
        ? notification.related_id  // Use related_id directly for event reminders
        : parseInt(notification.related_id);
  
      console.log('Processing event response:', {
        notificationId: notification.id,
        userId: user?.id,
        eventId: eventId,
        confirmed
      });
  
      const response = await axios.post(`${API_URL}/notifications/event-response`, {
        notificationId: notification.id,
        userId: user?.id,
        eventId: eventId.toString(), // Convert to string for API request
        confirmed
      });
  
      if (response.data.success) {
        // Update local notification state
        setNotifications(prevNotifications =>
          prevNotifications.map(n =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
  
        // Show feedback to user
        toast.success(confirmed ? 
          'You have confirmed your participation' : 
          'You have been removed from the event'
        );
  
        // Close notifications dropdown after action
        setShowNotifications(false);
      }
    } catch (error) {
      console.error('Error handling event response:', error);
      toast.error('Failed to process your response');
    }
  };

  const handleDonateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(`${PATHS.HELP}?tab=donate`);
    setTimeout(() => {
      const donationForm = document.querySelector('.donation-form-container');
      if (donationForm) {
        donationForm.scrollIntoView({ behavior: 'smooth' });
      }
    }, 500);
  };

  // Add this function to toggle notification expansion
  const toggleNotificationExpand = (id: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent notification click event from firing
    setNotifications(prevNotifications =>
      prevNotifications.map(n =>
        n.id === id ? { ...n, expanded: !n.expanded } : n
      )
    );
  };

  return (
    <header className="header-container">
      <div className="logo-container">
        <img 
          src={logo} 
          alt="KM Logo" 
          className="logo-image" 
          onClick={() => onNavigate('/')}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <nav className={`nav-container ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="nav-list">
          {!user ? (
            <div className="mobile-auth-buttons two-buttons">
              <div className="apply-scholar-button" onClick={() => {
                handleApplyAsScholar();
              }}>
                Apply as Scholar
              </div>
              <div className="signup-button sign-up" onClick={() => {
                handleNavigation('Login');
                setIsMobileMenuOpen(false);
              }}>
                Sign Up
              </div>
              <div className="donate-button donate">
                <Link 
                  to={`${PATHS.HELP}?tab=donate`} 
                  className="donate-button donate"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Donate
                </Link>
              </div>
            </div>
          ) : (
            <div className="mobile-auth-buttons single-button">
              <div className="donate-button donate">
                <Link 
                  to={`${PATHS.HELP}?tab=donate`} 
                  className="donate-button donate"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Donate
                </Link>
              </div>
            </div>
          )}

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
          <li className="nav-item" >
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
            <a className="nav-link" onClick={() => onNavigate('Contact')}>
              Contact Us
            </a>
          </li>
        </ul>
      </nav>

      <div className="actions-container">
        {user ? (
          <div className="user-actions">
            {/* Move donate button to hamburger menu on mobile */}
            <div className="donate-button donate desktop-only">
              <a 
                href="#"
                className="donate-button donate"
                onClick={handleDonateClick}
              >
                Donate
              </a>
            </div>
            <div className="notification-container" ref={notificationRef}>
              <div className="notification-icon" onClick={async () => {
                if (showNotifications) {
                  await markUnreadNotificationsAsRead();
                }
                setShowNotifications(!showNotifications);
              }}>
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
                {showNotifications ? <BsBellFill size={20} /> : <BsBell size={20} />}
              </div>
              <div className={`notifications-dropdown ${showNotifications ? 'active' : ''}`}>
                <div className="notifications-header">
                  <h3>Notifications</h3>
                  {notifications.length > 0 && (
                    <Button
                      size="small"
                      onClick={markAllNotificationsAsRead}
                      sx={{
                        fontSize: '12px',
                        fontFamily: 'Poppins',
                        color: '#f99407',
                        '&:hover': {
                          backgroundColor: 'rgba(249, 148, 7, 0.1)',
                        }
                      }}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <div className="no-notifications">No notifications</div>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`notification-item ${!notification.read ? 'unread' : ''}`}
                        onClick={
                          // Make notification clickable based on type
                          (notification.type === 'post_like' || 
                           notification.type === 'comment_like' || 
                           notification.type === 'new_comment' || 
                           notification.type.includes('post') || 
                           notification.type.includes('comment')) 
                            ? () => handleNotificationClick(notification) 
                            : undefined
                        }
                        style={{ 
                          cursor: (notification.type === 'post_like' || 
                                   notification.type === 'comment_like' || 
                                   notification.type === 'new_comment' || 
                                   notification.type.includes('post') || 
                                   notification.type.includes('comment')) ? 'pointer' : 'default' 
                        }}
                      >
                        <img 
                          src={notification.type === 'distribution' ? packageIcon : resolveAvatarUrl(notification.actor_avatar)}
                          alt={notification.type === 'distribution' ? "Package" : "User avatar"}
                          className="notification-avatar"
                          onError={(e) => {
                            // If image fails to load, replace with default avatar
                            (e.target as HTMLImageElement).src = defaultAvatar;
                          }}
                        />
                        <div className="notification-content">
                          <div className="notification-text-container">
                            <p className={`notification-text ${notification.expanded ? 'expanded' : ''}`}>
                              {notification.content}
                            </p>
                            <button 
                              className="expand-button"
                              onClick={(e) => toggleNotificationExpand(notification.id, e)}
                              title={notification.expanded ? "Show less" : "Show more"}
                            >
                              {notification.expanded ? 
                                <KeyboardArrowUpIcon fontSize="small" /> : 
                                <KeyboardArrowDownIcon fontSize="small" />
                              }
                            </button>
                          </div>
                          {notification.type === 'event_reminder' && !notification.read && (
                            <div className="notification-actions">
                              <div 
                                className="event-confirm-action"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent parent click
                                  handleEventResponse(notification, true);
                                }}
                              >
                                Yes, I'll attend
                              </div>
                              <div 
                                className="event-decline-action"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent parent click
                                  handleEventResponse(notification, false);
                                }}
                              >
                                No, remove me
                              </div>
                            </div>
                          )}
                          <span className="notification-time">
                            {formatTimeAgo(new Date(notification.created_at))}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="profile-dropdown-container" ref={dropdownRef}>
              <div 
                className="profile-trigger" 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <img 
                  src={user.profilePhoto || defaultAvatar} 
                  alt="Profile" 
                  className="profile-avatar" 
                />
              </div>
              <div className={`profile-dropdown-menu ${showProfileDropdown ? 'active' : ''}`}>
                <div className="profile-header">
                  <img 
                    src={user.profilePhoto || defaultAvatar} 
                    alt="Profile" 
                    className="dropdown-avatar"
                  />
                    <div className="profile-info">
                      <span className="profile-name">{user.name}</span>
                      <span className="profile-email">{user.email}</span>
                    </div>
                  </div>
                
                  <div className="dropdown-item" onClick={() => {
                    onNavigate('Profile');
                    setShowProfileDropdown(false);
                  }}>
                    My Profile
                  </div>
                  <div className="dropdown-item" onClick={() => {
                    onNavigate('Forum');
                    setShowProfileDropdown(false);
                  }}>
                    Forum
                  </div>
                  <div className="dropdown-item" onClick={() => {
                    onNavigate('Settings');
                    setShowProfileDropdown(false);
                  }}>
                    Settings
                  </div>
                  <div className="dropdown-item" onClick={() => {
                    handleLogout();
                    setShowProfileDropdown(false);
                  }}>
                    Logout
                  </div>
                </div>
              </div>
            </div>
        ) : (
          <div className="desktop-auth-buttons">
            <div className="apply-scholar-button" onClick={handleApplyAsScholar}>
              Apply as Scholar
            </div>
            <div className="signup-button sign-up" onClick={() => onNavigate('Login')}>
              Sign Up
            </div>
            <div className="donate-button donate">
              <a 
                href="#"
                className="donate-button donate"
                onClick={handleDonateClick}
              >
                Donate
              </a>
            </div>
          </div>
        )}
      </div>

      <button 
        className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`} 
        onClick={toggleMobileMenu}
      >
        <div></div>
        <div></div>
        <div></div>
      </button>
    </header>
  );
};

// Helper function to format time
const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

export default Header;