import React from 'react';

interface ForumSidebarProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const ForumSidebar: React.FC<ForumSidebarProps> = ({ 
  activeCategory, 
  onCategoryChange,
  isOpen,
  onClose
}) => {
  const categories = ['All', 'General', 'Announcements', 'Events', 'Support', 'Questions', 'Suggestions'];

  const handleCategoryClick = (category: string) => {
    onCategoryChange(category);
    onClose(); // Close sidebar on mobile after selection
  };

  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
      />
      <nav className={`forum-sidebar ${isOpen ? 'active' : ''}`}>
        <h3>Categories</h3>
        <ul>
          {categories.map((category) => (
            <li
              key={category}
              className={category === activeCategory ? 'active' : ''}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};

export default ForumSidebar;
