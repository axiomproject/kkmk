import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../config/axios'
import lifeImage from "../img/life.png";
import defaultAvatar from "/images/default-avatar.jpg"; // Import default avatar
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
      className="tab-panel"
      style={{ display: value === index ? 'block' : 'none' }}
    >
      {children}
    </div>
  );
};

const Life: React.FC = () => {
  const [value, setValue] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [modalContent, setModalContent] = useState<GalleryImage | null>(null);
  const [content, setContent] = useState<PageContent>({
    bannerImage: lifeImage,
    headerText: "Welcome to the heart of KM Foundation",
    description: "where every individual – staff, sponsored students, and sponsors – plays a vital role...",
    tabs: ["All", "Educating the Young", "Health and Nutrition", "Special Programs"],
    galleryImages: []
  });
  const [tabKey, setTabKey] = useState(0);  // Add this to force re-render of tab content
  const [zoomLevel, setZoomLevel] = useState(1);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [lastTap, setLastTap] = useState(0); // For double-tap detection

  const getImageUrl = (path: string) => {
    if (!path) return defaultAvatar; // Use default avatar for empty paths
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
    if (index !== value) {
      setValue(index);
      // Force re-render of the tab content to trigger animations
      setTabKey(prevKey => prevKey + 1);
    }
  };

  const openModal = useCallback((image: GalleryImage) => {
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
    setModalContent(image);
    setIsModalOpen(true);
    // Reset zoom when opening a new modal
    setZoomLevel(1);
  }, []);

  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
      setModalContent(null);
      // Reset zoom when closing
      setZoomLevel(1);
    }, 300); // Match this duration with CSS animation
  }, []);

  // Simplified double-tap/double-click to zoom in/out
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = new Date().getTime();
    const timeSince = now - lastTap;
    
    if (timeSince < 300) { // 300ms is a common threshold for double-tap
      // This is a double-tap
      if (zoomLevel > 1) {
        // If already zoomed in, zoom out to original size
        setZoomLevel(1);
      } else {
        // If at original size, zoom in
        setZoomLevel(2.5);
      }
    }
    
    setLastTap(now);
  };

  // Keep wheel zoom functionality
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.deltaY < 0) {
      // Scroll up, zoom in
      setZoomLevel(prev => Math.min(prev + 0.2, 4));
    } else {
      // Scroll down, zoom out
      setZoomLevel(prev => Math.max(prev - 0.2, 1));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) {
        if (e.key === 'Escape') {
          closeModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

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

        {/* Add the tabKey to force re-render and trigger animations */}
        {content.tabs.map((tab, index) => (
          <TabPanel value={value} index={index} key={`tab-panel-${index}-${tabKey}`}>
            <div className="image-grid">
              {content.galleryImages
                .filter(image => tab === "All" || image.tags.includes(tab))
                .map((image, i) => (
                  <div key={i} className="image-wrapper" onClick={() => openModal(image)}>
                    <img
                      src={getImageUrl(image.src)}
                      alt={image.title || "Gallery image"}
                      className="gallery-image"
                      onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as HTMLImageElement).src = defaultAvatar;
                      }}
                    />
                    <div className="image-info">
                      <h3>{image.title || "Untitled"}</h3>
                      <p>{image.description || "No description available."}</p>
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

      {isModalOpen && modalContent && (
        <div 
          className={`life-modal-overlay ${isClosing ? 'life-modal-closing' : 'life-modal-opening'}`} 
          onClick={closeModal}
        >
          <div 
            className={`life-modal-box ${isClosing ? 'life-modal-box-closing' : 'life-modal-box-opening'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="life-modal-close" onClick={closeModal}>&times;</span>
            <div className="life-modal-content">
              <div className="life-modal-image-hint">
                Double-click to zoom
              </div>
              <div 
                className="life-modal-image-container"
                ref={imageContainerRef}
                onClick={handleImageClick}
                onWheel={handleWheel}
                style={{ cursor: 'pointer' }}
              >
                <div 
                  className="life-modal-image-wrapper"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <img
                    src={getImageUrl(modalContent.src)}
                    alt={modalContent.title || "Gallery image"}
                    className="life-modal-image"
                    draggable="false"
                    onError={(e) => {
                      // Fallback if image fails to load in modal
                      (e.target as HTMLImageElement).src = defaultAvatar;
                    }}
                  />
                </div>
              </div>
              <div className="life-modal-text">
                <h2 className="life-modal-title">{modalContent.title || "Untitled"}</h2>
                <p className="life-modal-description">{modalContent.description || "No description available."}</p>
                <div className="life-modal-tags">
                  {modalContent.tags.map((tag, tagIndex) => (
                    <span key={tagIndex} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Life;
