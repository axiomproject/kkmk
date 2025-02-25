import React, { useState, useEffect, useMemo } from 'react';
import { Post } from '../../types/forum';
import { checkProfanity, validateContent } from '../../utils/profanityFilter';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import '../../styles/CreatePost.css';
import { analyzeImage } from '../../utils/imageFilter';

interface CreatePostProps {
  onPostCreate: (postData: FormData) => Promise<void>;
  eventId?: string;
  categoryInfo: {
    category: string;
    eventTitle?: string;
  };
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreate, eventId, categoryInfo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [postType, setPostType] = useState<'discussion' | 'poll'>('discussion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [category, setCategory] = useState('general');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profanityError, setProfanityError] = useState<string | null>(null);
  const [profanityField, setProfanityField] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminOrStaff, setIsAdminOrStaff] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setIsAdmin(user.role === 'admin');
      setIsAdminOrStaff(['admin', 'staff'].includes(user.role));
    }
  }, []);

  // Filter categories based on user role
  const availableCategories = useMemo(() => {
    const baseCategories = ['General', 'Questions', 'Support', 'Suggestions'];
    if (isAdminOrStaff) {
      // Allow admins to post in both Announcements and Events categories
      return ['Announcements', 'Events', ...baseCategories];
    }
    return baseCategories;
  }, [isAdminOrStaff]);

  useEffect(() => {
    // When in an event, set both category and ensure form knows about eventId
    if (categoryInfo.category === 'event' && categoryInfo.eventTitle) {
      setCategory(categoryInfo.eventTitle);
      console.log('Setting up event post with eventId:', eventId); // Debug log
    }
  }, [categoryInfo, eventId]);

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Analyze image before processing
        const analysis = await analyzeImage(file);
        
        if (analysis.isExplicit) {
          alert('This image appears to contain inappropriate content and cannot be uploaded.');
          event.target.value = ''; // Clear the input
          return;
        }
  
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image. Please try another one.');
        event.target.value = ''; // Clear the input
      }
    }
  };

  const handleTextChange = (field: 'title' | 'content', value: string) => {
    if (checkProfanity(value)) {
      setShowAlert(true);
      setProfanityError(`Your ${field} contains inappropriate language`);
      setProfanityField(field);
    } else {
      setProfanityError(null);
      setProfanityField(null);
    }

    if (field === 'title') setTitle(value);
    else setContent(value);
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;

    const validation = validateContent({ pollOptions: [value] });
    if (!validation.isValid && validation.error) {
      setProfanityError(validation.error);
    } else {
      setProfanityError(null);
    }

    setPollOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all content before submission
    const validation = validateContent({
      title,
      content: postType === 'discussion' ? content : undefined,
      pollOptions: postType === 'poll' ? pollOptions : undefined
    });

    if (!validation.isValid) {
      setProfanityError(validation.error || 'Content contains inappropriate language');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (postType === 'discussion' && !content.trim()) {
      alert('Please enter content');
      return;
    }

    if (postType === 'poll' && pollOptions.filter(opt => opt.trim()).length < 2) {
      alert('Please add at least 2 poll options');
      return;
    }

    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('content', content.trim());
    formData.append('authorId', user?.id || '0');
    
    // Set category exactly as provided for events
    if (categoryInfo.category === 'event' && categoryInfo.eventTitle) {
      formData.append('category', categoryInfo.eventTitle);
      formData.append('eventId', eventId || '');
    } else {
      formData.append('category', category);
    }
    
    formData.append('type', postType);

    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    if (postType === 'poll') {
      formData.append('poll', JSON.stringify({
        question: title.trim(),
        options: pollOptions
          .filter(option => option.trim() !== '')
          .map((text, index) => ({
            id: index.toString(),
            text: text.trim(),
            votes: 0
          }))
      }));
    }

    console.log('Form data being sent:', Object.fromEntries(formData.entries())); // Debug log
    await onPostCreate(formData);
    setIsOpen(false);
    resetForm();
  };

  const handleAddOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPollOptions(['', '']);
    setCategory('general');
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleOpenModal = () => {
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
    setIsOpen(true);
  };

  return (
    <>
      <div 
        className="create-post-trigger" 
        onClick={handleOpenModal}
        title="Create new post"
      >
        <AddCircleIcon />
      </div>

      {isOpen && (
        <div className="create-post-modal" onClick={() => setIsOpen(false)}>
          <div 
            className="create-post-content" 
            onClick={e => e.stopPropagation()}
            style={{
              margin: 'auto',
              marginTop: 'calc(var(--scroll-y, 0px) + 50px)'
            }}
          >
            <div className="create-post-header">
              <h2>Create New Post</h2>
            </div>

            <div className="create-post-type-selector">
              <div
                className={`post-type-option ${postType === 'discussion' ? 'active' : ''}`}
                onClick={() => setPostType('discussion')}
              >
                Discussion
              </div>
              <div
                className={`post-type-option ${postType === 'poll' ? 'active' : ''}`}
                onClick={() => setPostType('poll')}
              >
                Poll
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  {postType === 'poll' ? 'Poll Question' : 'Title'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => handleTextChange('title', e.target.value)}
                  placeholder={postType === 'poll' ? 'Enter your question here...' : 'Give your post a title...'}
                />
                {/* ... error message if exists ... */}
              </div>

              {categoryInfo.category !== 'event' && (
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="" disabled>Select a category...</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {postType === 'discussion' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Content</label>
                    <textarea
                      className="form-textarea"
                      value={content}
                      onChange={(e) => handleTextChange('content', e.target.value)}
                      placeholder="Share your thoughts here..."
                    />
                  </div>

                  <div className="image-upload">
                    <input
                      type="file"
                      id="image-upload"
                      hidden
                      accept="image/*"
                      onChange={handleImageSelect}
                    />
                    <label htmlFor="image-upload" className="add-option-button">
                      <AddPhotoAlternateIcon /> Add Image
                    </label>

                    {imagePreview && (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Preview" />
                        <button
                          type="button"
                          className="remove-image"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                        >
                          <CloseIcon />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="poll-options">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="form-group">
                      <input
                        type="text"
                        className="form-input"
                        placeholder={`Option ${index + 1}...`}
                        value={option}
                        onChange={(e) => handlePollOptionChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-option-button"
                    onClick={handleAddOption}
                  >
                    Add Option
                  </button>
                </div>
              )}

              <div className="create-post-actions">
                <div
                  className="post-action-cancel"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </div>
                <div
                  className={`post-action-submit ${!title.trim() || (postType === 'discussion' && !content.trim()) ? 'disabled' : ''}`}
                  onClick={handleSubmit}
                >
                  Create Post
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CreatePost;
