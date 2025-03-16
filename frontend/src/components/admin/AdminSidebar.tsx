import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PATHS } from '../../routes/paths';
import '../../styles/AdminSidebar.css';

const AdminSidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const [showHamburger, setShowHamburger] = useState(false);
  const navigate = useNavigate();

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleNavLinkClick = () => {
    closeMobileMenu();
  };

  useEffect(() => {
    const checkSidebarVisibility = () => {
      const isMobile = window.innerWidth <= 768;
      const isOverlapped = document.documentElement.scrollLeft > 0;
      setShowHamburger(isMobile || isOverlapped);
    };

    window.addEventListener('resize', checkSidebarVisibility);
    window.addEventListener('scroll', checkSidebarVisibility);
    checkSidebarVisibility();

    return () => {
      window.removeEventListener('resize', checkSidebarVisibility);
      window.removeEventListener('scroll', checkSidebarVisibility);
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }

    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [isMobileMenuOpen]);

  const handleQuickAccess = (path: string) => {
    navigate(path); // Only navigate, don't open sidebar
  };

  const isActive = (path: string) => {
    return window.location.pathname === path;
  };

  // Define which menu items are available for each role
  const menuItems = [
    {
      path: PATHS.ADMIN.DASHBOARD,
      icon: 'dashboard',
      label: 'Dashboard',
      roles: ['admin', 'staff']
    },
    {
      path: PATHS.ADMIN.ANALYTICS, // Use the analytics path as default
      icon: 'show_chart',
      label: 'Analytics',
      roles: ['admin'], // Only admin can see analytics
      subItems: [
        {
          path: PATHS.ADMIN.ANALYTICS,
          label: 'Overview',
          icon: 'assessment',
          roles: ['admin']
        },
        {
          path: PATHS.ADMIN.EVENTFEEDBACK,
          label: 'Event Feedback',
          icon: 'feedback',
          roles: ['admin']
        },
        {
          path: PATHS.ADMIN.FORUMPOLL,
          label: 'Forum Poll',
          icon: 'poll',
          roles: ['admin']
        },
      ]
    },
    {
      path: PATHS.ADMIN.MAP,
      icon: 'map',
      label: 'Map',
      roles: ['admin', 'staff']
    },
    {
      path: PATHS.ADMIN.INVENTORY,
      icon: 'inventory',
      label: 'Inventory',
      roles: ['admin', 'staff']
    },
    {
      path: PATHS.ADMIN.BANK,
      icon: 'account_balance',
      label: 'Bank',
      roles: ['admin'] // Only admin can access bank
    }
  ];

  const otherItems = [
    {
      path: PATHS.ADMIN.CMS,
      icon: 'file_copy',
      label: 'Content',
      roles: ['admin', 'staff']
    },
    {
      path: PATHS.ADMIN.USERS,
      icon: 'group',
      label: 'Volunteer',
      roles: ['admin', 'staff']
    },
    {
      path: PATHS.ADMIN.SPONSOR,
      icon: 'accessibility_new',
      label: 'Sponsor',
      roles: ['admin', 'staff']
    },
    {
      path: PATHS.ADMIN.SCHOLARS.MANAGEMENT, // Use the management path as default
      icon: 'child_care',
      label: 'Scholar',
      roles: ['admin', 'staff'],
      subItems: [
        {
          path: PATHS.ADMIN.SCHOLARS.MANAGEMENT,
          label: 'Management',
          icon: 'manage_accounts',
          roles: ['admin', 'staff']
          
        },
        {
          path: PATHS.ADMIN.SCHOLARS.PROFILE,
          label: 'Profiles',
          icon: 'badge',
          roles: ['admin', 'staff']
        },
        {
          path: PATHS.ADMIN.SCHOLARS.DONATIONS,
          label: 'Donation',
          icon: 'volunteer_activism',
          roles: ['admin']
        },
        {
          path: PATHS.ADMIN.SCHOLARS.LOCATION,
          icon: 'admin_panel_settings',
          label: 'Location',
          roles: ['admin', 'staff']
          
        },
        {
          path: PATHS.ADMIN.SCHOLARS.REPORTS,
          label: 'Report Cards',
          icon: 'pending',
          roles: ['admin', 'staff']
        },
      ]
    },
  
    {
      path: PATHS.ADMIN.STAFF,
      icon: 'admin_panel_settings',
      label: 'Staff',
      roles: ['admin'] // Only admin can manage staff
    },
    {
      path: PATHS.ADMIN.EVENTS,
      icon: 'celebration',
      label: 'Events',
      roles: ['admin', 'staff']
    },
    {
      path: PATHS.ADMIN.CONTACTS,
      icon: 'contact_page',
      label: 'Contacts',
      roles: ['admin', 'staff']
    },
    {
      path: PATHS.ADMIN.SETTINGS,
      icon: 'settings',
      label: 'Settings',
      roles: ['admin', 'staff'] // Only admin can access settings
    }
  ];

  const canAccess = (roles: string[]) => {
    return roles.includes(user?.role || '');
  };

  return (
    <>
      <button
        className={`hamburger-menu ${showHamburger ? 'visible' : ''} ${isMobileMenuOpen ? 'hidden' : ''}`}
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        <span className="material-icons">menu</span>
      </button>

      <div className={`quick-access-menu ${showHamburger && !isMobileMenuOpen ? 'visible' : ''}`}>
        {menuItems.map((item, index) => (
          canAccess(item.roles) && (
            <div
              key={`menu-${index}`}
              className={`quick-access-item ${isActive(item.path) || (item.subItems && item.subItems.some(sub => isActive(sub.path))) ? 'active' : ''}`}
              onClick={() => handleQuickAccess(item.path)}
              title={item.label}
            >
              <span className="material-icons">{item.icon}</span>
            </div>
          )
        ))}
        {otherItems.map((item, index) => (
          canAccess(item.roles) && (
            <div
              key={`other-${index}`}
              className={`quick-access-item ${isActive(item.path) || (item.subItems && item.subItems.some(sub => isActive(sub.path))) ? 'active' : ''}`}
              onClick={() => handleQuickAccess(item.path)}
              title={item.label}
            >
              <span className="material-icons">{item.icon}</span>
            </div>
          )
        ))}
      </div>

      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      />

      <nav 
        ref={sidebarRef}
        className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-content">
          <div className="sidebar-category">
            <h3 className="category-title">Menu</h3>
            <ul>
              {menuItems.map((item, index) => (
                canAccess(item.roles) && (
                  <li key={index}>
                    {item.subItems ? (
                      <div className={`sidebar-item-with-subitems ${expandedItems.includes(item.label) ? 'expanded' : ''}`}>
                        <div 
                          className="sidebar-item-header"
                          onClick={() => toggleExpand(item.label)}
                        >
                          <span className="material-icons">{item.icon}</span>
                          <span>{item.label}</span>
                          <span className="material-icons expand-icon">
                            {expandedItems.includes(item.label) ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                        <ul className="sidebar-subitems">
                          {item.subItems.map((subItem, subIndex) => (
                            canAccess(subItem.roles) && (
                              <li key={`menu-${index}-${subIndex}`}>
                                <NavLink to={subItem.path} className="subitem-link" onClick={handleNavLinkClick}>
                                  <span className="material-icons subitem-icon">
                                    {subItem.icon}
                                  </span>
                                  <span>{subItem.label}</span>
                                </NavLink>
                              </li>
                            )
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <NavLink to={item.path} onClick={handleNavLinkClick}>
                        <span className="material-icons">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    )}
                  </li>
                )
              ))}
            </ul>
          </div>

          <div className="sidebar-category">
            <h3 className="category-title">Others</h3>
            <ul>
              {otherItems.map((item, index) => (
                canAccess(item.roles) && (
                  <li key={index}>
                    {item.subItems ? (
                      <div className={`sidebar-item-with-subitems ${expandedItems.includes(item.label) ? 'expanded' : ''}`}>
                        <div 
                          className="sidebar-item-header"
                          onClick={() => toggleExpand(item.label)}
                        >
                          <span className="material-icons">{item.icon}</span>
                          <span>{item.label}</span>
                          <span className="material-icons expand-icon">
                            {expandedItems.includes(item.label) ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                        <ul className="sidebar-subitems">
                          {item.subItems.map((subItem, subIndex) => (
                            canAccess(subItem.roles) && (
                              <li key={`${index}-${subIndex}`}>
                                <NavLink to={subItem.path} className="subitem-link" onClick={handleNavLinkClick}>
                                  <span className="material-icons subitem-icon">
                                    {subItem.icon}
                                  </span>
                                  <span>{subItem.label}</span>
                                </NavLink>
                              </li>
                            )
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <NavLink to={item.path} onClick={handleNavLinkClick}>
                        <span className="material-icons">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    )}
                  </li>
                )
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
};

export default AdminSidebar;
