import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Import framer-motion
import api from '../../config/axios';
import "../../styles/Graduates.css";
import bannerImage from "../../img/coverphoto1.png";

interface TestimonialSection {
  image: string;
  name: string;
  subtitle: string;
  description: string;
}

interface PageContent {
  bannerImage: string;
  headerText: string;
  subText: string;
  testimonials: TestimonialSection[];
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

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const imageVariant = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const modalVariant = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

const Graduates = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<TestimonialSection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<PageContent>({
    bannerImage: bannerImage,
    headerText: "Graduate Testimonials",
    subText: "Hear from our graduates whose lives were forever changed by the gift of education...",
    testimonials: []
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
        const response = await api.get('/content/graduates');
        if (response.data?.content) {
          const savedContent = response.data.content;
          setContent(prev => ({
            bannerImage: savedContent.bannerImage ? getImageUrl(savedContent.bannerImage) : prev.bannerImage,
            headerText: savedContent.headerText || prev.headerText,
            subText: savedContent.subText || prev.subText,
            testimonials: savedContent.testimonials?.map((t: TestimonialSection) => ({
              ...t,
              image: t.image ? getImageUrl(t.image) : ''
            })) || prev.testimonials
          }));
        }
      } catch (error) {
        console.error('Failed to load content:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadContent();
  }, []);

  const openModal = (testimonial: TestimonialSection) => {
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
    setModalContent(testimonial);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
  };

  return (
    <motion.div 
      className="home-container"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <img 
        src={content.bannerImage} 
        alt="Banner" 
        className={`banner-image ${isLoading ? 'loading' : 'loaded'}`}
        onLoad={() => setIsLoading(false)}
        loading="eager"
        decoding="async"
      />
      <motion.div 
        className="introduction"
        variants={fadeInUp}
      >
        <motion.h1 
          className="Testimonial"
          variants={fadeInUp}
        >
          {content.headerText}
        </motion.h1>
        <motion.h4 
          className="h4-testimonial"
          variants={fadeInUp}
        >
          {content.subText}
        </motion.h4>
      </motion.div>

      <motion.div 
        className="image-grid1"
        variants={staggerContainer}
      >
        {content.testimonials.map((testimonial, i) => (
          <motion.div
            className="image-wrapper1"
            key={i}
            onClick={() => openModal(testimonial)}
            variants={imageVariant}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img
              src={testimonial.image || `/images/${8 + i}.jpg`}
              alt={testimonial.name}
              className="gallery-image1"
              loading={i < 4 ? "eager" : "lazy"}
              decoding="async"
            />
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {isModalOpen && modalContent && (
          <motion.div 
            className="modal-overlay" 
            onClick={closeModal}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariant}
          >
            <motion.div 
              className="modal-box" 
              onClick={(e) => e.stopPropagation()}
              variants={fadeInUp}
            >
              <span className="modal-close" onClick={closeModal}>
                &times;
              </span>
              <motion.div 
                className="modal-content-testimonials"
                variants={fadeInUp}
              >
                <img
                  src={modalContent.image || `/images/${8 + content.testimonials.findIndex(t => t.name === modalContent.name)}.jpg`}
                  alt={modalContent.name}
                  className="modal-image"
                  loading="eager"
                  decoding="async"
                />
                <motion.div 
                  className="modal-text"
                  variants={fadeInUp}
                >
                  <h2 className="modal-title">{modalContent.name}</h2>
                  <h5 className="modal-subtitle">{modalContent.subtitle}</h5>
                </motion.div>
                <motion.div 
                  className="modal-description" 
                  dangerouslySetInnerHTML={{ __html: modalContent.description }}
                  variants={fadeInUp}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Graduates;
