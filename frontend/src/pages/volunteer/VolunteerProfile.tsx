import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { FiEdit, FiUpload, FiMapPin, FiMessageSquare, FiArrowRight } from 'react-icons/fi'; // Add FiArrowRight
import ProcessTimeline from '../../components/ProcessTimeline';
import { FaStar } from 'react-icons/fa';
import { ThemeSelector } from '../../components/ThemeSelector';

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

// Add this interface for grade level options
interface GradeLevelOption {
  value: string;
  label: string;
}

// Add these interfaces for sponsored scholars
interface ScholarDonation {
  id: number;
  scholar_id: number;
  scholar_first_name: string;
  scholar_last_name: string;
  scholar_image: string;
  profile_photo?: string;
  image_url?: string;
  amount: number;
  created_at: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  current_amount: number;
  amount_needed: number;
}

interface SponsoredScholar {
  scholarId: number;
  name: string;
  image: string;
  image_url?: string;
  profile_photo?: string;
  totalDonated: number;
  lastDonation: string;
  donations: ScholarDonation[];
  currentAmount: number;
  amountNeeded: number;
}

// Add this interface for joined events
interface JoinedEvent {
  id: number;
  title: string;
  date: string;
  image: string;
  status: string; // Event status: 'OPEN', 'CLOSED', etc.
  participation_status: string; // Participation status: 'PENDING', 'ACTIVE', etc. 
  location: string;
  is_past: boolean;
}

// Add this interface for distributions to a scholar
interface ItemDistribution {
  id: number;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  distributedAt: string;
  itemType: 'regular' | 'in-kind';
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
  
  // Add state for joined events
  const [joinedEvents, setJoinedEvents] = useState<JoinedEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  // Add state for events tab selection
  const [activeEventsTab, setActiveEventsTab] = useState<'upcoming' | 'past'>('upcoming');
  
  // Function to open the feedback modal
  const openFeedbackModal = () => {
    setShowFeedbackModal(true);
  };
  // Add grade level state
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('');
  // Add state for sponsored scholars
  const [sponsoredScholars, setSponsoredScholars] = useState<SponsoredScholar[]>([]);
  const [loadingScholars, setLoadingScholars] = useState(false);
  const navigate = useNavigate();

  // Add state for scholar distributions
  const [scholarDistributions, setScholarDistributions] = useState<ItemDistribution[]>([]);
  const [loadingDistributions, setLoadingDistributions] = useState(false);

  // Add grade level options
  const gradeLevelOptions: GradeLevelOption[] = [
    { value: 'grade1', label: 'Grade 1' },
    { value: 'grade2', label: 'Grade 2' },
    { value: 'grade3', label: 'Grade 3' },
    { value: 'grade4', label: 'Grade 4' },
    { value: 'grade5', label: 'Grade 5' },
    { value: 'grade6', label: 'Grade 6' },
    { value: 'grade7', label: 'Grade 7 (Junior High)' },
    { value: 'grade8', label: 'Grade 8 (Junior High)' },
    { value: 'grade9', label: 'Grade 9 (Junior High)' },
    { value: 'grade10', label: 'Grade 10 (Junior High)' },
    { value: 'grade11', label: 'Grade 11 (Senior High)' },
    { value: 'grade12', label: 'Grade 12 (Senior High)' },
    { value: 'college', label: 'College' }
  ];

