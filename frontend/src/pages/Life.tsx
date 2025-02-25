import React, { useState, useEffect } from 'react';
import api from '../config/axios'
import lifeImage from "../img/life.png";
import "../styles/Life.css";

interface GalleryImage {
  src: string;
  tags: string[];
  title: string;
  description: string;
}

interface PageContent {
  bannerImage: string;
  headerText: string;
  description: string;
  tabs: string[];
  galleryImages: GalleryImage[];
}

const TabPanel = ({ children, value, index }: { children?: React.ReactNode; value: number; index: number }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      style={{ display: value === index ? 'block' : 'none' }}
    >
      {children}
    </div>
  );
};

const Life: React.FC = () => {
  const [value, setValue] = useState(0);
  const [content, setContent] = useState<PageContent>({
    bannerImage: lifeImage,
    headerText: "Welcome to the heart of KM Foundation",
    description: "where every individual – staff, sponsored students, and sponsors – plays a vital role...",
    tabs: ["All", "Educating the Young", "Health and Nutrition", "Special Programs"],
    galleryImages: []
  });

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) {
      return `${import.meta.env.VITE_API_URL}${path}`;
    }
    return path;
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await api.get('/content/life');
        if (response.data?.content) {
          const savedContent = response.data.content;
          setContent(prev => ({
            bannerImage: savedContent.bannerImage ? getImageUrl(savedContent.bannerImage) : prev.bannerImage,
            headerText: savedContent.headerText || prev.headerText,
            description: savedContent.description || prev.description,
            tabs: savedContent.tabs || prev.tabs,
            galleryImages: savedContent.galleryImages?.map((img: GalleryImage) => ({
              ...img,
              src: img.src ? getImageUrl(img.src) : ''
            })) || []
          }));
        }
      } catch (error) {
        console.error('Failed to load content:', error);
      }
    };
    loadContent();
  }, []);

  const handleChange = (index: number) => {
    setValue(index);
  };

  return (
    <div className="home-container">
      <div className="life-banner-container">
        <img src={content.bannerImage} alt="Banner" className="life-image" />
        <div className="life-text-overlay">
          <h1>{content.headerText}</h1>
          <p className="lifetext">{content.description}</p>
        </div>
      </div>

      <div className="app-container">
        <div className="tabs">
          {content.tabs.map((tab, index) => (
            <button
              key={index}
              className={`tab-button ${value === index ? 'active' : ''}`}
              onClick={() => handleChange(index)}
            >
              {tab}
            </button>
          ))}
        </div>

        {content.tabs.map((tab, index) => (
          <TabPanel value={value} index={index} key={index}>
            <div className="image-grid">
              {content.galleryImages
                .filter(image => tab === "All" || image.tags.includes(tab))
                .map((image, i) => (
                  <div key={i} className="image-wrapper">
                    <img
                      src={getImageUrl(image.src)}
                      alt={image.title}
                      className="gallery-image"
                    />
                    <div className="image-info">
                      <h3>{image.title}</h3>
                      <p>{image.description}</p>
                      <div className="tags">
                        {image.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </TabPanel>
        ))}
      </div>
    </div>
  );
};

export default Life;
