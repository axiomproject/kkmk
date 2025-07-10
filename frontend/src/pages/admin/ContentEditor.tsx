import React, { useState, useEffect } from 'react';
import api from '../../config/axios'; // Replace axios import
import '../../styles/ContentEditor.css';
import { getImageUrl, getImageUrlFromResponse } from '../../utils/imageUtils';

interface ContentSection {
  text: string;
  image?: string;
  caption?: string;
  title?: string;
  description?: string; // Make description optional
}

interface ContactSection {
  title: string;
  description: string;
}

interface PageContent {
  bannerImage?: string;
  sections: ContentSection[];
  headerText?: string;
  subText?: string;
  description?: string;
  testimonials?: {
    name: string;
    subtitle: string;
    description: string;
    image?: string;
  }[];
  mainHeading?: string;
  mainDescription?: string;
  email?: string;
  phone?: string;
  locationHeading?: string;
  locationTitle?: string;
  locationSubHeading?: string;
  address?: string[];
  contactSections?: ContactSection[];
  members?: {
    name: string;
    subText: string;
    image?: string;
    profileClass: string;
  }[];
  tabs?: string[];
  galleryImages?: {
    src: string;
    tags: string[];
    title: string;
    description: string;
  }[];
  headerTitle?: string;
  headerDescription?: string;
  statCards?: {
    title: string;
    value: string;
    image?: string;
  }[];
  features?: {
    title: string;
    description: string;
    image?: string;
  }[];
  highlights?: {
    title: string;
    description: string;
    image?: string;
    link?: string;
  }[];
  community?: {
    title: string;
    description?: string;
    image?: string;
  };
  additionalCards?: {
    title: string;
    description: string;
    image?: string;
    buttonText?: string;
  }[];
  testimonialCards?: {
    name: string;
    title: string;
    description: string;
    backDescription: string;
    image?: string;
  }[];
}