  // Format amount helper function - update to handle invalid values
  const formatAmount = (amount: number | undefined | null) => {
    // Add safety check to prevent NaN
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0';
    }
    return Math.round(amount).toLocaleString();
  };

  // Helper function to get image url - updated to match StudentProfile.tsx approach
  const getImageUrl = (scholar: SponsoredScholar) => {
    // First check for direct image property
    if (scholar.image) {
      if (scholar.image.startsWith('data:') || scholar.image.startsWith('http')) {
        return scholar.image;
      }
      return `${import.meta.env.VITE_API_URL}${scholar.image}`;
    }
    
    // Then check for image_url from scholars table
    if (scholar.image_url) {
      if (scholar.image_url.startsWith('data:') || scholar.image_url.startsWith('http')) {
        return scholar.image_url;
      }
      return `${import.meta.env.VITE_API_URL}${scholar.image_url}`;
    }
    
    // Then check for profile_photo from users table
    if (scholar.profile_photo) {
      if (scholar.profile_photo.startsWith('data:') || scholar.profile_photo.startsWith('http')) {
        return scholar.profile_photo;
      }
      return `${import.meta.env.VITE_API_URL}${scholar.profile_photo}`;
    }
    
    // Default placeholder
    return '/images/default-avatar.jpg';
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const fetchLatestUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Get the latest user profile data
        const response = await api.get('/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data) {
          // Update localStorage with the latest user data
          localStorage.setItem('user', JSON.stringify(response.data));
          
          // Update state with the latest data
          setUserName(response.data.name);
          setUserUsername(response.data.username);
          setUserData(response.data);
          setUserType(response.data.role?.toLowerCase() || '');
          if (response.data.profilePhoto) setProfilePhoto(response.data.profilePhoto);
          if (response.data.coverPhoto) setCoverPhoto(response.data.coverPhoto);
          if (response.data.intro) setIntro(response.data.intro);
          if (response.data.knownAs) setKnowAs(response.data.knownAs);
          setSocialLinks({
            facebook: response.data.facebookUrl || '',
            twitter: response.data.twitterUrl || '',
            instagram: response.data.instagramUrl || ''
          });
          setHasSubmittedReport(response.data.hasSubmittedReport || false);
          setVerificationStep(response.data.verificationStep || 1);
          if (response.data.latitude && response.data.longitude) {
            setUserLocation({
              latitude: response.data.latitude,
              longitude: response.data.longitude
            });
          }
        }
      } catch (error) {
        console.error('Error fetching latest user data:', error);
      }
    };

    // Using the storedUser variable already declared above
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
      
      // After setting initial state from localStorage, fetch the latest data
      fetchLatestUserData();
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

        const reportCard = submissionResponse.data;
        
        setHasActiveSubmission(!!activeResponse.data);
        setHasSubmittedReport(!!reportCard && reportCard.status !== 'renewal_requested');
        
        // If there's a submission, set the verification step
        if (reportCard) {
          setVerificationStep(reportCard.verification_step || 1);
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

  // Add this effect to fetch sponsored scholars for sponsor users
  useEffect(() => {
    if (userType === 'sponsor') {
      const fetchSponsoredScholars = async () => {
        try {
          setLoadingScholars(true);
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const response = await api.get(`/scholardonations/sponsor/${user.id}`);
          console.log('Raw donation data:', response.data);
          
          const donations: ScholarDonation[] = response.data;
          
          // Group donations by scholar
          const scholarMap = new Map<number, SponsoredScholar>();
          
          donations.forEach(donation => {
            if (!scholarMap.has(donation.scholar_id)) {
              scholarMap.set(donation.scholar_id, {
                scholarId: donation.scholar_id,
                name: `${donation.scholar_first_name} ${donation.scholar_last_name}`,
                image: donation.scholar_image || '',
                profile_photo: donation.profile_photo || '',
                image_url: donation.image_url || '',
                totalDonated: 0, // Initialize as number
                lastDonation: donation.created_at,
                donations: [],
                currentAmount: parseFloat(donation.current_amount as any) || 0,
                amountNeeded: parseFloat(donation.amount_needed as any) || 10000
              });
            }
            
            const scholar = scholarMap.get(donation.scholar_id)!;
            
            // Parse donation amount as a number to avoid NaN
            if (donation.verification_status === 'verified') {
              const amount = typeof donation.amount === 'string' 
                ? parseFloat(donation.amount) 
                : (typeof donation.amount === 'number' ? donation.amount : 0);
                
              // Ensure we're adding a valid number
              if (!isNaN(amount)) {
                scholar.totalDonated += amount;
              }
            }
            scholar.donations.push(donation);
          });
          
          // Log for debugging
          const scholars = Array.from(scholarMap.values());
          console.log('Processed scholars with donation totals:', 
            scholars.map(s => ({
              id: s.scholarId, 
              name: s.name, 
              totalDonated: s.totalDonated
            }))
          );
          
          // Show up to 6 scholars
          setSponsoredScholars(scholars.slice(0, 6)); 
          setLoadingScholars(false);
        } catch (error) {
          console.error('Error fetching sponsor donations:', error);
          setLoadingScholars(false);
        }
      };

      fetchSponsoredScholars();
    }
  }, [userType]);

  // Add this effect to fetch pending feedback events
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

  // Add this effect to fetch joined events for volunteers
  useEffect(() => {
    const fetchJoinedEvents = async () => {
      if (userType !== 'volunteer') return;
      
      try {
        setLoadingEvents(true);
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        const response = await api.get(`/events/user/${user.id}/joined`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setJoinedEvents(response.data);
      } catch (error) {
        console.error('Error fetching joined events:', error);
      } finally {
        setLoadingEvents(false);
      }
    };
    
    if (userType === 'volunteer') {
      fetchJoinedEvents();
    }
  }, [userType]);

  // Update this effect to fetch items distributed to a scholar with better error handling
  useEffect(() => {
    const fetchScholarDistributions = async () => {
      if (userType !== 'scholar') return;
      
      try {
        setLoadingDistributions(true);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('token');
        
        // Add debugging logs
        console.log('Fetching distributions for scholar ID:', user.id);
        
        if (!user.id) {
          console.log('No user ID found, skipping distribution fetch');
          setLoadingDistributions(false);
          return;
        }
        
        // Fetch distributions for this scholar with proper token and error handling
        try {
          const response = await api.get(`/inventory/recipient-distributions/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('Scholar distributions data:', response.data);
          setScholarDistributions(Array.isArray(response.data) ? response.data : []);
        } catch (apiError) {
          console.error('API Error:', apiError);
          // On API error, just set empty array to avoid breaking the UI
          setScholarDistributions([]);
        }
      } catch (error) {
        console.error('Error in distribution fetch logic:', error);
        setScholarDistributions([]);
      } finally {
        setLoadingDistributions(false);
      }
    };
    
    if (userType === 'scholar') {
      fetchScholarDistributions();
    }
  }, [userType]);

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

    if (!selectedGradeLevel) {
      alert('Please select your grade level');
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
          backImage: reportCardBack,
          gradeLevel: selectedGradeLevel // Add grade level to the payload
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
      setSelectedGradeLevel(''); // Reset grade level

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

  const handleCloseFeedback = () => {
    // Add current event to dismissed list
    if (currentFeedbackEvent) {
      setDismissedFeedback(prev => new Set([...prev, currentFeedbackEvent.id]));
    }
    
    // Close the modal
    setShowFeedbackModal(false);
    
    // Move to next event if available
    const remainingEvents = pendingFeedbackEvents.filter(
      event => event.id !== currentFeedbackEvent?.id && !dismissedFeedback.has(event.id)
    );
    
    if (remainingEvents.length > 0) {
      setCurrentFeedbackEvent(remainingEvents[0]);
      // Reset form
      setRating(0);
      setFeedbackComment("");
    } else {
      setCurrentFeedbackEvent(null);
    }
  };

  // Add ScholarProgressBar component
  const ScholarProgressBar: React.FC<{ currentAmount: number; amountNeeded: number }> = ({ currentAmount, amountNeeded }) => {
    const percentage = Math.min((currentAmount / amountNeeded) * 100, 100);
    
    return (
      <div className="scholar-progress-container">
        <div className="scholar-progress-bar">
          <div 
            className="scholar-progress-fill" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="scholar-progress-text">
          <span>₱{formatAmount(currentAmount)}</span>
          <span>Goal: ₱{formatAmount(amountNeeded)}</span>
        </div>
      </div>
    );
  };

  // Format date helper function
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Add this component to render the distribution items for a scholar with better styling
  const ScholarDistributionsSection = () => {
    if (userType !== 'scholar') return null;
    
    return (
      <div className="scholar-distributions-container">
        <h2 className="distributions-header">Items Received</h2>
        
        {loadingDistributions ? (
          <div className="distributions-loading-container">
            <div className="loading-spinner"></div>
            <p>Loading items...</p>
          </div>
        ) : scholarDistributions && scholarDistributions.length > 0 ? (
          <>
            <div className="distributions-list">
              {scholarDistributions.map((item) => (
                <div key={item.id} className="distribution-item">
                  <div className="distribution-header">
                    <h3>{item.itemName}</h3>
                    <span className={`distribution-category category-${item.category?.toLowerCase().replace(/\s+/g, '-') || 'other'}`}>
                      {item.category || 'Other'}
                    </span>
                  </div>
                  <div className="distribution-details">
                    <p>
                      <strong>Quantity:</strong> 
                      <span>{item.quantity} {item.unit}</span>
                    </p>
                    <p>
                      <strong>Received:</strong> 
                      <span>{formatDate(item.distributedAt)}</span>
                    </p>
                    <div className={`distribution-type ${item.itemType}`}>
                      {item.itemType === 'regular' ? 'Regular Donation' : 'In-kind Donation'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="no-distributions-container">
            <p className="no-distributions-text">
              You haven't received any items yet.
            </p>
          
          </div>
        )}
      </div>
    );
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
                  {hasActiveSubmission ? (
                    <button 
                      onClick={handleViewProgress}
                      className="view-progress-button"
                    >
                      View Progress
                    </button>
                  ) : hasSubmittedReport ? (
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
                    <div className="save-button-intro" onClick={handleSaveIntro}>
                      Save
                    </div>
                    <div className="cancel-button-intro" onClick={() => setIsEditingIntro(false)}>
                      Cancel
                    </div>
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
                    <div className="save-button-knowas" onClick={handleSaveKnowAs}>
                      Save
                    </div>
                    <div className="cancel-button-knowas" onClick={() => setIsEditingKnowAs(false)}>
                      Cancel
                    </div>
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

            <h1>Theme</h1>
            <ThemeSelector />

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
                    <div className="save-button-socials" onClick={handleSaveSocials}>
                      Save
                    </div>
                    <div className="cancel-button-socials" onClick={() => setIsEditingSocials(false)}>
                      Cancel
                    </div>
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

          {userType === 'sponsor' && (
            <div className="my-scholars-container">
              <h2 className="my-scholars-header">
                My Scholars 
                <span 
                  onClick={() => navigate('/MyScholar')}
                  className="view-all-button"
                >
                  View All <FiArrowRight className="arrow-icon" />
                </span>
              </h2>

              {loadingScholars ? (
                <div className="scholars-loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading scholars...</p>
                </div>
              ) : sponsoredScholars.length > 0 ? (
                <div className="scholars-grid">
                  {sponsoredScholars.map((scholar) => (
                    <div 
                      key={scholar.scholarId}
                      className="scholar-card"
                      onClick={() => navigate(`/StudentProfile/${scholar.scholarId}`)}
                    >
                      <div className="scholar-profile">
                        <img
                          src={getImageUrl(scholar)}
                          alt={scholar.name}
                          className="scholar-avatar"
                          onError={(e) => {
                            console.log(`Image failed to load for scholar ${scholar.scholarId}`);
                            (e.target as HTMLImageElement).src = '/images/default-avatar.jpg';
                          }}
                        />
                        <h3 className="scholar-name">{scholar.name}</h3>
                      </div>
                      
                      <ScholarProgressBar 
                        currentAmount={scholar.currentAmount} 
                        amountNeeded={scholar.amountNeeded}
                      />
                      
                      <div className="scholar-metrics">
                        <div className="donation-amount">
                          ₱{formatAmount(scholar.totalDonated)}
                        </div>
                        <div className="last-donation">
                          Last Donation: {new Date(scholar.lastDonation).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-scholars-container">
                  <p className="no-scholars-text">
                    You haven't sponsored any scholars yet.
                  </p>
                  <button 
                    onClick={() => navigate('/StudentProfile')}
                    className="browse-scholars-button"
                  >
                    Browse Scholars
                  </button>
                </div>
              )}
            </div>
          )}
          
          {userType === 'volunteer' && (
            <div className="volunteer-events-history">
              <h2 className="events-history-header">My Events</h2>
              
              {loadingEvents ? (
                <div className="events-loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading events...</p>
                </div>
              ) : joinedEvents.length > 0 ? (
                <div>
                  {/* Event Tabs */}
                  <div className="events-tabs">
                    <button 
                      className={`event-tab-button ${activeEventsTab === 'upcoming' ? 'active' : ''}`}
                      onClick={() => setActiveEventsTab('upcoming')}
                    >
                      Upcoming Events
                      {joinedEvents.filter(event => !event.is_past).length > 0 && (
                        <span className="event-count">{joinedEvents.filter(event => !event.is_past).length}</span>
                      )}
                    </button>
                    <button 
                      className={`event-tab-button ${activeEventsTab === 'past' ? 'active' : ''}`}
                      onClick={() => setActiveEventsTab('past')}
                    >
                      Past Events
                      {joinedEvents.filter(event => event.is_past).length > 0 && (
                        <span className="event-count">{joinedEvents.filter(event => event.is_past).length}</span>
                      )}
                    </button>
                  </div>
                  
                  {/* Upcoming Events Tab Content */}
                  {activeEventsTab === 'upcoming' && (
                    <div className="events-tab-content">
                      {joinedEvents.filter(event => !event.is_past).length > 0 ? (
                        <div className="events-grid">
                          {joinedEvents
                            .filter(event => !event.is_past)
                            .map((event) => (
                              <div 
                                key={event.id}
                                className="event-card"
                                onClick={() => navigate(`/event/${event.id}`)}
                              >
                                <img 
                                  src={event.image || '/images/default-event.jpg'} 
                                  alt={event.title} 
                                  className="event-image"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/default-event.jpg';
                                  }}
                                />
                                <div className="event-info">
                                  <h3 className="event-title">{event.title}</h3>
                                  <p className="event-location">{event.location}</p>
                                  <p className="event-date">{new Date(event.date).toLocaleDateString()}</p>
                                  <div className="status-badges">
                                    <span className={`participation-status status-${event.participation_status.toLowerCase()}`}>
                                      {event.participation_status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="no-tab-events">
                          <p>You don't have any upcoming events.</p>
                          <button 
                            onClick={() => navigate('/events')}
                            className="browse-events-button small"
                          >
                            Browse Events
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Past Events Tab Content */}
                  {activeEventsTab === 'past' && (
                    <div className="events-tab-content">
                      {joinedEvents.filter(event => event.is_past).length > 0 ? (
                        <div className="events-grid">
                          {joinedEvents
                            .filter(event => event.is_past)
                            .map((event) => (
                              <div 
                                key={event.id}
                                className="event-card past-event"
                                // Remove onClick for past events - make non-clickable
                              >
                                <img 
                                  src={event.image || '/images/default-event.jpg'} 
                                  alt={event.title} 
                                  className="event-image"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/default-event.jpg';
                                  }}
                                />
                                <div className="event-info">
                                  <h3 className="event-title">{event.title}</h3>
                                  <p className="event-location">{event.location}</p>
                                  <p className="event-date">{new Date(event.date).toLocaleDateString()}</p>
                                  <div className="status-badges">
                                    {/* Always show INACTIVE status for past events */}
                                    <span className="participation-status status-inactive">
                                      INACTIVE
                                    </span>
                                  </div>
                                </div>
                                <div className="past-event-overlay">
                                  <span>This event has ended</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="no-tab-events">
                          <p>You don't have any past events.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-events-container">
                  <p className="no-events-text">
                    You haven't joined any events yet.
                  </p>
                  <button 
                    onClick={() => navigate('/events')}
                    className="browse-events-button"
                  >
                    Browse Events
                  </button>
                </div>
              )}
            </div>
          )}
          
          {userType === 'scholar' && (
            <ScholarDistributionsSection />
          )}
          
          {userType !== 'sponsor' && userType !== 'scholar' && userType !== 'volunteer' && (
            <div className="profile-empty-space">
              <h2>Thank you for being a part of our community!</h2>
              <p>Help us make a difference by participating in events and supporting our mission.</p>
            </div>
          )}
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
                  
                  {/* Add grade level selection */}
                  <div className="report-card-grade-level">
                    <h3>Select Your Grade Level</h3>
                    <select 
                      value={selectedGradeLevel} 
                      onChange={(e) => setSelectedGradeLevel(e.target.value)}
                      className="grade-level-dropdown"
                    >
                      <option value="">Select Grade Level</option>
                      {gradeLevelOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
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
                    <div 
                      onClick={handleSubmitReportCard} 
                      className={`submit-button-report ${(!reportCardFront || !reportCardBack || !selectedGradeLevel || isSubmitting) ? 'disabled' : ''}`}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Report Card'}
                    </div>
                    
                    <div onClick={() => setIsReportCardModalOpen(false)} className="cancel-button-report">
                      Cancel
                    </div>
                  </div>
                </>
              ) : (
                // Progress timeline view
                <>
                  <h2>Application Progress</h2>
                  <ProcessTimeline currentStep={verificationStep} />
                  <div className="popup-buttons">
                    <div onClick={() => setIsReportCardModalOpen(false)} className="close-button-progress">
                      Close
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

    {showFeedbackModal && currentFeedbackEvent && (
      <div className="popup-overlay feedback">
        <div className="feedback-popup" onClick={e => e.stopPropagation()}>
          <span 
            className="modal-close" 
            onClick={handleCloseFeedback}
            title="Skip feedback"
          >×</span>
          
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

