import React, { useEffect, useState } from "react";
import axios from 'axios';
import "../../styles/OurStory.css";
import bannerImage from '../../img/story.png';
import storyImage from '../../img/father.png'; 
import missionImage from '../../img/missionvission.png'; 
import orgImage from '../../img/org.png'; 

interface PageContent {
  bannerImage: string;
  sections: {
    text: string;
    image?: string;
    caption?: string;
  }[];
}

const Story = () => {
  const [content, setContent] = useState<PageContent>({ 
    bannerImage: bannerImage,
    sections: [
      {
        text: "",
        image: storyImage,
        caption: "Fr. Walter L. Ysaac, S.J."
      },
      {
        text: "",
        image: missionImage
      },
      {
        text: "",
        image: orgImage
      }
    ]
  });

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) {
      // Use backend URL for uploaded images
      return `http://localhost:5175${path}`; // Update with your backend port
    }
    // For local images from imports
    return path;
  };

  // Add debug logging for image loading
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
        const response = await axios.get(`/api/content/story`);
        console.log('Loaded content:', response.data); // Debug log
        
        if (response.data && response.data.content) {
          const savedContent = response.data.content;
          console.log('Processing saved content:', savedContent); // Debug log
          
          setContent(prev => ({
            bannerImage: savedContent.bannerImage ? getImageUrl(savedContent.bannerImage) : bannerImage,
            sections: prev.sections.map((section, index) => ({
              ...section,
              text: savedContent.sections[index]?.text || section.text,
              image: savedContent.sections[index]?.image ? 
                getImageUrl(savedContent.sections[index].image) : 
                section.image,
              caption: savedContent.sections[index]?.caption || section.caption
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
              <p>{section.text}</p>
            </div>
            <div className="story-image-container">
              {section.image && (
                <>
                  <img 
                    src={getImageUrl(section.image)}
                    alt={section.caption || `Section ${index + 1}`}
                    className={index === 0 ? 'story-image' : index === 1 ? 'mission-image' : 'org-image'}
                    onError={(e) => handleImageError(e, [storyImage, missionImage, orgImage][index])}
                  />
                  {section.caption && <p className="story-caption">{section.caption}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Story;
