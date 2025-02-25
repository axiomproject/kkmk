import React, { useState, useEffect } from "react";
import api from '../../config/axios'; // Replace axios import
import "../../styles/Layout.css";
import bannerImage from '../../img/partner.png';
import storyImage from '../../img/org1.png'; 
import orgImage from '../../img/org2.png'; 

interface PageContent {
  bannerImage: string;
  sections: {
    text: string;
    image?: string;
    caption?: string;
    title?: string;  // Added for partner-specific headings
  }[];
}

const Partner = () => {
  const [content, setContent] = useState<PageContent>({ 
    bannerImage: bannerImage,
    sections: [
      {
        text: "In 2001, Amelia Hernandez founded the KapatidKita MahalKita Foundation...",
        image: storyImage,
        title: "Philippines Humanitarian"
      },
      {
        text: "Reed Elsevier Philippines actively supports KM Payatas...",
        image: orgImage
      }
    ]
  });

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) {
      return `${import.meta.env.VITE_API_URL}${path}`;
    }
    return path;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, fallback: string) => {
    console.error('Image failed to load:', {
      src: e.currentTarget.src,
      fallback,
      error: e
    });
    e.currentTarget.src = fallback;
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await api.get('/content/partner');
        if (response.data && response.data.content) {
          const savedContent = response.data.content;
          setContent(prev => ({
            bannerImage: savedContent.bannerImage ? getImageUrl(savedContent.bannerImage) : bannerImage,
            sections: prev.sections.map((section, index) => ({
              ...section,
              text: savedContent.sections[index]?.text || section.text,
              image: savedContent.sections[index]?.image ? 
                getImageUrl(savedContent.sections[index].image) : 
                section.image,
              title: savedContent.sections[index]?.title || section.title
            }))
          }));
        }
      } catch (error) {
        console.error('Failed to load content:', error);
      }
    };
    loadContent();
  }, []);

  return (
    <div className="home-container">
      <img 
        src={getImageUrl(content.bannerImage)} 
        alt="Banner" 
        className="banner-image"
        onError={(e) => handleImageError(e, bannerImage)}
      />
      {content.sections.map((section, index) => (
        <div key={index} className="story-section">
          <div className={`story-content ${index > 0 ? 'reverse-layout' : ''}`}>
            <div className="story-text">
              {section.title && <h2 className="ph">{section.title}</h2>}
              <p>{section.text}</p>
            </div>
            <div className="story-image-container">
              {section.image && (
                <img 
                  src={getImageUrl(section.image)}
                  alt={section.title || `Section ${index + 1}`}
                  className={index === 0 ? 'story-image' : 'organization-image'}
                  onError={(e) => handleImageError(e, [storyImage, orgImage][index])}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Partner;
