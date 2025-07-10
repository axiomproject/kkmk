import React, { useState, useEffect } from "react"; // Add useRef
import { useParams, useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaCalendarAlt, FaClock, FaPhoneAlt, FaEnvelope, FaTimes } from "react-icons/fa";
import api from '../../config/axios'; // Replace axios import
import { motion, AnimatePresence } from "framer-motion";
import "../../styles/EventDetails.css";
import { useAuth } from '../../hooks/useAuth';  // Add this import
import  kmlogo1 from '../../img/kmlogo1.png'; 

interface Event {
  id: number;
  title: string;
  date: string;
  location: string;
  image: string;
  description: string;
  totalVolunteers: number;
  currentVolunteers: number;
  totalScholars: number;     // Add these new fields
  currentScholars: number;   // Add these new fields
  status: string;
  contact: {
    phone: string;
    email: string;
  };
  startTime: string;
  endTime: string;
  requirements?: string; // Add new field
}

const EventDetails: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate(); // Add this hook
  const { user } = useAuth(); // Add this hook
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [participantStatus, setParticipantStatus] = useState<string>('');
  // Add new state variable for rejection status
  const [isRejected, setIsRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  
  // Add state for requirements modal
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  
  // Remove previous scroll tracking approach
  // const [scrollY, setScrollY] = useState(0);
  // const modalRef = useRef<HTMLDivElement>(null);
  // const scrollThreshold = 300; // Adjust this value as needed

  // We don't need to track scroll position globally since we capture it when needed
  useEffect(() => {
    // Empty effect to maintain component structure
  }, []);

  // Updated function to properly handle image paths
  const getImageUrl = (path: string | null) => {
    if (!path) return '/images/default-event.png';
    
    // Return the image URL if it's a Cloudinary URL or any other full URL
    if (path.startsWith('http')) return path;
    
    // Default fallback
    return '/images/default-event.png';
  };

  // Update fetchEventDetails to use the public endpoint
  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Use the public endpoint without auth requirements - notice no /api or /admin prefix
      const response = await api.get(`/events/${eventId}`);
      console.log('Raw event data:', response.data);
      
      // Process the image URL properly
      const imagePath = response.data.image;
      const processedImageUrl = getImageUrl(imagePath);
      console.log('Processed image URL:', processedImageUrl);
      
      const eventData = {
        ...response.data,
        image: processedImageUrl,
        totalVolunteers: parseInt(response.data.total_volunteers) || 0,
        currentVolunteers: parseInt(response.data.current_volunteers) || 0,
        totalScholars: parseInt(response.data.total_scholars) || 0,
        currentScholars: parseInt(response.data.current_scholars) || 0,
        contact: {
          phone: response.data.contact_phone || response.data.contact?.phone || '',
          email: response.data.contact_email || response.data.contact?.email || ''
        },
        startTime: response.data.start_time || '',
        endTime: response.data.end_time || '',
        requirements: response.data.requirements || 'No specific requirements have been set for this event.'
      };
      
      setEvent(eventData);
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      setError('Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  // Update checkParticipation to handle unauthenticated users and fix route paths
  const checkParticipation = async () => {
    if (!user) return; // Exit early if no user logged in
    
    try {
      // Fix the route path - removing the duplicate /api prefix
      const rejectionResponse = await api.get(`/events/${eventId}/check-rejection`);
      if (rejectionResponse.data.isRejected) {
        setIsRejected(true);
        setRejectionReason(rejectionResponse.data.reason || 'No specific reason provided.');
        return; // Exit early if user is rejected
      }

      // Fix the route path - removing the duplicate /api prefix
      const response = await api.get(`/events/${eventId}/check-participation`);
      setHasJoined(response.data.hasJoined);
      setParticipantStatus(response.data.status || '');
    } catch (error) {
      console.error('Failed to check participation status:', error);
      // Don't set any error state for participation check failures
      // as this could be a normal condition for unauthenticated users
    }
  };

  useEffect(() => {
    if (user && eventId) {
      checkParticipation();
    }
  }, [user, eventId]);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  // Add effect to recheck status after joining
  useEffect(() => {
    if (user && eventId && !isJoining) {
      checkParticipation();
    }
  }, [isJoining]); // This will run after joining process completes

  // Add new useEffect to monitor auth changes
  useEffect(() => {
    if (user && eventId) {
      checkParticipation();
    }
  }, [user?.id, eventId]); // Add user.id as dependency

  const formatDateForDisplay = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatTimeForDisplay = (time24h: string) => {
    if (!time24h) return '';
    const [hours, minutes] = time24h.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getDisplayTime = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 'Time to be announced';
    
    const formattedStartTime = formatTimeForDisplay(startTime);
    const formattedEndTime = formatTimeForDisplay(endTime);
    
    return `${formattedStartTime} - ${formattedEndTime}`;
  };

  const getDaysLeft = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleVolunteerSignUp = async () => {
    if (!user) {
      navigate('/register', { 
        state: { 
          preselectedRole: 'volunteer',
          eventId: eventId 
        }
      });
      return;
    }

    // Capture scroll position and set CSS variable - similar to Community.tsx
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
    
    // Show requirements modal for both volunteers and scholars
    setShowRequirementsModal(true);
  };

  // Add new function to handle the actual join process
  const handleJoinConfirm = async () => {
    try {
      setIsJoining(true);
      setJoinError(null);
      
      console.log('Joining event with user role:', user?.role);
      
      try {
        // Ensure we always send the user role in the request body
        const response = await api.post(`/events/${eventId}/join`, {
          role: user?.role || 'volunteer' // Default to volunteer if role is somehow missing
        });

        // Update local event data with new volunteer/scholar count
        if (event) {
          const updatedEvent = response.data.event;
          setEvent({
            ...event,
            currentVolunteers: updatedEvent.current_volunteers,
            currentScholars: updatedEvent.current_scholars
          });
        }

        console.log('Join response:', response.data);
        await fetchEventDetails();
        await checkParticipation(); // Add immediate check after joining
        setHasJoined(true);
        
        // Reset modal state
        setShowRequirementsModal(false);
        setTermsAgreed(false);
      } catch (error: any) {
        console.error('Failed to join event:', error.response || error);
        
        // Check if this is a rejection error (status 403 with specific message)
        if (error.response?.status === 403 && 
            error.response?.data?.error?.includes('cannot join this event because your previous request was declined')) {
          setIsRejected(true);
          setRejectionReason(error.response.data.reason || 'Your previous request to join was declined by an administrator.');
          setJoinError('You cannot join this event because your previous request was declined.');
        } else {
          // Handle other errors
          setJoinError(error.response?.data?.error || 'Failed to join event');
        }
      }
    } finally {
      setIsJoining(false);
    }
  };

  // Replace the entire handleUnjoinEvent function with this completely reworked version
  const handleUnjoinEvent = async () => {
    try {
      // First set joining state to true to disable the button
      setIsJoining(true);
      
      // IMMEDIATELY update UI state - don't wait for the response
      // This is an optimistic update so user sees immediate feedback
      setHasJoined(false);
      setParticipantStatus('');
      
      console.log('Starting unjoin process - UI already updated');
      
      // Always send the role in the request body
      const response = await api.post(`/events/${eventId}/unjoin`, {
        role: user?.role || 'volunteer'
      }).catch(error => {
        // If we get "you have not joined this event" error, ignore it
        // This can happen if the backend state is already updated
        if (error.response?.data?.error === 'You have not joined this event') {
          console.log('Got expected "not joined" error - ignoring');
          return { data: { message: 'Already left event', success: true } };
        }
        // For other errors, rethrow
        throw error;
      });

      console.log('Unjoin response received:', response.data);

      // Update local event data with new volunteer/scholar count if available
      if (event && response.data.event) {
        const updatedEvent = response.data.event;
        console.log('Updating event counts with:', {
          volunteers: updatedEvent.current_volunteers,
          scholars: updatedEvent.current_scholars
        });
        
        setEvent(prev => {
          if (!prev) return null;
          return {
            ...prev,
            currentVolunteers: updatedEvent.current_volunteers,
            currentScholars: updatedEvent.current_scholars
          };
        });
      }
      
      // Force reload the page to ensure everything is in a fresh state
      // This is the most reliable way to fix the stubborn UI issues
      window.location.reload();
      
    } catch (error: any) {
      console.error('Failed to unjoin event:', error.response || error);
      
      // If there was an error, revert our optimistic UI update
      setHasJoined(true);
      
      // Check if it's the "not joined" error, which we can ignore silently
      if (error.response?.data?.error === 'You have not joined this event') {
        console.log('Got "not joined" error during catch - forcing reload');
        window.location.reload();
        return;
      }
      
      // Display error message for other errors
      setJoinError(error.response?.data?.error || 'Failed to unjoin event');
    } finally {
      // Set joining false after a short delay
      setTimeout(() => {
        setIsJoining(false);
      }, 300);
    }
  };

  // Add this console.log to debug
  useEffect(() => {
    console.log('Current user:', user);
  }, [user]);

  // Update the buttonText function to properly handle scholar role
  const buttonText = () => {
    console.log('Button state:', { 
      hasJoined, 
      participantStatus, 
      isJoining, 
      isRejected 
    });
    
    if (!event) return '';
    if (isRejected) return 'Joining Restricted';
    if (event.status === 'CLOSED') return 'Event Closed';
    if (volunteersNeeded <= 0 && scholarsNeeded <= 0 && !hasJoined) return 'Fully Booked';
    if (hasJoined) {
      if (participantStatus === 'PENDING') return 'Pending Approval';
      return 'Leave Event';
    }
    if (!user) return 'Sign Up';
    if (user.role === 'sponsor') {
      return 'Contact Admin';
    }
    return 'Join';
  };

  // Add a new useEffect to detect if leave button was pressed
  useEffect(() => {
    if (!isJoining && !hasJoined) {
      console.log('Leave button was pressed. Current state:', { 
        hasJoined, 
        participantStatus,
        isJoining
      });
    }
  }, [isJoining, hasJoined]);

  // Update handleButtonClick to handle the leave click better
  const handleButtonClick = () => {
    // If user has been rejected, show the rejection reason
    if (isRejected) {
      alert(`You cannot join this event. ${rejectionReason}`);
      return;
    }
    
    // Update this condition to only restrict sponsors, not scholars
    if (user && user.role === 'sponsor') {
      // You can customize this message or action
      alert('Please contact the admin if you would like to join this event.');
      return;
    }

    // Always redirect non-authenticated users to register
    if (!user) {
      navigate('/register', { 
        state: { 
          preselectedRole: 'volunteer',
          eventId: eventId 
        }
      });
      return;
    }

    // Only allow leaving if status is not PENDING
    if (hasJoined) {
      if (participantStatus === 'PENDING') {
        alert('Your registration is pending approval. Please wait for admin confirmation.');
        return;
      }
      
      console.log('Leave button clicked, hasJoined =', hasJoined);
      
      // Add confirmation before leaving the event
      const confirmLeave = window.confirm("Are you sure you want to leave this event?");
      if (confirmLeave) {
        console.log('Leave confirmed, calling handleUnjoinEvent');
        
        // Visibly change the button text immediately for better UX
        const button = document.querySelector('.volunteer-button2');
        if (button) {
          button.textContent = 'Leaving...';
          button.classList.add('leaving');
          button.setAttribute('disabled', 'true');
        }
        
        handleUnjoinEvent();
      }
    } else {
      // Show modal instead of directly joining
      handleVolunteerSignUp();
    }
  };

  // Format requirements for display - improve this function
const formatRequirements = (requirements: string) => {
  if (!requirements) return 'No specific requirements for this event.';
  
  // Check if the string already contains bullet points or numbering
  if (requirements.includes('•') || /\d+\./.test(requirements)) {
    // If it already has formatting, respect it and split by newlines
    const lines = requirements.split('\n').filter(line => line.trim() !== '');
    
    return (
      <ul className="requirements-list">
        {lines.map((line, index) => (
          <li key={index}>{line.trim()}</li>
        ))}
      </ul>
    );
  }
  
  // If it doesn't have bullet points, check if it contains newlines
  if (requirements.includes('\n')) {
    // Split by newlines for items that are already on separate lines
    const lines = requirements.split('\n').filter(line => line.trim() !== '');
    
    return (
      <ul className="requirements-list">
        {lines.map((line, index) => (
          <li key={index}>{line.trim()}</li>
        ))}
      </ul>
    );
  }
  
  // If there are no newlines or bullets, check if we can split by common separators
  if (requirements.includes(';') || requirements.includes(',')) {
    const separator = requirements.includes(';') ? ';' : ',';
    const items = requirements.split(separator).filter(item => item.trim() !== '');
    
    return (
      <ul className="requirements-list">
        {items.map((item, index) => (
          <li key={index}>{item.trim()}</li>
        ))}
      </ul>
    );
  }
  
  // If we can't determine formatting, just return as a single paragraph
  return <p>{requirements}</p>;
};

  if (isLoading) return <div>Loading event details...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!event) return <div>Event not found</div>;

  const volunteerProgress = Math.min((event.currentVolunteers / event.totalVolunteers) * 100, 100);
  const scholarProgress = Math.min((event.currentScholars / event.totalScholars) * 100, 100);
  const volunteersNeeded = Math.max(event.totalVolunteers - event.currentVolunteers, 0);
  const scholarsNeeded = Math.max(event.totalScholars - event.currentScholars, 0);
  const daysLeft = getDaysLeft(event.date);

  // Add this new helper function to check if user can view scholar info
  const canViewScholarInfo = () => {
    if (!user) return false;
    return user.role === 'scholar' || user.role === 'admin' || user.role === 'staff';
  };

  return (
    <motion.div 
      className="event-details-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="event-header">
        <div className="event-header-left">
          <h1 className="event-title">{event.title}</h1>
        </div>
        <div className="event-header-right">
          {/* Desktop logo */}
          <img
            src="https://kmpayatasb.org/wp-content/uploads/2024/01/KM-Logo-Final-2-01.png"
            alt="Organization Logo"
            className="organization-logo"
          />
          {/* Mobile KM icon */}

          <img
            src={kmlogo1} // Use the imported image
            alt="KM Icon"
            className="organization-logo-mobile"
          />
        </div>
      </div>

      <div className="event-main">
        <div className="event-image-container">
          <img 
            src={event?.image || '/images/default-event.png'} 
            alt={event?.title} 
            className="event-image2"
            onError={(e) => {
              console.error(`Failed to load image: ${event?.image}`);
              const target = e.target as HTMLImageElement;
              target.src = '/images/default-event.png';
              target.onerror = null; // Prevent infinite loop
            }}
          />
          <div className="event-date-type">
            <p>
              <strong>{formatDateForDisplay(event.date)}</strong> | Volunteer Event
            </p>
          </div>
        </div>

        <div className="event-details-card-details">
          <p className="event-details-info-side"><FaMapMarkerAlt style={{ marginRight: "5px" }} /> {event.location}</p>
          <p className="event-details-info-side"><FaCalendarAlt style={{ marginRight: "5px" }} /> {formatDateForDisplay(event.date)}</p>
          <p className="event-details-info-side"><FaClock style={{ marginRight: "5px" }} /> {getDisplayTime(event.startTime, event.endTime)}</p>
          <p className="event-details-info-side"><FaPhoneAlt style={{ marginRight: "5px" }} /> {event.contact.phone || 'No phone provided'}</p>
          <p className="event-details-info-side"><FaEnvelope style={{ marginRight: "5px" }} /> {event.contact.email || 'No email provided'}</p>
          <p className="event-details-info-side"><strong>Status:</strong> {event.status}</p>
          <div className="event-details-info-side">
            <strong>Volunteer Progress:</strong>
            <div className="progress-bar-container">
              <div 
                className="progress-bar volunteer-progress"
                style={{ width: `${volunteerProgress}%` }}
              >
                <span className="progress-percentage">
                  {volunteerProgress < 5 ? '' : `${Math.round(volunteerProgress)}%`}
                </span>
              </div>
            </div>
          </div>
          <p className="event-details-info-side">
            <strong>Volunteers Needed:  {volunteersNeeded > 0 ? volunteersNeeded : "Goal Reached!"}</strong>{" "}
           
          </p>
          {/* Scholar progress section - only visible to scholars and admin/staff */}
          {canViewScholarInfo() && (
            <>
              <div className="event-details-info-side">
                <strong>Scholar Progress:</strong>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar scholar-progress"
                    style={{ width: `${scholarProgress}%` }}
                  >
                    <span className="progress-percentage">
                      {scholarProgress < 5 ? '' : `${Math.round(scholarProgress)}%`}
                    </span>
                  </div>
                </div>
              </div>
              <p className="event-details-info-side">
                <strong>Scholars Needed: {scholarsNeeded > 0 ? scholarsNeeded : "Goal Reached!"}</strong>
              </p>
            </>
          )}
          {(volunteersNeeded > 0 || (canViewScholarInfo() && scholarsNeeded > 0)) ? (
            daysLeft > 0 && (
              <p>{daysLeft} Days Left to join</p>
            )
          ) : (
            <p><strong>Thank you!</strong> We've reached our volunteer{canViewScholarInfo() ? ' and scholar' : ''} goals</p>
          )}
          {isRejected && (
            <div className="event-rejection-message">
              <p>You cannot join this event because your previous request was declined.</p>
              {rejectionReason && <p><strong>Reason:</strong> {rejectionReason}</p>}
            </div>
          )}
          <button 
            className={`volunteer-button2 ${hasJoined ? (participantStatus === 'PENDING' ? 'pending-button' : 'leave-button') : 
              isRejected ? 'rejected-button' : ''}`}
            disabled={event.status === 'CLOSED' || (volunteersNeeded <= 0 && !hasJoined) || 
              isJoining || (hasJoined && participantStatus === 'PENDING') || isRejected}
            onClick={handleButtonClick}
          >
            {isJoining ? (hasJoined ? 'Leaving...' : 'Joining...') : buttonText()}
          </button>
          {joinError && <p className="error-message">{joinError}</p>}
        </div>
      </div>

      <div className="event-description">
        <h3>{event.title}</h3>
        <p>{event.description}</p>
      </div>

      {/* Requirements Modal */}
      <AnimatePresence>
        {showRequirementsModal && (
          <motion.div 
            className="requirements-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="requirements-modal-content"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                transition: { 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30 
                }
              }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="requirements-modal-header">
                <h2>Event Requirements</h2>
                <button 
                  className="requirements-modal-close" 
                  onClick={() => setShowRequirementsModal(false)}
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="requirements-modal-body">
                <p>Before joining this event, please review the following requirements:</p>
                
                {typeof event.requirements === 'string' ? (
                  formatRequirements(event.requirements)
                ) : (
                  <p>No specific requirements for this event.</p>
                )}
                
                <div className="agreement-checkbox">
                  <input 
                    type="checkbox" 
                    id="terms-agreement" 
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                  />
                  <label htmlFor="terms-agreement">
                    I agree that I meet all the requirements and will adhere to the guidelines 
                    set for this event. I understand that if I do not meet these requirements, 
                    my participation may be revoked.
                  </label>
                </div>
              </div>
              
              <div className="modal-buttons">
                <button 
                  className="modal-button modal-button-cancel"
                  onClick={() => setShowRequirementsModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className={`modal-button modal-button-confirm ${!termsAgreed && 'modal-button-disabled'}`}
                  disabled={!termsAgreed || isJoining}
                  onClick={handleJoinConfirm}
                >
                  {isJoining ? 'Joining...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EventDetails;
