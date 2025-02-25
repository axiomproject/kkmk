import React, { useState, useEffect } from "react";
import axios from 'axios';
import "../../styles/Community.css";
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

const Community = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<TestimonialSection | null>(null);
  const [content, setContent] = useState<PageContent>({
    bannerImage: bannerImage,
    headerText: "Our Community",
    subText: "The KM Foundation's community initiatives aim to empower and support Payatas residents...",
    testimonials: []
  });

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) {
      return `http://localhost:5175${path}`;
    }
    return path;
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await axios.get(`/api/content/community`);
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
    <div className="home-container">
      <img 
        src={content.bannerImage} 
        alt="Banner" 
        className="banner-image"
      />
      <div className="introduction">
        <h1 className="Testimonial">{content.headerText}</h1>
        <h4 className="h4-testimonial">{content.subText}</h4>
      </div>

      <div className="image-grid2">
        {content.testimonials.map((testimonial, i) => (
          <div
            className="image-wrapper2"
            key={i}
            onClick={() => openModal(testimonial)}
          >
            <img
              src={testimonial.image}
              alt={testimonial.name}
              className="gallery-image2"
            />
          </div>
        ))}
      </div>

      {isModalOpen && modalContent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <span className="modal-close" onClick={closeModal}>&times;</span>
            <div className="modal-content-testimonials">
              <img
                src={modalContent.image}
                alt={modalContent.name}
                className="modal-image2"
              />
              <div className="modal-text">
                <h2 className="modal-title">{modalContent.name}</h2>
                <h5 className="modal-subtitle">{modalContent.subtitle}</h5>
              </div>
              <div 
                className="modal-description" 
                dangerouslySetInnerHTML={{ __html: modalContent.description }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;