export default function ContentEditor() {
  const [selectedPage, setSelectedPage] = useState('');
  const [pages, setPages] = useState<string[]>([]);
  const [content, setContent] = useState<PageContent>({
    sections: selectedPage === 'partner' ? [
      {
        title: "Philippines Humanitarian",
        text: "",
        image: "",
      },
      {
        text: "",
        image: "",
      }
    ] : [],
    features: [], // Initialize features array
    contactSections: selectedPage === 'contact' ? [
      {
        title: "Contact Support",
        description: ""
      },
      {
        title: "Feedback and Suggestions",
        description: ""
      },
      {
        title: "Made Inquiries",
        description: ""
      }
    ] : []
  });
  const [activeSection, setActiveSection] = useState('banner');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      loadContent();
      const sections = getSections();
      if (sections.length > 0) {
        setActiveSection(sections[0].id);
      }
    }
  }, [selectedPage]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadPages = async () => {
    try {
      const response = await api.get('/content/pages');
      console.log('API Response:', response.data);
      
      if (Array.isArray(response.data)) {
        setPages(response.data);
        if (response.data.length > 0) {
          setSelectedPage(response.data[0]);
        }
      } else {
        console.error('Unexpected response format:', response.data);
      }
    } catch (error) {
      console.error('Failed to load pages:', error);
    }
  };

  const loadContent = async () => {
    try {
      const response = await api.get(`/content/${selectedPage}`);
      // Ensure features array exists and is properly initialized
      const loadedContent = response.data.content;
      if (selectedPage === 'home' && !loadedContent.features) {
        loadedContent.features = [];
      }
      setContent(loadedContent);
    } catch (error) {
      console.error('Failed to load content:', error);
    }
  };

  const renderImagePreview = (imageUrl: string | undefined) => {
    if (!imageUrl) return null;
    const displayUrl = getImageUrl(imageUrl);
    return (
      <div className="image-preview">
        <img 
          src={displayUrl} 
          alt="Preview" 
          className="preview-image"
          data-original-src={imageUrl}
          onError={handleImageError}
        />
        <div className="url-display">
          <p>Image URL:</p>
          <input
            type="text"
            value={imageUrl}
            readOnly
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
      </div>
    );
  };

  const renderSectionImage = (section: ContentSection, index: number) => {
    return (
      <div className="image-preview">
        {section.image && (
          <img 
            src={getImageUrl(section.image)} 
            alt={section.title || `Section ${index + 1}`}
            data-original-src={section.image}
            onError={handleImageError}
          />
        )}
      </div>
    );
  };

  const renderBannerImage = () => {
    return content.bannerImage && (
      <div className="image-preview">
        <img 
          src={getImageUrl(content.bannerImage)} 
          alt="Banner"
          data-original-src={content.bannerImage}
          onError={handleImageError}
        />
      </div>
    );
  };

  const handleImageUpload = async (file: File, sectionIndex: number) => {
    try {
      if (!file) {
        console.error('No file selected');
        return;
      }
        
      const formData = new FormData();
      formData.append('image', file);
  
      console.log('Uploading file:', file.name);
  
      const response = await api.post('/content/upload-image', formData);
  
      console.log('Upload response:', response.data);
  
      const imageUrl = getImageUrlFromResponse(response.data);
      if (!imageUrl) {
        throw new Error('No image URL received from server');
      }
  
      if (sectionIndex === -1) {
        setContent(prev => ({ ...prev, bannerImage: imageUrl }));
        console.log('Banner image updated:', imageUrl);
      } else {
        setContent(prev => {
          const newSections = [...prev.sections];
          newSections[sectionIndex] = {
            ...newSections[sectionIndex],
            image: imageUrl
          };
          return { ...prev, sections: newSections };
        });
      }

      // Show preview
      return renderImagePreview(imageUrl);
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image: ' + (error.response?.data?.error || error.message));
      return null;
    }
  };
  

  const handleTestimonialImageUpload = async (file: File, index: number) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/content/upload-image', formData);

      const imageUrl = getImageUrlFromResponse(response.data);
      if (!imageUrl) {
        throw new Error('No image URL received from server');
      }

      setContent(prev => {
        const newTestimonials = [...(prev.testimonials || [])];
        newTestimonials[index] = {
          ...newTestimonials[index],
          image: imageUrl
        };
        return { ...prev, testimonials: newTestimonials };
      });

      // Show preview
      return renderImagePreview(imageUrl);
    } catch (error: any) {
      console.error('Failed to upload testimonial image:', error);
      alert('Failed to upload image: ' + (error.response?.data?.error || error.message));
      return null;
    }
  };

  const handleTeamMemberImageUpload = async (file: File, index: number) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/content/upload-image', formData);

      const imageUrl = getImageUrlFromResponse(response.data);
      if (!imageUrl) {
        throw new Error('No image URL received from server');
      }

      setContent(prev => {
        const newMembers = [...(prev.members || [])];
        newMembers[index] = { ...newMembers[index], image: imageUrl };
        return { ...prev, members: newMembers };
      });

      // Show preview
      return renderImagePreview(imageUrl);
    } catch (error: any) {
      console.error('Failed to upload team member image:', error);
      alert('Failed to upload image: ' + (error.response?.data?.error || error.message));
      return null;
    }
  };

  const handleGalleryImageUpload = async (file: File, index: number) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/content/upload-image', formData);

      const imageUrl = getImageUrlFromResponse(response.data);
      if (!imageUrl) {
        throw new Error('No image URL received from server');
      }

      setContent(prev => {
        const newGalleryImages = [...(prev.galleryImages || [])];
        newGalleryImages[index] = { ...newGalleryImages[index], src: imageUrl };
        return { ...prev, galleryImages: newGalleryImages };
      });

      // Show preview
      return renderImagePreview(imageUrl);
    } catch (error: any) {
      console.error('Failed to upload gallery image:', error);
      alert('Failed to upload image: ' + (error.response?.data?.error || error.message));
      return null;
    }
  };

  const handleTestimonialCardImageUpload = async (file: File, index: number) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/content/upload-image', formData);

      const imageUrl = getImageUrlFromResponse(response.data);
      if (!imageUrl) {
        throw new Error('No image URL received from server');
      }

      setContent(prev => {
        const newCards = [...(prev.testimonialCards || [])];
        newCards[index] = { ...newCards[index], image: imageUrl };
        return { ...prev, testimonialCards: newCards };
      });

      // Show preview
      return renderImagePreview(imageUrl);
    } catch (error: any) {
      console.error('Failed to upload testimonial card image:', error);
      alert('Failed to upload image: ' + (error.response?.data?.error || error.message));
      return null;
    }
  };

  const handleCommunityImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/content/upload-image', formData);

      const imageUrl = getImageUrlFromResponse(response.data);
      if (!imageUrl) {
        throw new Error('No image URL received from server');
      }

      setContent(prev => ({
        ...prev,
        community: {
          title: prev.community?.title || '',
          description: prev.community?.description,
          image: imageUrl
        }
      }));

      // Show preview
      return renderImagePreview(imageUrl);
    } catch (error: any) {
      console.error('Failed to upload community image:', error);
      alert('Failed to upload image: ' + (error.response?.data?.error || error.message));
      return null;
    }
  };

  const handleHighlightImageUpload = async (file: File, index: number) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/content/upload-image', formData);

      const imageUrl = getImageUrlFromResponse(response.data);
      if (!imageUrl) {
        throw new Error('No image URL received from server');
      }

      setContent(prev => {
        const newHighlights = [...(prev.highlights || [])];
        newHighlights[index] = { ...newHighlights[index], image: imageUrl };
        return { ...prev, highlights: newHighlights };
      });

      // Show preview
      return renderImagePreview(imageUrl);
    } catch (error: any) {
      console.error('Failed to upload highlight image:', error);
      alert('Failed to upload image: ' + (error.response?.data?.error || error.message));
      return null;
    }
  };

  const handleFeatureImageUpload = async (file: File, index: number) => {
    try {
      console.log('Starting feature image upload for index:', index);
      console.log('Current features state:', content.features);

      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/content/upload-image', formData);
      console.log('Upload response:', response);

      const imageUrl = getImageUrlFromResponse(response.data);
      if (imageUrl === '/images/default-event.png') {
        throw new Error('Failed to get valid image URL from server');
      }

      console.log('Got image URL:', imageUrl);

      setContent(prev => {
        console.log('Previous state:', prev);
        
        // Create a new features array, ensuring it exists
        const currentFeatures = Array.isArray(prev.features) ? [...prev.features] : [];
        
        // Make sure we have enough elements up to our target index
        while (currentFeatures.length <= index) {
          currentFeatures.push({
            title: '',
            description: '',
            image: ''
          });
        }

        // Update the specific feature
        currentFeatures[index] = {
          ...currentFeatures[index],
          image: imageUrl
        };

        console.log('New features state:', currentFeatures);
        
        // Return the new state
        return {
          ...prev,
          features: currentFeatures
        };
      });

      // Show preview
      return renderImagePreview(imageUrl);
    } catch (error: any) {
      console.error('Failed to upload feature image:', error);
      alert('Failed to upload image: ' + (error.response?.data?.error || error.message));
      return null;
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    console.log('Image failed to load:', {
      src: img.src,
      originalSrc: img.getAttribute('data-original-src'),
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    });

    // Set default image based on context
    const defaultImage = '/images/default-event.png';
    if (img.src !== defaultImage) {
      img.src = defaultImage;
      img.onerror = null; // Prevent infinite loop if default image fails
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to save content');
        return;
      }

      // Ensure all features have valid image URLs or null
      const contentToSave = {
        ...content,
        features: content.features?.map(feature => ({
          ...feature,
          image: feature.image || null // Ensure null instead of undefined
        })),
        sections: content.sections?.map(section => {
          if (selectedPage === 'contact') {
            return {
              title: section.title || '',
              description: section.description || ''
            };
          }
          return {
            text: section.text || '',
            image: section.image || null, // Ensure null instead of undefined
            title: section.title || '',
            caption: section.caption || null
          };
        }) || []
      };

      console.log('Sending content to save:', contentToSave);

      const response = await api.put(
        `/content/${selectedPage}`,
        contentToSave
      );

      console.log('Save response:', response.data);

      // Update local state with the saved data
      setContent(response.data.content);
      
      alert('Content saved successfully');
    } catch (error: any) {
      console.error('Failed to save content:', error);
      alert('Failed to save content: ' + (error.response?.data?.error || error.message));
    }
  };

  const addTestimonial = () => {
    setContent(prev => ({
      ...prev,
      testimonials: [
        ...(prev.testimonials || []),
        {
          name: '',
          subtitle: '',
          description: '',
          image: ''
        }
      ]
    }));
  };

  const removeTestimonial = (index: number) => {
    setContent(prev => ({
      ...prev,
      testimonials: prev.testimonials?.filter((_, i) => i !== index)
    }));
  };

  const addTeamMember = () => {
    setContent(prev => ({
      ...prev,
      members: [
        ...(prev.members || []),
        {
          name: '',
          subText: '',
          image: '',
          profileClass: `profile-${(prev.members?.length || 0) + 1}`
        }
      ]
    }));
  };

  const removeTeamMember = (index: number) => {
    setContent(prev => ({
      ...prev,
      members: prev.members?.filter((_, i) => i !== index)
    }));
  };

  const addGalleryImage = () => {
    setContent(prev => ({
      ...prev,
      galleryImages: [
        ...(prev.galleryImages || []),
        {
          src: '',
          tags: [],
          title: '',
          description: ''
        }
      ]
    }));
  };

  const removeGalleryImage = (index: number) => {
    setContent(prev => ({
      ...prev,
      galleryImages: prev.galleryImages?.filter((_, i) => i !== index)
    }));
  };

  const getSections = () => {
    switch (selectedPage) {
      case 'life':
        return [
          { id: 'banner', label: 'Banner Image' },
          { id: 'header', label: 'Header Content' },
          { id: 'tabs', label: 'Navigation Tabs' },
          { id: 'gallery', label: 'Gallery Images' }
        ];
      case 'team':
        return [
          { id: 'banner', label: 'Banner Image' },
          { id: 'members', label: 'Team Members' }
        ];
      case 'community':
      case 'graduates':
        return [
          { id: 'banner', label: 'Banner Image' },
          { id: 'header', label: 'Header Text' },
          { id: 'subtext', label: 'Sub Text' },
          { id: 'testimonials', label: selectedPage === 'graduates' ? 'Graduate Stories' : 'Testimonials' }
        ];
      case 'contact':
        return [
          { id: 'main', label: 'Main Content' },
          { id: 'sections', label: 'Contact Sections' },
          { id: 'location', label: 'Location Info' }
        ];
      case 'partner':
        return [
          { id: 'banner', label: 'Banner Image' },
          { id: 'sections', label: 'Partner Sections' }
        ];
      case 'home':
        return [
          { id: 'header', label: 'Header Content' },
          { id: 'features', label: 'Feature Cards' },
          { id: 'highlights', label: 'Featured Highlights' },
          { id: 'community', label: 'Community Section' },
          { id: 'testimonial-cards', label: 'Testimonial Cards' }
        ];
      default:
        return [
          { id: 'banner', label: 'Banner Image' },
          { id: 'sections', label: 'Content Sections' }
        ];
    }
  };

  const renderPageSpecificFields = () => {
    const wrapSection = (id: string, content: JSX.Element) => (
      <div id={id} className={`section-content ${activeSection === id ? 'active' : ''}`}>
        {content}
      </div>
    );

    if (selectedPage === 'contact') {
      return (
        <>
          {wrapSection('main', 
            <div className="section-box">
              <h2 className="section-title">Main Content</h2>
              <input
                type="text"
                className="text-input"
                value={content.mainHeading || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  mainHeading: e.target.value
                }))}
                placeholder="Enter main heading"
              />
              <textarea
                className="text-input"
                value={content.mainDescription || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  mainDescription: e.target.value
                }))}
                rows={3}
                placeholder="Enter main description"
              />
              <input
                type="text"
                className="text-input"
                value={content.email || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  email: e.target.value
                }))}
                placeholder="Enter email"
              />
              <input
                type="text"
                className="text-input"
                value={content.phone || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  phone: e.target.value
                }))}
                placeholder="Enter phone"
              />
            </div>
          )}

          {wrapSection('sections',
            <div className="section-box">
              <h2 className="section-title">Contact Sections</h2>
              {(content.sections || []).map((section, index) => (
                <div key={index} className="section-box">
                  <input
                    type="text"
                    className="text-input"
                    value={section.title || ''}
                    onChange={(e) => {
                      const newSections = [...content.sections];
                      newSections[index] = {
                        ...newSections[index],
                        title: e.target.value,
                        description: section.description || ''
                      };
                      setContent(prev => ({ ...prev, sections: newSections }));
                    }}
                    placeholder="Enter section title"
                  />
                  <textarea
                    className="text-input"
                    value={section.description || ''}
                    onChange={(e) => {
                      const newSections = [...content.sections];
                      newSections[index] = {
                        ...newSections[index],
                        title: section.title || '',
                        description: e.target.value
                      };
                      setContent(prev => ({ ...prev, sections: newSections }));
                    }}
                    rows={3}
                    placeholder="Enter section description"
                  />
                </div>
              ))}
            </div>
          )}

          {wrapSection('location',
            <div className="section-box">
              <h2 className="section-title">Location Information</h2>
              <input
                type="text"
                className="text-input"
                value={content.locationHeading || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  locationHeading: e.target.value
                }))}
                placeholder="Enter location heading"
              />
              <input
                type="text"
                className="text-input"
                value={content.locationTitle || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  locationTitle: e.target.value
                }))}
                placeholder="Enter location title"
              />
              <input
                type="text"
                className="text-input"
                value={content.locationSubHeading || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  locationSubHeading: e.target.value
                }))}
                placeholder="Enter location sub-heading"
              />
              {content.address?.map((line, index) => (
                <input
                  key={index}
                  type="text"
                  className="text-input"
                  value={line}
                  onChange={(e) => {
                    const newAddress = [...(content.address || [])];
                    newAddress[index] = e.target.value;
                    setContent(prev => ({ ...prev, address: newAddress }));
                  }}
                  placeholder={`Address line ${index + 1}`}
                />
              ))}
            </div>
          )}
        </>
      );
    }

    if (selectedPage === 'community' || selectedPage === 'graduates') {
      return (
        <>
          {wrapSection('header',
            <div className="section-box">
              <h2 className="section-title">Header Text</h2>
              <input
                type="text"
                className="text-input"
                value={content.headerText || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  headerText: e.target.value
                }))}
                placeholder="Enter header text"
              />
            </div>
          )}

          {wrapSection('subtext',
            <div className="section-box">
              <h2 className="section-title">Sub Text</h2>
              <textarea
                className="text-input"
                value={content.subText || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  subText: e.target.value
                }))}
                rows={3}
                placeholder="Enter sub text"
              />
            </div>
          )}

          {wrapSection('testimonials',
            <div className="testimonials-section">
              <div className="testimonials-header">
                <h2 className="section-title">
                  {selectedPage === 'graduates' ? 'Graduate Stories' : 'Testimonials'}
                </h2>
                <button 
                  type="button" 
                  className="add-button"
                  onClick={addTestimonial}
                >
                  Add {selectedPage === 'graduates' ? 'Graduate' : 'Testimonial'}
                </button>
              </div>
              
              {content.testimonials?.map((testimonial, index) => (
                <div key={index} className="section-box">
                  <div className="section-header">
                    <h3>Testimonial {index + 1}</h3>
                    <button 
                      type="button"
                      className="remove-button"
                      onClick={() => removeTestimonial(index)}
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    className="text-input"
                    value={testimonial.name}
                    onChange={(e) => {
                      const newTestimonials = [...(content.testimonials || [])];
                      newTestimonials[index] = { ...newTestimonials[index], name: e.target.value };
                      setContent(prev => ({ ...prev, testimonials: newTestimonials }));
                    }}
                    placeholder="Enter name"
                  />
                  <input
                    type="text"
                    className="text-input"
                    value={testimonial.subtitle}
                    onChange={(e) => {
                      const newTestimonials = [...(content.testimonials || [])];
                      newTestimonials[index] = { ...newTestimonials[index], subtitle: e.target.value };
                      setContent(prev => ({ ...prev, testimonials: newTestimonials }));
                    }}
                    placeholder="Enter subtitle"
                  />
                  <textarea
                    className="text-input"
                    value={testimonial.description}
                    onChange={(e) => {
                      const newTestimonials = [...(content.testimonials || [])];
                      newTestimonials[index] = { ...newTestimonials[index], description: e.target.value };
                      setContent(prev => ({ ...prev, testimonials: newTestimonials }));
                    }}
                    rows={4}
                    placeholder="Enter description"
                  />
                  <div className="image-upload-box">
                    <h3>Testimonial Image</h3>
                    <input
                      type="file"
                      className="file-input"
                      id={`testimonial-image-${index}`}
                      accept="image/*"
                      onChange={(e) => e.target.files && handleTestimonialImageUpload(e.target.files[0], index)}
                    />
                    <label htmlFor={`testimonial-image-${index}`}>
                      <span className="file-name-truncatee">Choose file</span>
                    </label>
                    {testimonial.image && (
                      <div className="image-preview">
                        <img 
                          src={getImageUrl(testimonial.image)}
                          alt={testimonial.name}
                          onError={handleImageError}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      );
    }

    if (selectedPage === 'team') {
      return (
        <>
          {wrapSection('members',
            <div className="section-box">
              <div className="testimonials-header">
                <h2 className="section-title">Team Members</h2>
                <button 
                  type="button" 
                  className="add-button"
                  onClick={addTeamMember}
                >
                  Add Team Member
                </button>
              </div>
              
              {content.members?.map((member, index) => (
                <div key={index} className="section-box">
                  <div className="section-header">
                    <h3>Team Member {index + 1}</h3>
                    <button 
                      type="button"
                      className="remove-button"
                      onClick={() => removeTeamMember(index)}
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    className="text-input"
                    value={member.name}
                    onChange={(e) => {
                      const newMembers = [...(content.members || [])];
                      newMembers[index] = { ...newMembers[index], name: e.target.value };
                      setContent(prev => ({ ...prev, members: newMembers }));
                    }}
                    placeholder="Enter name"
                  />
                  <input
                    type="text"
                    className="text-input"
                    value={member.subText}
                    onChange={(e) => {
                      const newMembers = [...(content.members || [])];
                      newMembers[index] = { ...newMembers[index], subText: e.target.value };
                      setContent(prev => ({ ...prev, members: newMembers }));
                    }}
                    placeholder="Enter description"
                  />
                  <div className="image-upload-box">
                    <h3>Member Image</h3>
                    <input
                      type="file"
                      className="file-input"
                      id={`team-member-image-${index}`}
                      accept="image/*"
                      onChange={(e) => e.target.files && handleTeamMemberImageUpload(e.target.files[0], index)}
                    />
                    <label htmlFor={`team-member-image-${index}`}>
                      <span className="file-name-truncatee">Choose file</span>
                    </label>
                    {member.image && (
                      <div className="image-preview">
                        <img 
                          src={getImageUrl(member.image)}
                          alt={member.name}
                          onError={handleImageError}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      );
    }

    if (selectedPage === 'life') {
      return (
        <>
          {wrapSection('header',
            <div className="section-box">
              <h2 className="section-title">Header Text</h2>
              <input
                type="text"
                className="text-input"
                value={content.headerText || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  headerText: e.target.value
                }))}
                placeholder="Enter header text"
              />
              <textarea
                className="text-input"
                value={content.description || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                rows={3}
                placeholder="Enter description"
              />
            </div>
          )}

          {wrapSection('tabs',
            <div className="section-box">
              <h2 className="section-title">Tabs</h2>
              {content.tabs?.map((tab, index) => (
                <input
                  key={index}
                  type="text"
                  className="text-input"
                  value={tab}
                  onChange={(e) => {
                    const newTabs = [...(content.tabs || [])];
                    newTabs[index] = e.target.value;
                    setContent(prev => ({ ...prev, tabs: newTabs }));
                  }}
                  placeholder={`Tab ${index + 1}`}
                />
              ))}
            </div>
          )}

          {wrapSection('gallery',
            <div className="section-box">
              <div className="testimonials-header">
                <h2 className="section-title">Gallery Images</h2>
                <button 
                  type="button" 
                  className="add-button"
                  onClick={addGalleryImage}
                >
                  Add Image
                </button>
              </div>
              
              {content.galleryImages?.map((image, index) => (
                <div key={index} className="section-box">
                  <div className="section-header">
                    <h3>Image {index + 1}</h3>
                    <button 
                      type="button"
                      className="remove-button"
                      onClick={() => removeGalleryImage(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <input
                    type="text"
                    className="text-input"
                    value={image.title}
                    onChange={(e) => {
                      const newImages = [...(content.galleryImages || [])];
                      newImages[index] = { ...newImages[index], title: e.target.value };
                      setContent(prev => ({ ...prev, galleryImages: newImages }));
                    }}
                    placeholder="Enter image title"
                  />

                  <textarea
                    className="text-input"
                    value={image.description}
                    onChange={(e) => {
                      const newImages = [...(content.galleryImages || [])];
                      newImages[index] = { ...newImages[index], description: e.target.value };
                      setContent(prev => ({ ...prev, galleryImages: newImages }));
                    }}
                    placeholder="Enter image description"
                  />

                  <div className="tag-selector">
                    <h3>Image Category</h3>
                    <select
                      className="tag-select"
                      value={image.tags[0] || ''}
                      onChange={(e) => {
                        const selectedTag = e.target.value;
                        const newImages = [...(content.galleryImages || [])];
                        newImages[index] = { 
                          ...newImages[index], 
                          tags: selectedTag ? [selectedTag] : [] 
                        };
                        setContent(prev => ({ ...prev, galleryImages: newImages }));
                      }}
                    >
                      <option value="">Select a category</option>
                      {content.tabs?.slice(1).map((tab, i) => (
                        <option key={i} value={tab}>{tab}</option>
                      ))}
                    </select>
                  </div>

                  <div className="image-upload-box">
                    <h3>Image</h3>
                    <input
                      type="file"
                      className="file-input"
                      id={`gallery-image-${index}`}
                      accept="image/*"
                      onChange={(e) => e.target.files && handleGalleryImageUpload(e.target.files[0], index)}
                    />
                    <label htmlFor={`gallery-image-${index}`}>
                      <span className="file-name-truncatee">Choose file</span>
                    </label>
                    {image.src && (
                      <div className="image-preview">
                        <img 
                          src={getImageUrl(image.src)}
                          alt={image.title}
                          onError={handleImageError}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      );
    }

    if (selectedPage === 'home') {
      return (
        <>
          {wrapSection('header',
            <div className="section-box">
              <h2 className="section-title">Header Content</h2>
              <input
                type="text"
                className="text-input"
                value={content.headerTitle || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  headerTitle: e.target.value
                }))}
                placeholder="Enter main title"
              />
              <textarea
                className="text-input"
                value={content.headerDescription || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  headerDescription: e.target.value
                }))}
                placeholder="Enter main description"
              />
            </div>
          )}

          {/* Remove stats and additional-cards sections */}
          
          {/* Keep existing features, highlights, community, and testimonial-cards sections */}
          {wrapSection('features',
            <div className="section-box">
              <div className="testimonials-header">
                <h2 className="section-title">Feature Cards</h2>
                <button 
                  type="button" 
                  className="add-button"
                  onClick={() => {
                    console.log('Adding new feature');
                    setContent(prev => {
                      // Ensure features array exists
                      const currentFeatures = [...(prev.features || [])];
                      const newIndex = currentFeatures.length;
                      console.log('New feature index:', newIndex);
                      
                      currentFeatures.push({
                        title: '',
                        description: '',
                        image: ''
                      });
                      
                      console.log('Updated features:', currentFeatures);
                      return { 
                        ...prev, 
                        features: currentFeatures 
                      };
                    });
                  }}
                >
                  Add Feature
                </button>
              </div>
              
              {(content.features || []).map((feature, index) => {
                console.log(`Rendering feature ${index}:`, feature);
                const imageUrl = feature.image ? getImageUrl(feature.image) : null;
                const showImage = imageUrl && imageUrl !== '/images/default-event.png';
                
                return (
                  <div key={`feature-${index}`} className="section-box">
                    <div className="section-header">
                      <h3>Feature {index + 1}</h3>
                      <button 
                        type="button"
                        className="remove-button"
                        onClick={() => {
                          console.log('Removing feature at index:', index);
                          setContent(prev => {
                            const currentFeatures = [...(prev.features || [])];
                            currentFeatures.splice(index, 1);
                            console.log('Features after removal:', currentFeatures);
                            return { 
                              ...prev, 
                              features: currentFeatures 
                            };
                          });
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      className="text-input"
                      value={feature.title || ''}
                      onChange={(e) => {
                        setContent(prev => {
                          const currentFeatures = [...(prev.features || [])];
                          currentFeatures[index] = { 
                            ...currentFeatures[index], 
                            title: e.target.value 
                          };
                          return { 
                            ...prev, 
                            features: currentFeatures 
                          };
                        });
                      }}
                      placeholder="Enter feature title"
                    />
                    <textarea
                      className="text-input"
                      value={feature.description || ''}
                      onChange={(e) => {
                        setContent(prev => {
                          const currentFeatures = [...(prev.features || [])];
                          currentFeatures[index] = { 
                            ...currentFeatures[index], 
                            description: e.target.value 
                          };
                          return { 
                            ...prev, 
                            features: currentFeatures 
                          };
                        });
                      }}
                      placeholder="Enter feature description"
                    />
                    <div className="image-upload-box">
                      <h3>Feature Icon</h3>
                      <input
                        type="file"
                        className="file-input"
                        id={`feature-image-${index}`}
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            console.log('Uploading feature image for index:', index);
                            console.log('Current feature state:', feature);
                            handleFeatureImageUpload(e.target.files[0], index);
                          }
                        }}
                      />
                      <label htmlFor={`feature-image-${index}`}>
                        <span className="file-name-truncatee">Choose file</span>
                      </label>
                      {showImage && (
                        <div className="image-preview">
                          <img 
                            src={imageUrl}
                            alt={feature.title || `Feature ${index + 1}`}
                            onError={(e) => {
                              console.log('Image error for feature', index, e);
                              handleImageError(e);
                            }}
                            data-feature-index={index}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {wrapSection('highlights',
            <div className="section-box">
              <div className="testimonials-header">
                <h2 className="section-title">Featured Highlights</h2>
                <button 
                  type="button" 
                  className="add-button"
                  onClick={() => {
                    setContent(prev => ({
                      ...prev,
                      highlights: [...(prev.highlights || []), {
                        title: '',
                        description: '',
                        image: '',
                        link: ''
                      }]
                    }));
                  }}
                >
                  Add Highlight
                </button>
              </div>
              
              {content.highlights?.map((highlight, index) => (
                <div key={index} className="section-box">
                  <div className="section-header">
                    <h3>Highlight {index + 1}</h3>
                    <button 
                      type="button"
                      className="remove-button"
                      onClick={() => {
                        const newHighlights = [...(content.highlights || [])];
                        newHighlights.splice(index, 1);
                        setContent(prev => ({ ...prev, highlights: newHighlights }));
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <input
                    type="text"
                    className="text-input"
                    value={highlight.title}
                    onChange={(e) => {
                      const newHighlights = [...(content.highlights || [])];
                      newHighlights[index] = { ...newHighlights[index], title: e.target.value };
                      setContent(prev => ({ ...prev, highlights: newHighlights }));
                    }}
                    placeholder="Enter highlight title"
                  />

                  <textarea
                    className="text-input"
                    value={highlight.description}
                    onChange={(e) => {
                      const newHighlights = [...(content.highlights || [])];
                      newHighlights[index] = { ...newHighlights[index], description: e.target.value };
                      setContent(prev => ({ ...prev, highlights: newHighlights }));
                    }}
                    placeholder="Enter highlight description"
                  />

                  <input
                    type="text"
                    className="text-input"
                    value={highlight.link}
                    onChange={(e) => {
                      const newHighlights = [...(content.highlights || [])];
                      newHighlights[index] = { ...newHighlights[index], link: e.target.value };
                      setContent(prev => ({ ...prev, highlights: newHighlights }));
                    }}
                    placeholder="Enter highlight link (e.g., /grad)"
                  />

                  <div className="image-upload-box">
                    <h3>Highlight Image</h3>
                    <input
                      type="file"
                      className="file-input"
                      id={`highlight-image-${index}`}
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleHighlightImageUpload(e.target.files[0], index);
                        }
                      }}
                    />
                    <label htmlFor={`highlight-image-${index}`}>
                      <span className="file-name-truncatee">Choose file</span>
                    </label>
                    {highlight.image && (
                      <div className="image-preview">
                        <img 
                          src={getImageUrl(highlight.image)}
                          alt={highlight.title}
                          onError={handleImageError}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {wrapSection('community',
            <div className="section-box">
              <h2 className="section-title">Community Section</h2>
              <input
                type="text"
                className="text-input"
                value={content.community?.title || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  community: { ...prev.community, title: e.target.value }
                }))}
                placeholder="Enter section title"
              />
              <textarea
                className="text-input"
                value={content.community?.description || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  community: { 
                    title: prev.community?.title || '',
                    description: e.target.value,
                    image: prev.community?.image 
                  }
                }))}
                placeholder="Enter section description"
              />
              <div className="image-upload-box">
                <h3>Community Image</h3>
                <input
                  type="file"
                  className="file-input"
                  id="community-image"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleCommunityImageUpload(e.target.files[0]);
                    }
                  }}
                />
                <label htmlFor="community-image">
                  <span className="file-name-truncatee">Choose file</span>
                </label>
                {content.community?.image && (
                  <div className="image-preview">
                    <img 
                      src={getImageUrl(content.community.image)}
                      alt="Community"
                      onError={handleImageError}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {wrapSection('testimonial-cards',
            <div className="section-box">
              <div className="testimonials-header">
                <h2 className="section-title">Testimonial Cards</h2>
                <button 
                  type="button" 
                  className="add-button"
                  onClick={() => {
                    setContent(prev => ({
                      ...prev,
                      testimonialCards: [...(prev.testimonialCards || []), {
                        name: '',
                        title: '',
                        description: '',
                        backDescription: '',
                        image: ''
                      }]
                    }));
                  }}
                >
                  Add Testimonial Card
                </button>
              </div>
              
              {content.testimonialCards?.map((card, index) => (
                <div key={index} className="section-box">
                  <div className="section-header">
                    <h3>Card {index + 1}</h3>
                    <button 
                      type="button"
                      className="remove-button"
                      onClick={() => {
                        const newCards = [...(content.testimonialCards || [])];
                        newCards.splice(index, 1);
                        setContent(prev => ({ ...prev, testimonialCards: newCards }));
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <input
                    type="text"
                    className="text-input"
                    value={card.name}
                    onChange={(e) => {
                      const newCards = [...(content.testimonialCards || [])];
                      newCards[index] = { ...newCards[index], name: e.target.value };
                      setContent(prev => ({ ...prev, testimonialCards: newCards }));
                    }}
                    placeholder="Enter name"
                  />

                  <input
                    type="text"
                    className="text-input"
                    value={card.title}
                    onChange={(e) => {
                      const newCards = [...(content.testimonialCards || [])];
                      newCards[index] = { ...newCards[index], title: e.target.value };
                      setContent(prev => ({ ...prev, testimonialCards: newCards }));
                    }}
                    placeholder="Enter title"
                  />

                  <input
                    type="text"
                    className="text-input"
                    value={card.description}
                    onChange={(e) => {
                      const newCards = [...(content.testimonialCards || [])];
                      newCards[index] = { ...newCards[index], description: e.target.value };
                      setContent(prev => ({ ...prev, testimonialCards: newCards }));
                    }}
                    placeholder="Enter front description"
                  />

                  <textarea
                    className="text-input"
                    value={card.backDescription}
                    onChange={(e) => {
                      const newCards = [...(content.testimonialCards || [])];
                      newCards[index] = { ...newCards[index], backDescription: e.target.value };
                      setContent(prev => ({ ...prev, testimonialCards: newCards }));
                    }}
                    placeholder="Enter back description"
                    rows={4}
                  />

                  <div className="image-upload-box">
                    <h3>Card Image</h3>
                    <input
                      type="file"
                      className="file-input"
                      id={`testimonial-card-image-${index}`}
                      accept="image/*"
                      onChange={(e) => e.target.files && handleTestimonialCardImageUpload(e.target.files[0], index)}
                    />
                    <label htmlFor={`testimonial-card-image-${index}`}>
                      <span className="file-name-truncatee">Choose file</span>
                    </label>
                    {card.image && (
                      <div className="image-preview">
                        <img 
                          src={getImageUrl(card.image)}
                          alt={card.name}
                          onError={handleImageError}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      );
    }
    
    return content.sections?.map((section, index) => (
      <div key={index} className="section-box">
        <h2 className="section-title">Section {index + 1}</h2>
        
        {selectedPage === 'partner' && (
          <input
            type="text"
            className="text-input"
            value={section.title || ''}
            onChange={(e) => {
              const newContent = { ...content };
              newContent.sections[index] = {
                ...newContent.sections[index],
                title: e.target.value
              };
              setContent(newContent);
            }}
            placeholder="Enter section title"
          />
        )}
        
        <textarea
          className="text-input"
          value={section.text}
          onChange={(e) => {
            const newContent = { ...content };
            newContent.sections[index].text = e.target.value;
            setContent(newContent);
          }}
          rows={4}
          placeholder="Enter section text"
        />

        <div className="image-upload-box">
          <h3 className="section-title">Section Image</h3>
          <input
            type="file"
            className="file-input"
            id={`section-image-${index}`}
            accept="image/*"
            onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], index)}
          />
          <label htmlFor={`section-image-${index}`}>
            <span className="file-name-truncatee">Choose file</span>
          </label>
          {section.image && (
            <div className="image-preview">
              <img 
                src={getImageUrl(section.image)} 
                alt={`Section ${index + 1}`}
                onError={handleImageError}
              />
            </div>
          )}
        </div>

        {section.caption !== undefined && (
          <input
            type="text"
            className="text-input"
            value={section.caption}
            onChange={(e) => {
              const newContent = { ...content };
              newContent.sections[index].caption = e.target.value;
              setContent(newContent);
            }}
            placeholder="Enter caption"
          />
        )}
      </div>
    ));
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setActiveSection(sectionId);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPage(e.target.value);
    const sections = getSections();
    if (sections.length > 0) {
      setActiveSection(sections[0].id);
    }
  };

  return (
    <div className="editor-container">
      <h1 className="editor-title">Content Management</h1>
      
      <select
        className="page-select"
        value={selectedPage}
        onChange={handlePageChange}
      >
        {pages.map(page => (
          <option key={page} value={page}>
            {page.charAt(0).toUpperCase() + page.slice(1)}
          </option>
        ))}
      </select>

      {selectedPage && (
        <div className="editor-layout">
          <div className="editor-sidebar">
            <ul className="section-nav">
              {getSections().map(section => (
                <li
                  key={section.id}
                  className={activeSection === section.id ? 'active' : ''}
                  onClick={() => scrollToSection(section.id)}
                >
                  {section.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="editor-main">
            <div className="content-section">
              {selectedPage !== 'home' && selectedPage !== 'contact' && (
                <div id="banner" className={`section-content ${activeSection === 'banner' ? 'active' : ''}`}>
                  <div className="image-upload-box">
                    <h2 className="section-title">Banner Image</h2>
                    <input
                      type="file"
                      className="file-input"
                      id="banner-image"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleImageUpload(e.target.files[0], -1);
                        } else {
                          console.error('No file selected');
                        }
                      }}
                    />
                    <label htmlFor="banner-image">
                      <span className="file-name-truncatee">Choose file</span>
                    </label>
                    {content.bannerImage && (
                      <div className="image-preview">
                        <img 
                          src={getImageUrl(content.bannerImage)} 
                          alt="Banner"
                          onError={handleImageError}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {renderPageSpecificFields()}

              <button 
                className="save-buttonsss"
                onClick={handleSave}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <button 
        className={`scroll-indicator ${showScrollTop ? 'visible' : ''}`}
        onClick={scrollToTop}
      >
        ↑
      </button>
    </div>
  );
}

const wrapSection = (id: string, content: JSX.Element) => (
  <div id={id} className={`section-content`}>
    {content}
  </div>
);
