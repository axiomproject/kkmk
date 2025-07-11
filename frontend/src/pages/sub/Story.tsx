import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from '../../config/axios';
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
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.2
    }
  }
};

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
    e.currentTarget.src = fallback;
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/content/story');
        
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
              caption: savedContent.sections[index]?.caption || section.caption
            }))
          }));
        }
      } catch (error) {
        // Handle error silently
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
      <motion.img 
        src={getImageUrl(content.bannerImage)} 
        alt="Banner" 
        className={`banner-image ${isLoading ? 'loading' : 'loaded'}`}
        onError={(e) => handleImageError(e, bannerImage)}
        loading="eager"
        decoding="async"
        variants={fadeInUp}
      />

      <motion.div variants={staggerContainer}>
        {content.sections.map((section, index) => (
          <motion.div 
            key={index} 
            className="story-section"
            variants={fadeInUp}
          >
            <div className={`story-content ${index > 0 ? 'reverse-layout' : ''}`}>
              <motion.div 
                className="story-text"
                variants={index % 2 === 0 ? fadeInLeft : fadeInRight}
              >
                <p>{section.text}</p>
              </motion.div>
              <motion.div 
                className="story-image-container"
                variants={index % 2 === 0 ? fadeInRight : fadeInLeft}
              >
                {section.image && (
                  <>
                    <img 
                      src={getImageUrl(section.image)}
                      alt={section.caption || `Section ${index + 1}`}
                      className={index === 0 ? 'story-image' : index === 1 ? 'mission-image' : 'org-image'}
                      onError={(e) => handleImageError(e, [storyImage, missionImage, orgImage][index])}
                      loading="lazy"
                      decoding="async"
                    />
                    {section.caption && (
                      <motion.p 
                        className="story-caption"
                        variants={fadeInUp}
                      >
                        {section.caption}
                      </motion.p>
                    )}
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default Story;
