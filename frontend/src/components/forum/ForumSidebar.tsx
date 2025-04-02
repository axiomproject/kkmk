import React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'; // Add this import
import { Badge } from '@mui/material'; // Add this import

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';

interface ForumSidebarProps {

  activeCategory: string;

  onCategoryChange: (category: string) => void;

  isOpen: boolean;

  onClose: () => void;

  events: { id: string; title: string; }[];

  isAdmin?: boolean;

  pendingPostsCount?: number; // Add this prop

  userRole?: string; // Add this new prop to explicitly track the user's role

}

const ForumSidebar: React.FC<ForumSidebarProps> = ({ 
  activeCategory, 
  onCategoryChange,
  isOpen,
  onClose,
  events,
  isAdmin = false,
  pendingPostsCount = 0, // Default to 0
  userRole = '' // Set default to empty string
}) => {
  const mainCategories = ['All', 'General', 'Announcements', 'Events', 'Support', 'Questions', 'Suggestions'];
  
  // Add pending approval category if user is admin - use lowercase for comparison
  const categories = isAdmin ? [...mainCategories, 'Pending Approval'] : mainCategories;

  const handleCategoryClick = (category: string) => {
    // Ensure categories are compared as lowercase strings
    onCategoryChange(category.toLowerCase());
    onClose();
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <nav className={`forum-sidebar ${isOpen ? 'active' : ''}`}>
        {isAdmin && (
          <div className="admin-badge">
            {/* Fix this line to check userRole properly */}
            {userRole === 'admin' ? 'Administrator' : 'Staff'}
          </div>
        )}
        <div className="forum-sidebar-header">
          <h3>Categories</h3>
        </div>
        <List className="forum-sidebar-list">
          {categories.map((category) => (
            <ListItem
              key={category}
              style={{ cursor: 'pointer' }}
              // Ensure active category comparison is also done as lowercase
              className={`forum-sidebar-item ${category.toLowerCase() === activeCategory.toLowerCase() ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category)}
            >
              {category === 'Pending Approval' ? (
                <Badge 
                  badgeContent={pendingPostsCount} 
                  color="error"
                  sx={{ 
                    width: '100%',
                    '& .MuiBadge-badge': {
                      right: 0
                    }
                  }}
                >
                  <ListItemText 
                    primary={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HourglassEmptyIcon fontSize="small" />
                        {category}
                      </div>
                    } 
                    className="forum-sidebar-text"
                  />
                </Badge>
              ) : (
                <ListItemText 
                  primary={category} 
                  className="forum-sidebar-text"
                />
              )}
            </ListItem>
          ))}
        </List>
      </nav>
    </>
  );
};

export default ForumSidebar;
