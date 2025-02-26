import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../config/axios'; // Replace axios import
import Coverpphotoprofile from '../../img/volunteer/coverphoto.png';
import defaultProfile from '../../img/volunteer/defaultProfile.png';
import editbutton from '../../img/volunteer/editbutton.png';
import fb from '../../img/volunteer/fb.png';
import X from '../../img/volunteer/x.png';
import Instagram from '../../img/volunteer/instagram.png';
import copyicon from '../../img/volunteer/copyicon.png';
import shareicon from '../../img/volunteer/shareicon.png';
import '../../styles/Layout.css';
import '../../styles/EventFeedback.css'; // Import the new CSS file
import { 
  User, 
  PhotoUpdateResponse, 
  UserInfoUpdateResponse,
  ReportCardSubmissionResponse // Add this import
} from '../../types/auth';
import { FiEdit, FiUpload, FiMapPin, FiMessageSquare } from 'react-icons/fi'; // Add FiMapPin
import ProcessTimeline from '../../components/ProcessTimeline';
import { FaStar } from 'react-icons/fa';

interface UserData {
  name: string;
  username: string;
}

interface LocationRemark {
  location_remark: string;
  scheduled_visit: string;
  remark_added_at: string;
  location_verified: boolean;
}

interface PendingFeedbackEvent {
  id: number;
  title: string;
  date: string;
}

