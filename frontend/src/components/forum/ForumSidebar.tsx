import React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';

interface ForumSidebarProps {

  activeCategory: string;

  onCategoryChange: (category: string) => void;

  isOpen: boolean;

  onClose: () => void;

  events: { id: string; title: string; }[];

  isAdmin?: boolean;

}

const ForumSidebar: React.FC<ForumSidebarProps> = ({ 
  activeCategory, 
  onCategoryChange,
  isOpen,
  onClose,
  events,
  isAdmin = false
}) => {
  const mainCategories = ['All', 'General', 'Announcements', 'Events', 'Support', 'Questions', 'Suggestions'];

  const handleCategoryClick = (category: string) => {
    onCategoryChange(category.toLowerCase());
    onClose();
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <nav className={`forum-sidebar ${isOpen ? 'active' : ''}`}>
        {isAdmin && (
          <div className="admin-badge">
            Administrator
          </div>
        )}
        <div className="forum-sidebar-header">
          <h3>Categories</h3>
        </div>
        <List className="forum-sidebar-list">
          {mainCategories.map((category) => (
            <ListItem
              key={category}
              button
              className={`forum-sidebar-item ${category.toLowerCase() === activeCategory ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category)}
            >
              <ListItemText 
                primary={category} 
                className="forum-sidebar-text"
              />
            </ListItem>
          ))}
        </List>
      </nav>
    </>
  );
};

export default ForumSidebar;
