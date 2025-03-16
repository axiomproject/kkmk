import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { BsBell, BsBellFill } from 'react-icons/bs';
import kkmkLogo from '../../img/kmlogo.png';
import { PATHS } from '../../routes/paths';
import defaultAvatarImg from '../../../../public/images/default-avatar.jpg';
import packageIcon from '../../img/donate-icon.png';
import '../../styles/AdminHeader.css'; // Make sure to import the CSS file

// Add notification interface
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

// Notification type for tab filtering
type NotificationType = 'user' | 'donation' | 'distribution' | 'student' | 'event' | 'all';

const AdminHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const defaultProfilePic = defaultAvatarImg;
  
  // Add notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<NotificationType>('all');
  const [notificationClosing, setNotificationClosing] = useState(false);
  const bellIconRef = useRef<HTMLDivElement>(null);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';

  // Define notification type mapper to categorize notifications
  const getNotificationType = (notification: Notification): NotificationType => {
    if (notification.type === 'new_user') {
      // Special handling for new_user notifications
      if (notification.content.includes('scholar')) {
        return 'student';
      } else {
        return 'user';
      }
    }
    
    if (notification.type === 'user_updated') return 'user';
    
    // Contact form notifications go to the user tab
    if (notification.type === 'contact_form') return 'user';
    
    // Event participant notifications and event leave notifications
    if (notification.type === 'event_participant' || 
        notification.type === 'event_leave' || 
        notification.type.includes('event')) {
      return 'event'; // Categorize as event type
    }
    
    // Scholar location notifications
    if (notification.type === 'scholar_location' ||
        notification.type.includes('location') ||
        notification.content.includes('location')) {
      return 'student';
    }
    
    // Report card notifications
    if (notification.type === 'report_card' ||
        notification.content.toLowerCase().includes('report card')) {
      return 'student';
    }
    
    // Include all donation related notifications in the donation category
    if (notification.type.includes('donation') || 
        notification.type === 'donation_verified' || 
        notification.type === 'donation_rejected' || 
        notification.content.includes('donation') || 
        notification.content.includes('regular donation') || 
        notification.content.includes('in-kind donation') ||
        notification.content.includes('scholar donation')) return 'donation';
        
    if (notification.type === 'distribution') return 'distribution';
    
    // Any notification that mentions student or scholar goes to students tab
    if (notification.type === 'student_application' || 
        notification.type.includes('student') || 
        notification.type.includes('scholar')) return 'student';
        
    return 'all';
  };

  // Filter notifications based on active tab
  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(notification => getNotificationType(notification) === activeTab);

  // Count unread notifications per tab
  const getUnreadCountByType = (type: NotificationType) => {
    if (type === 'all') return unreadCount;
    return notifications.filter(n => !n.read && getNotificationType(n) === type).length;
  };

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${import.meta.env.VITE_API_URL}${path}`;
  };

  // Add helper function to resolve avatar URL
  const resolveAvatarUrl = (avatarUrl: string | null | undefined): string => {
    if (!avatarUrl) return defaultAvatarImg;
    
    if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) {
      return avatarUrl;
    }
    
    if (avatarUrl.startsWith('/uploads/')) {
      return `${API_URL}${avatarUrl}`;
    }
    
    return avatarUrl;
  };

  // Add notification fetching logic
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`${API_URL}/api/notifications/admin/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
          setUnreadCount(data.filter((n: Notification) => !n.read).length);
        }
      } catch (error) {
        console.error('Error fetching admin notifications:', error);
      }
    };

    fetchNotifications();
    // Set up polling for new notifications
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [user?.id, API_URL]);

  // Add mark notifications as read function
  const markAllNotificationsAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      await Promise.all(
        unreadNotifications.map(notification =>
          fetch(`${API_URL}/api/notifications/${notification.id}/read`, {
            method: 'POST'
          })
        )
      );
      
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Add function to mark all notifications as read when closing panel
  const markUnreadNotificationsAsRead = async () => {
    if (!user?.id) return;
    
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      await fetch(`${API_URL}/api/notifications/admin/${user.id}/read-all`, {
        method: 'POST'
      });
      
      setNotifications(prevNotifications => 
        prevNotifications.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking admin notifications as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      await fetch(`${API_URL}/api/notifications/${notification.id}/read`, {
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
      if (notification.type === 'new_user') {
        if (notification.content.includes('scholar')) {
          navigate(`${PATHS.ADMIN.SCHOLARS.MANAGEMENT}`);
        } else {
          navigate(`${PATHS.ADMIN.USERS}`);
        }
      } else if (notification.type === 'contact_form') {
        // Navigate to contacts page for contact form notifications
        navigate(`${PATHS.ADMIN.CONTACTS}`);
      } else if (notification.type === 'event_participant' || notification.type === 'event_leave') {
        // Special handling for event participant and leave notifications
        const eventId = notification.related_id;
        
        // Store a flag in localStorage that the Events component will check
        localStorage.setItem('openEventParticipantsModal', eventId);
        
        // Navigate to the events page with the event ID as a query parameter
        navigate(`${PATHS.ADMIN.EVENTS}?highlight=${eventId}&participants=true`);
      } else if (notification.type === 'student_application') {
        navigate(`${PATHS.ADMIN.SCHOLARS.MANAGEMENT}`);
      } else if (notification.type === 'scholar_location' || 
                 notification.type.includes('location')) {
        // Navigate to scholar location page for location-related notifications
        navigate(`${PATHS.ADMIN.SCHOLARS.LOCATION}`);
      } else if (notification.type === 'report_card') {
        // Navigate to report cards page for report card notifications
        navigate(`${PATHS.ADMIN.SCHOLARS.REPORTS}`);
      } else if (notification.type === 'donation' || 
                notification.type === 'donation_verified' || 
                notification.type === 'donation_rejected') {
        // Check content to determine donation type
        if (notification.content.includes('regular donation') || 
            notification.content.includes('in-kind donation')) {
          navigate(`${PATHS.ADMIN.INVENTORY}`);  // Navigate to Inventory for regular/in-kind donations
        } else if (notification.content.includes('scholar donation')) {
          navigate(`${PATHS.ADMIN.SCHOLARS.DONATIONS}`);  // Navigate to Scholar Donations
        } else {
          navigate(`${PATHS.ADMIN.BANK}`);  // Navigate to Bank for monetary donations
        }
      } else if (notification.type === 'distribution') {
        // For distribution notifications, navigate to the distributions page
        navigate(`${PATHS.ADMIN.INVENTORY}`);
      }
      
      setShowNotifications(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  // Modified function to handle notification panel animation
  const toggleNotifications = async () => {
    // If notifications are showing, handle closing animation
    if (showNotifications) {
      await markUnreadNotificationsAsRead();
      
      // Start closing animation
      setNotificationClosing(true);
      
      // Wait for animation to complete before hiding
      setTimeout(() => {
        setShowNotifications(false);
        setNotificationClosing(false);
      }, 300); // Match animation duration
    } else {
      // For opening, show immediately with animation
      setShowNotifications(true);
    }
    
    // Animate bell icon
    if (bellIconRef.current) {
      bellIconRef.current.classList.add('animate');
      setTimeout(() => {
        if (bellIconRef.current) {
          bellIconRef.current.classList.remove('animate');
        }
      }, 500); // Match bell animation duration
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      // Add notification click outside handler with animation
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        if (showNotifications) {
          markUnreadNotificationsAsRead();
          
          // Start closing animation
          setNotificationClosing(true);
          
          // Wait for animation to complete before hiding
          setTimeout(() => {
            setShowNotifications(false);
            setNotificationClosing(false);
          }, 300); // Match animation duration
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

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
    
    return getImageUrl(user.profilePhoto);
  };

  // Get icon based on notification type
  const getNotificationIcon = (notification: Notification) => {
    const type = getNotificationType(notification);
    
    // Handle specific notification types
    if (notification.type === 'contact_form') {
      return '/images/contact-icon.png';  // Use contact icon for contact form notifications
    } else if (notification.type === 'event_participant') {
      return '/images/event-icon.png';  // Use event icon for event participant notifications
    } else if (notification.type === 'event_leave') {
      return '/images/event-leave-icon.png';  // Use a different icon for event leave notifications
    } else if (notification.type === 'scholar_location' || 
               notification.type.includes('location')) {
      return '/images/location-icon.png';  // Use location icon for location notifications
    } else if (notification.type === 'report_card') {
      return '/images/report-card-icon.png';  // Use report card icon for report card notifications
    } else if (notification.type === 'distribution') {
      return '/images/package-icon.png'; // Use package icon for distribution notifications
    } else if (type === 'distribution') {
      return '/images/package-icon.png';
    } else if (type === 'donation') {
      if (notification.content.includes('regular donation') || 
          notification.content.includes('in-kind donation')) {
        return '/images/inventory-icon.png';  // Inventory icon
      } else if (notification.content.includes('scholar donation')) {
        return '/images/scholar-icon.png';  // Scholar icon
      } else {
        return packageIcon; // Use package icon for monetary donations
      }
    }
    
    return resolveAvatarUrl(notification.actor_avatar);
  };

  // Handle tab change
  const handleTabChange = (newValue: NotificationType) => {
    setActiveTab(newValue);
  };

  // Add this function to toggle notification expansion with animation
  const toggleNotificationExpand = (id: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent notification click event from firing
    
    // Get the icon element for animation
    const iconElement = (event.currentTarget as HTMLElement).querySelector('.material-icons');
    
    if (iconElement) {
      // Add animation class
      iconElement.classList.add('animate-rotate');
      
      // Remove class after animation completes
      setTimeout(() => {
        iconElement.classList.remove('animate-rotate');
      }, 300); // Match the animation duration
    }
    
    setNotifications(prevNotifications =>
      prevNotifications.map(n =>
        n.id === id ? { ...n, expanded: !n.expanded } : n
      )
    );
  };

  return (
    <header className="admin-header">
      <div className="header-left">
        <img src={kkmkLogo} 
        alt="KKMK Logo" 
        onClick={() => navigate('/')}
        className="admin-logo" />
      </div>
      <div className="header-right">
        {/* Add notification bell */}
        <div className="notification-container" ref={notificationRef}>
          <div 
            className="notification-icon" 
            ref={bellIconRef}
            onClick={toggleNotifications}
          >
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
            {showNotifications ? <BsBellFill size={20} /> : <BsBell size={20} />}
          </div>
          <div className={`notifications-dropdown ${showNotifications ? 'active' : ''} ${notificationClosing ? 'closing' : ''}`}>
            <div className="notifications-header">
              <h3>Admin Notifications</h3>
              {notifications.length > 0 && (
                <button 
                  className="mark-read-button"
                  onClick={markAllNotificationsAsRead}
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            {/* Simple tabs for notification filtering */}
            <div className="notification-tabs">
              <div 
                className={`tab ${activeTab === 'all' ? 'active' : ''}`} 
                onClick={() => handleTabChange('all')}
                title="All Notifications"
              >
                <span>All</span>
                {unreadCount > 0 && <span className="tab-badge">{unreadCount}</span>}
              </div>
              <div 
                className={`tab ${activeTab === 'user' ? 'active' : ''}`} 
                onClick={() => handleTabChange('user')}
                title="User Notifications"
              >
                <span className="material-icons">person</span>
                {getUnreadCountByType('user') > 0 && 
                  <span className="tab-badge">{getUnreadCountByType('user')}</span>
                }
              </div>
              <div 
                className={`tab ${activeTab === 'donation' ? 'active' : ''}`} 
                onClick={() => handleTabChange('donation')}
                title="Donation Notifications"
              >
                <span className="material-icons">volunteer_activism</span>
                {getUnreadCountByType('donation') > 0 && 
                  <span className="tab-badge">{getUnreadCountByType('donation')}</span>
                }
              </div>
              <div 
                className={`tab ${activeTab === 'event' ? 'active' : ''}`} 
                onClick={() => handleTabChange('event')}
                title="Event Notifications"
              >
                <span className="material-icons">event</span>
                {getUnreadCountByType('event') > 0 && 
                  <span className="tab-badge">{getUnreadCountByType('event')}</span>
                }
              </div>
              <div 
                className={`tab ${activeTab === 'distribution' ? 'active' : ''}`} 
                onClick={() => handleTabChange('distribution')}
                title="Distribution Notifications"
              >
                <span className="material-icons">local_shipping</span>
                {getUnreadCountByType('distribution') > 0 && 
                  <span className="tab-badge">{getUnreadCountByType('distribution')}</span>
                }
              </div>
              <div 
                className={`tab ${activeTab === 'student' ? 'active' : ''}`} 
                onClick={() => handleTabChange('student')}
                title="Student Notifications"
              >
                <span className="material-icons">school</span>
                {getUnreadCountByType('student') > 0 && 
                  <span className="tab-badge">{getUnreadCountByType('student')}</span>
                }
              </div>
            </div>
            
            <div className="notifications-list">
              {filteredNotifications.length === 0 ? (
                <div className="no-notifications">
                  {activeTab === 'all' 
                    ? 'No notifications' 
                    : `No ${activeTab} notifications`}
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <img 
                      src={getNotificationIcon(notification)}
                      alt={getNotificationType(notification) === 'distribution' ? "Package" : "User avatar"}
                      className="notification-avatar"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = defaultAvatarImg;
                      }}
                    />
                    <div className="notification-content">
                      <div className="notification-text-container">
                        <p 
                          className={`notification-text ${notification.expanded ? 'expanded' : ''}`}
                        >
                          {notification.content}
                        </p>
                        <button 
                          className="expand-button"
                          onClick={(e) => toggleNotificationExpand(notification.id, e)}
                          title={notification.expanded ? "Show less" : "Show more"}
                        >
                          <span className="material-icons">
                            {notification.expanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                          </span>
                        </button>
                      </div>
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


