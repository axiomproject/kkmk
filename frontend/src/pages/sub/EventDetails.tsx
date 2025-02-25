import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaCalendarAlt, FaClock, FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import api from '../../config/axios'; // Replace axios import
import { motion } from "framer-motion";
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
  status: string;
  contact: {
    phone: string;
    email: string;
  };
  startTime: string;
  endTime: string;
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

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${import.meta.env.VITE_API_URL}${path}`;
  };

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/admin/events/${eventId}`);
      
      const eventData = {
        ...response.data,
        image: response.data.image.startsWith('http') 
          ? response.data.image 
          : getImageUrl(response.data.image),
        totalVolunteers: parseInt(response.data.total_volunteers) || 0,
        currentVolunteers: parseInt(response.data.current_volunteers) || 0,
        contact: {
          phone: response.data.contact_phone || response.data.contact?.phone || '',
          email: response.data.contact_email || response.data.contact?.email || ''
        },
        startTime: response.data.start_time || '',
        endTime: response.data.end_time || ''
      };
      
      setEvent(eventData);
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      setError('Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  const checkParticipation = async () => {
    if (!user) return;
    try {
      const response = await api.get(`/events/${eventId}/check-participation`);
      setHasJoined(response.data.hasJoined);
      setParticipantStatus(response.data.status || ''); // Add this line
    } catch (error) {
      console.error('Failed to check participation status:', error);
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

    try {
      setIsJoining(true);
      setJoinError(null);
      
      const response = await api.post(`/events/${eventId}/join`);

      // Update local event data with new volunteer count
      if (event) {
        const updatedEvent = response.data.event;
        setEvent({
          ...event,
          currentVolunteers: updatedEvent.current_volunteers,
        });
      }

      console.log('Join response:', response.data);
      await fetchEventDetails();
      await checkParticipation(); // Add immediate check after joining
      setHasJoined(true);
      
    } catch (error: any) {
      console.error('Failed to join event:', error.response || error);
      setJoinError(error.response?.data?.error || 'Failed to join event');
    } finally {
      setIsJoining(false);
    }
  };

  const handleUnjoinEvent = async () => {
    try {
      setIsJoining(true);
      setJoinError(null);
      
      const response = await api.post(`/events/${eventId}/unjoin`);

      // Update local event data with new volunteer count
      if (event) {
        const updatedEvent = response.data.event;
        setEvent({
          ...event,
          currentVolunteers: updatedEvent.current_volunteers,
        });
      }

      setHasJoined(false);
      
    } catch (error: any) {
      console.error('Failed to unjoin event:', error.response || error);
      setJoinError(error.response?.data?.error || 'Failed to unjoin event');
    } finally {
      setIsJoining(false);
    }
  };

  // Add this console.log to debug
  useEffect(() => {
    console.log('Current user:', user);
  }, [user]);

  // Update the buttonText function
  const buttonText = () => {
    if (!event) return '';
    if (event.status === 'CLOSED') return 'Event Closed';
    if (volunteersNeeded <= 0 && !hasJoined) return 'Fully Booked';
    if (hasJoined) {
      if (participantStatus === 'PENDING') return 'Pending';
      return 'Leave Event';
    }
    if (!user) return 'Sign Up';
    if (user.role === 'sponsor' || user.role === 'scholar') {
      return 'Contact Admin';
    }
    return 'Join';
  };

  const handleButtonClick = () => {
    // Add handling for sponsor and scholar roles
    if (user && (user.role === 'sponsor' || user.role === 'scholar')) {
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

    if (hasJoined) {
      handleUnjoinEvent();
    } else {
      handleVolunteerSignUp();
    }
  };

  if (isLoading) return <div>Loading event details...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!event) return <div>Event not found</div>;

  const progress = Math.min((event.currentVolunteers / event.totalVolunteers) * 100, 100);
  const volunteersNeeded = Math.max(event.totalVolunteers - event.currentVolunteers, 0);
  const daysLeft = getDaysLeft(event.date);

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
            src={getImageUrl(event.image)} 
            alt={event.title} 
            className="event-image2"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/default-event.jpg'; // Add a fallback image
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
              <div className="progress-bar">
                <span className="progress-percentage">
                  {progress < 5 ? '' : `${Math.round(progress)}%`}
                </span>
              </div>
              {progress < 5 && (
                <span className="progress-percentage">
                  {Math.round(progress)}%
                </span>
              )}
            </div>
          </div>
          <p className="event-details-info-side">
            <strong>Volunteers Needed:  {volunteersNeeded > 0 ? volunteersNeeded : "Goal Reached!"}</strong>{" "}
           
          </p>
          {volunteersNeeded > 0 ? (
            daysLeft > 0 && (
              <p>{daysLeft} Days Left to volunteer</p>
            )
          ) : (
            <p><strong>Thank you!</strong> We've reached our volunteer goal</p>
          )}
          <button 
            className={`volunteer-button2 ${hasJoined ? 'leave-button' : ''}`}
            disabled={event.status === 'CLOSED' || (volunteersNeeded <= 0 && !hasJoined) || isJoining}
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
    </motion.div>
  );
};

export default EventDetails;