const VolunteerProfile: React.FC = () => {
  const [value, setValue] = useState(0);
  const [intro, setIntro] = useState("");
  const [knowAs, setKnowAs] = useState("");
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [isEditingKnowAs, setIsEditingKnowAs] = useState(false);
  const [coverPhoto, setCoverPhoto] = useState(Coverpphotoprofile);
  const [profilePhoto, setProfilePhoto] = useState(defaultProfile);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState<"profile" | "cover" | null>(null);
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userData, setUserData] = useState<User | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isEditingSocials, setIsEditingSocials] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    twitter: '',
    instagram: ''
  });
  const [userType, setUserType] = useState<string>('');
  const location = useLocation();
  const profileLink = "https://kmpayatasb.org/profile/91348";
  const [isReportCardModalOpen, setIsReportCardModalOpen] = useState(false);
  const [reportCardFront, setReportCardFront] = useState<string | null>(null);
  const [reportCardBack, setReportCardBack] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedReport, setHasSubmittedReport] = useState(false);
  const [verificationStep, setVerificationStep] = useState(1);
  const [hasActiveSubmission, setHasActiveSubmission] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [locationRemark, setLocationRemark] = useState<LocationRemark | null>(null);
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const [pendingFeedbackEvents, setPendingFeedbackEvents] = useState<PendingFeedbackEvent[]>([]);
  const [currentFeedbackEvent, setCurrentFeedbackEvent] = useState<PendingFeedbackEvent | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [dismissedFeedback, setDismissedFeedback] = useState<Set<number>>(new Set());

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserName(user.name);
      setUserUsername(user.username);
      setUserData(user);
      setUserType(user.role?.toLowerCase() || ''); // Changed from userType to role and ensure lowercase
      if (user.profilePhoto) setProfilePhoto(user.profilePhoto);
      if (user.coverPhoto) setCoverPhoto(user.coverPhoto);
      if (user.intro) setIntro(user.intro);
      if (user.knownAs) setKnowAs(user.knownAs);
      setSocialLinks({
        facebook: user.facebookUrl || '',
        twitter: user.twitterUrl || '',
        instagram: user.instagramUrl || ''
      });
      setHasSubmittedReport(user.hasSubmittedReport || false);
      setVerificationStep(user.verificationStep || 1);
      if (user.latitude && user.longitude) {
        setUserLocation({
          latitude: user.latitude,
          longitude: user.longitude
        });
      }
    }
  }, []);

  // Add listener for logout event
  useEffect(() => {
    const handleLogout = () => {
      setProfilePhoto(Coverpphotoprofile);
      setCoverPhoto(defaultProfile);
      setUserName('');
      setUserUsername('');
      setUserData(null);
    };

    window.addEventListener('userLoggedOut', handleLogout);

    return () => {
      window.removeEventListener('userLoggedOut', handleLogout);
    };
  }, []);

  useEffect(() => {
    // Add check for existing report card
    const checkReportCardStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // First, check for any active (pending/in_review) submission
        const activeResponse = await api.get(
          `/scholars/report-card/${user.id}/active`
        );
        
        // Then, check for any submission regardless of status
        const submissionResponse = await api.get(
          `/scholars/report-card/${user.id}`
        );

        setHasActiveSubmission(!!activeResponse.data);
        setHasSubmittedReport(!!submissionResponse.data);
        
        // If there's a submission, set the verification step
        if (submissionResponse.data) {
          setVerificationStep(submissionResponse.data.verification_step || 1);
        }
      } catch (error) {
        console.error('Error checking report card status:', error);
      }
    };

    if (userType === 'scholar') {
      checkReportCardStatus();
    }
  }, [userType]);

  // Add this effect to fetch remarks
  useEffect(() => {
    const fetchRemarks = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('token');
        
        const response = await api.get(
          `/scholars/location-remarks/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        
        setLocationRemark(response.data);
        // Set location verification status
        setIsLocationVerified(response.data?.location_verified || false);
      } catch (error) {
        console.error('Error fetching remarks:', error);
      }
    };

    if (userType === 'scholar') {
      fetchRemarks();
    }
  }, [userType]);

  // Add this function to handle modal open
  const openFeedbackModal = () => {
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
    setShowFeedbackModal(true);
  };

  // Modify handleCloseFeedback function
  const handleCloseFeedback = async () => {
    if (currentFeedbackEvent) {
      try {
        const token = localStorage.getItem('token');
        
        // Call the dismiss endpoint
        await api.post(
          `/events/${currentFeedbackEvent.id}/dismiss-feedback`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Add current event ID to dismissed set
        setDismissedFeedback(prev => new Set([...prev, currentFeedbackEvent.id]));
        
        // Move to next event that hasn't been dismissed
        const nextEvent = pendingFeedbackEvents.find(event => !dismissedFeedback.has(event.id));
        if (nextEvent) {
          setCurrentFeedbackEvent(nextEvent);
        } else {
          setShowFeedbackModal(false);
          setCurrentFeedbackEvent(null);
        }
      } catch (error) {
        console.error('Error dismissing feedback:', error);
      }
    }
  };

  // Modify the useEffect for checking pending feedback
  useEffect(() => {
    const checkPendingFeedback = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Modified endpoint to exclude dismissed feedback
        const response = await api.get(
          '/events/pending-feedback',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Filter out any events that have been dismissed in the current session
        const availableEvents = response.data.filter(
          (event: PendingFeedbackEvent) => !dismissedFeedback.has(event.id)
        );
        
        setPendingFeedbackEvents(availableEvents);
        
        if (availableEvents.length > 0 && !dismissedFeedback.has(availableEvents[0].id)) {
          setCurrentFeedbackEvent(availableEvents[0]);
          openFeedbackModal();
        }
      } catch (error) {
        console.error('Error checking pending feedback:', error);
      }
    };

    // Check for pending feedback when component mounts
    checkPendingFeedback();
  }, [dismissedFeedback]);

  const handleChange = (index: number) => {
    setValue(index);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileLink).then(() => {
      alert("Link copied to clipboard!");
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "Profile",
          text: "Check out this amazing profile!",
          url: profileLink,
        })
        .then(() => console.log("Shared successfully"))
        .catch((error) => console.error("Error sharing:", error));
    } else {
      alert("Sharing is not supported on this browser.");
    }
  };

  const handleSaveIntro = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const { data } = await api.put<UserInfoUpdateResponse>(
        '/user/info',
        {
          userId: user.id,
          intro,
          knownAs: knowAs
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      localStorage.setItem('user', JSON.stringify(data.user));
      setIsEditingIntro(false);
    } catch (error) {
      console.error('Error saving intro:', error);
      alert('Failed to save intro. Please try again.');
    }
  };

  const handleSaveKnowAs = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const { data } = await api.put<UserInfoUpdateResponse>(
        '/user/info',
        {
          userId: user.id,
          intro,
          knownAs: knowAs
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      localStorage.setItem('user', JSON.stringify(data.user));
      setIsEditingKnowAs(false);
    } catch (error) {
      console.error('Error saving known as:', error);
      alert('Failed to save known as. Please try again.');
    }
  };

  const handleSaveSocials = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const { data } = await api.put(
        '/user/socials',
        {
          userId: user.id,
          facebookUrl: socialLinks.facebook,
          twitterUrl: socialLinks.twitter,
          instagramUrl: socialLinks.instagram
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Merge the new data with existing user data
      const updatedUser = {
        ...user,
        ...data.user,
        profilePhoto: data.user.profilePhoto || user.profilePhoto,
        coverPhoto: data.user.coverPhoto || user.coverPhoto,
        facebookUrl: data.user.facebookUrl,
        twitterUrl: data.user.twitterUrl,
        instagramUrl: data.user.instagramUrl
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update all relevant states
      if (updatedUser.profilePhoto) setProfilePhoto(updatedUser.profilePhoto);
      if (updatedUser.coverPhoto) setCoverPhoto(updatedUser.coverPhoto);
      setSocialLinks({
        facebook: updatedUser.facebookUrl || '',
        twitter: updatedUser.twitterUrl || '',
        instagram: updatedUser.instagramUrl || ''
      });
      
      setIsEditingSocials(false);
    } catch (error) {
      console.error('Error saving social links:', error);
      alert('Failed to save social links. Please try again.');
    }
  };

  const handlePhotoUpdate = async (photoType: "profile" | "cover", photoData: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      if (!user.id) {
        throw new Error('User not authenticated');
      }

      const { data } = await api.put<PhotoUpdateResponse>(
        '/user/photos',
        {
          userId: user.id,
          profilePhoto: photoType === 'profile' ? photoData : undefined,
          coverPhoto: photoType === 'cover' ? photoData : undefined
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!data.user) {
        throw new Error('Invalid response from server');
      }

      // Create a merged user object that preserves existing data
      const updatedUser = {
        ...user,                           // Keep existing user data
        ...data.user,                      // Merge with new data
        profilePhoto: data.user.profilePhoto || user.profilePhoto,
        coverPhoto: data.user.coverPhoto || user.coverPhoto,
        intro: data.user.intro ?? user.intro,           // Use nullish coalescing
        knownAs: data.user.knownAs ?? user.knownAs,      // Use nullish coalescing
        phone: data.user.phone ?? user.phone,  // Preserve phone
        dateOfBirth: data.user.dateOfBirth ?? user.dateOfBirth  // Preserve date of birth
      };

      // Update localStorage with merged data
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update all states with merged data
      if (photoType === 'profile') {
        setProfilePhoto(updatedUser.profilePhoto || defaultProfile);
        
        // Dispatch custom event to notify Header component of profile photo change
        const photoUpdateEvent = new CustomEvent('profilePhotoUpdated', { 
          detail: { profilePhoto: updatedUser.profilePhoto }
        });
        window.dispatchEvent(photoUpdateEvent);
      } else {
        setCoverPhoto(updatedUser.coverPhoto || Coverpphotoprofile);
      }
      
      setIntro(updatedUser.intro || "");
      setKnowAs(updatedUser.knownAs || "");
      setUserData(updatedUser);

    } catch (error) {
      console.error('Error updating photo:', error);
      alert('Failed to update photo. Please try again.');
    }
  };

  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (reader.result) {
          const base64String = reader.result.toString();
          await handlePhotoUpdate('cover', base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (reader.result) {
          const base64String = reader.result.toString();
          await handlePhotoUpdate('profile', base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoClick = (photoType: "profile" | "cover") => {
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
    setSelectedPhotoType(photoType);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
      setSelectedPhotoType(null);
    }, 300); // Match this with animation duration
  };

  const handleReportCardSubmission = () => {
    if (hasActiveSubmission) {
      alert('You already have a report card under review. Please wait for the current submission to be processed.');
      return;
    }
    setIsReportCardModalOpen(true);
  };

  const handleReportCardImageUpload = (side: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (side === 'front') {
          setReportCardFront(base64String);
        } else {
          setReportCardBack(base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReportCard = async () => {
    if (!reportCardFront || !reportCardBack) {
      alert('Please upload both front and back images of your report card');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const { data } = await api.post<ReportCardSubmissionResponse>(
        '/scholars/report-card',
        {
          userId: user.id,
          frontImage: reportCardFront,
          backImage: reportCardBack
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update local storage with new user state
      const updatedUser = {
        ...user,
        hasSubmittedReport: true,
        verificationStep: 1
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Update component state
      setHasSubmittedReport(true);
      setVerificationStep(1);
      setIsReportCardModalOpen(false);
      setReportCardFront(null);
      setReportCardBack(null);

      alert('Report card submitted successfully!');
    } catch (error) {
      console.error('Error submitting report card:', error);
      alert('Failed to submit report card. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this function to handle viewing progress
  const handleViewProgress = () => {
    setIsReportCardModalOpen(true);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const token = localStorage.getItem('token');

          // This URL is correct, we fixed the backend route to match it
          const { data } = await api.put(
            '/user/location',
            {
              userId: user.id,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (data.success) {
            const updatedUser = {
              ...user,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            
            // Reset location remark when location is updated
            setLocationRemark(null);
            
            alert('Location updated successfully!');
          }
        } catch (error) {
          console.error('Error updating location:', error);
          alert('Failed to update location. Please try again.');
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        alert(`Error getting location: ${error.message}`);
      },
      { enableHighAccuracy: true } // Add this option for better accuracy
    );
  };

  // Add this component to render remarks
  const RemarksSection = () => {
    if (!locationRemark?.location_remark) return null;

    const isRejected = locationRemark.location_remark.includes('rejected');

  };

  const handleSubmitFeedback = async () => {
    if (!currentFeedbackEvent) return;

    try {
      await api.post(
        `/events/${currentFeedbackEvent.id}/feedback`,
        { rating, comment: feedbackComment }
      );

      // Remove current event and show next if available
      const remainingEvents = pendingFeedbackEvents.filter(
        event => event.id !== currentFeedbackEvent.id
      );
      setPendingFeedbackEvents(remainingEvents);
      
      if (remainingEvents.length > 0) {
        setCurrentFeedbackEvent(remainingEvents[0]);
        // Reset form
        setRating(0);
        setFeedbackComment("");
      } else {
        setShowFeedbackModal(false);
        setCurrentFeedbackEvent(null);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="Profile-container">
        <div className="cover-photos">
          <div
            className="cover-photo"
            onClick={() => handlePhotoClick("cover")}
          >
            <img src={coverPhoto} alt="Cover" />
            <div className="photo-overlay">
              <span className="photo-overlay-text">
                <FiEdit size={20} />
                Change Cover Photo
              </span>
            </div>
          </div>
          <div
            className="profile-photo"
            onClick={() => handlePhotoClick("profile")}
          >
            <img src={profilePhoto} alt="Profile" />
            <div className="photo-overlay">
              <span className="photo-overlay-text">
                <FiEdit size={20} />
              </span>
            </div>
          </div>
          <div className="profile-text">
            <h1>{userName || userData?.name}</h1>
            <p>@{userUsername || userData?.username}</p>
          </div>
        </div>

        <div className="container-info">
          <div className="information">
            {userType === 'scholar' && (
              <>
                <div className="report-card-section">
                  {hasActiveSubmission || hasSubmittedReport ? (
                    <button 
                      onClick={handleViewProgress}
                      className="view-progress-button"
                    >
                      View Progress
                    </button>
                  ) : (
                    <button 
                      onClick={handleReportCardSubmission}
                      className="report-card-button"
                    >
                      Submit Report Card
                    </button>
                  )}
                </div>
                <div className="location-section">
                  <button 
                    onClick={handleGetLocation}
                    disabled={isGettingLocation || isLocationVerified}
                    className="location-button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0.75rem 1.5rem',
                      backgroundColor: isLocationVerified ? 'rgb(48 96 37)' : '#4CAF50',
                      marginBottom: '20px',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      placeSelf: 'center',
                      cursor: isLocationVerified ? 'not-allowed' : (isGettingLocation ? 'wait' : 'pointer'),
                      opacity: (isGettingLocation || isLocationVerified) ? 0.7 : 1
                    }}
                  >
                    <FiMapPin />
                    {isLocationVerified 
                      ? 'Location Verified' 
                      : (isGettingLocation ? 'Getting Location...' : 'Set My Location')}
                  </button>
                  {userLocation && (
                    <p style={{ fontSize: '0.9em', color: '#666', marginTop: '8px' }}>
                      Location set: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </>
            )}
            <h1>Intro</h1>
            <div className="intro">
              {isEditingIntro ? (
                <div className="editing-container">
                  <textarea
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                    rows={4}
                    autoFocus
                    className="input-expansion"
                    maxLength={50}
                  />
                  <div className="edit-buttons">
                    <button className="save-button" onClick={handleSaveIntro}>
                      Save
                    </button>
                    <button className="cancel-button" onClick={() => setIsEditingIntro(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p>{intro || "Add an intro..."}</p>
                  <div className="editbutton" onClick={() => setIsEditingIntro(true)}>
                    <img src={editbutton} alt="Edit Intro" />
                  </div>
                </>
              )}
            </div>

            <h1>Knows As</h1>
            <div className="knowas">
              {isEditingKnowAs ? (
                <div className="editing-container">
                  <textarea
                    value={knowAs}
                    onChange={(e) => setKnowAs(e.target.value)}
                    rows={4}
                    autoFocus
                    className="input-expansion"
                    maxLength={50}
                  />
                  <div className="edit-buttons">
                    <button className="save-button" onClick={handleSaveKnowAs}>
                      Save
                    </button>
                    <button className="cancel-button" onClick={() => setIsEditingKnowAs(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p>{knowAs || "Add what you're known as..."}</p>
                  <div className="editbutton1" onClick={() => setIsEditingKnowAs(true)}>
                    <img src={editbutton} alt="Edit Know As" />
                  </div>
                </>
              )}
            </div>

            <h1>Socials</h1>
            <div className="socials">
              {isEditingSocials ? (
                <div className="editing-container">
                  <div className="social-inputs">
                    <div className="social-input">
                      <img src={fb} alt="Facebook" />
                      <input
                        type="url"
                        value={socialLinks.facebook}
                        onChange={(e) => setSocialLinks(prev => ({...prev, facebook: e.target.value}))}
                        placeholder="Facebook URL"
                      />
                    </div>
                    <div className="social-input">
                      <img src={X} alt="Twitter" />
                      <input
                        type="url"
                        value={socialLinks.twitter}
                        onChange={(e) => setSocialLinks(prev => ({...prev, twitter: e.target.value}))}
                        placeholder="Twitter URL"
                      />
                    </div>
                    <div className="social-input">
                      <img src={Instagram} alt="Instagram" />
                      <input
                        type="url"
                        value={socialLinks.instagram}
                        onChange={(e) => setSocialLinks(prev => ({...prev, instagram: e.target.value}))}
                        placeholder="Instagram URL"
                      />
                    </div>
                  </div>
                  <div className="edit-buttons">
                    <button className="save-button" onClick={handleSaveSocials}>
                      Save
                    </button>
                    <button className="cancel-button" onClick={() => setIsEditingSocials(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="editbutton1" onClick={() => setIsEditingSocials(true)}>
                    <img src={editbutton} alt="Edit Socials" />
                  </div>
                  {socialLinks.facebook && (
                    <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer">
                      <img src={fb} alt="Facebook" />
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                      <img src={X} alt="Twitter" />
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                      <img src={Instagram} alt="Instagram" />
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="share-profile">
            <h1>Share this profile</h1>
            <p>Tell your friends about this user and help him to fulfill the dream.</p>
            <div className="link">
              <p>{profileLink}</p>
              <div className="copy-icon" onClick={handleCopyLink}>
                <img src={copyicon} alt="Copy Link" />
              </div>
              <div className="share-icon" onClick={handleShare}>
                <img src={shareicon} alt="Share Profile" />
              </div>
            </div>
          </div>
        </div>

        {userType === 'scholar' && <RemarksSection />}

        {isModalOpen && (
          <div className={`popup-overlay ${isClosing ? 'closing' : ''}`} onClick={closeModal}>
            <div className={`popup ${isClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
              <h2>Select a photo to change</h2>
              <div className="popup-buttons">
                {selectedPhotoType === "profile" && (
                  <button
                    onClick={() => {
                      document.getElementById("profile-photo-input")?.click();
                      closeModal();
                    }}
                  >
                    Change Profile Photo
                  </button>
                )}
                {selectedPhotoType === "cover" && (
                  <button
                    onClick={() => {
                      document.getElementById("cover-photo-input")?.click();
                      closeModal();
                    }}
                  >
                    Change Cover Photo
                  </button>
                )}
                <button onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {isReportCardModalOpen && (
          <div className="popup-overlay">
            <div className="popup report-card-popup">
              {!hasSubmittedReport ? (
                // Existing report card upload UI
                <>
                  <h2>Submit Report Card</h2>
                  <div className="report-card-upload-container">
                    <div className="report-card-side">
                      <h3>Front Side</h3>
                      <div className="report-card-upload-box">
                        {reportCardFront ? (
                          <div className="report-card-preview">
                            <img src={reportCardFront} alt="Report Card Front" />
                            <button onClick={() => setReportCardFront(null)}>Remove</button>
                          </div>
                        ) : (
                          <div className="upload-placeholder" onClick={() => document.getElementById('report-card-front')?.click()}>
                            <FiUpload size={24} />
                            <p>Upload Front Side</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="report-card-side">
                      <h3>Back Side</h3>
                      <div className="report-card-upload-box">
                        {reportCardBack ? (
                          <div className="report-card-preview">
                            <img src={reportCardBack} alt="Report Card Back" />
                            <button onClick={() => setReportCardBack(null)}>Remove</button>
                          </div>
                        ) : (
                          <div className="upload-placeholder" onClick={() => document.getElementById('report-card-back')?.click()}>
                            <FiUpload size={24} />
                            <p>Upload Back Side</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="popup-buttons">
                    <button 
                      onClick={handleSubmitReportCard} 
                      disabled={!reportCardFront || !reportCardBack || isSubmitting}
                      className="submit-button"
                    ></button>
                      {isSubmitting ? 'Submitting...' : 'Submit Report Card'}
                 
                    <button onClick={() => setIsReportCardModalOpen(false)} className="cancel-button">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                // Progress timeline view
                <>
                  <h2>Application Progress</h2>
                  <ProcessTimeline currentStep={verificationStep} />
                  <div className="popup-buttons">
                    <button onClick={() => setIsReportCardModalOpen(false)} className="cancel-button">
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {showFeedbackModal && currentFeedbackEvent && (
          <div className="popup-overlay feedback" onClick={handleCloseFeedback}>
            <div className="feedback-popup" onClick={e => e.stopPropagation()}>
              <span 
                className="modal-close" 
                onClick={handleCloseFeedback}
                title="Skip feedback"
              >×</span>
                
              </div>
              
              <h2>Event Feedback</h2>
              <p>Please share your experience at:<br/>{currentFeedbackEvent.title}</p>
              
              <div className="rating-container">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    className={`star-icon ${star <= rating ? 'selected' : ''}`}
                    size={32}
                    onClick={() => setRating(star)}
                    color={star <= rating ? "#ffc107" : "#e4e5e9"}
                  />
                ))}
              </div>
              
              <textarea
                className="feedback-textarea"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Tell us about your experience at this event..."
                rows={4}
              />
              
              <button 
                onClick={handleSubmitFeedback}
                disabled={rating === 0}
                className="feedback-submit-button"
              >
                Submit Feedback
              </button>
            </div>
        
        )}

        <input
          id="profile-photo-input"
          type="file"
          accept="image/*"
          onChange={handleProfilePhotoChange}
          style={{ display: "none" }}
        />
        <input
          id="cover-photo-input"
          type="file"
          accept="image/*"
          onChange={handleCoverPhotoChange}
          style={{ display: "none" }}
        />
        <input
          id="report-card-front"
          type="file"
          accept="image/*"
          onChange={(e) => handleReportCardImageUpload('front', e)}
          style={{ display: 'none' }}
        />
        <input
          id="report-card-back"
          type="file"
          accept="image/*"
          onChange={(e) => handleReportCardImageUpload('back', e)}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default VolunteerProfile;