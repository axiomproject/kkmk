import React, { useState, useEffect } from "react";
import { motion } from "framer-motion"; // Import framer-motion
import api from '../../config/axios';
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
    title?: string;
  }[];
}

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

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
  const [isLoading, setIsLoading] = useState(true);

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) {
      return `${import.meta.env.VITE_API_URL}${path}`;
    }
    return path;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, fallback: string) => {
    // console.error('Image failed to load:', {
    //   src: e.currentTarget.src,
    //   fallback,
    //   error: e
    // });
    e.currentTarget.src = fallback;
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);
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
        // console.error('Failed to load content:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadContent();
  }, []);

  return (
    <motion.div 
      className="home-container"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* Banner with loading optimization */}
      <img 
        src={getImageUrl(content.bannerImage)} 
        alt="Banner" 
        className={`banner-image ${isLoading ? 'loading' : 'loaded'}`}
        onError={(e) => handleImageError(e, bannerImage)}
        loading="eager"
        decoding="async"
        onLoad={() => setIsLoading(false)}
      />

      {/* Content sections with animations */}
      {content.sections.map((section, index) => (
        <motion.div 
          key={index} 
          className="story-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <div className={`story-content ${index > 0 ? 'reverse-layout' : ''}`}>
            <motion.div 
              className="story-text"
              variants={index % 2 === 0 ? fadeInLeft : fadeInRight}
            >
              {section.title && (
                <motion.h2 
                  className="ph"
                  variants={fadeInUp}
                >
                  {section.title}
                </motion.h2>
              )}
              <motion.p variants={fadeInUp}>{section.text}</motion.p>
            </motion.div>
            <motion.div 
              className="story-image-container"
              variants={index % 2 === 0 ? fadeInRight : fadeInLeft}
            >
              {section.image && (
                <img 
                  src={getImageUrl(section.image)}
                  alt={section.title || `Section ${index + 1}`}
                  className={index === 0 ? 'story-image' : 'organization-image'}
                  onError={(e) => handleImageError(e, [storyImage, orgImage][index])}
                  loading="lazy"
                  decoding="async"
                />
              )}
            </motion.div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default Partner;
