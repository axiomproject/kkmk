import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaCalendarAlt, FaClock } from "react-icons/fa";
import Carousel from "react-bootstrap/Carousel";
import api from '../../config/axios'; // Replace axios import
import "bootstrap/dist/css/bootstrap.min.css";
import "../../styles/Layout.css";
import { motion } from "framer-motion";

// Remove axios.defaults.baseURL configuration

// Update the BackendEvent interface to include both camelCase and snake_case properties
interface BackendEvent {
  id: number;
  title: string;
  date: string;
  location: string;
  image: string;
  description: string;
  totalVolunteers?: number;
  total_volunteers?: string | number;
  currentVolunteers?: number;
  current_volunteers?: string | number;
  status: string;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  contact: {
    phone: string;
    email: string;
  };
}

// Update Event interface to match BackendEvent
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
  startTime: string;
  endTime: string;
  contact: {
    phone: string;
    email: string;
  };
}

const EventPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultImage = '/images/default-event.png'; // Define default image path

  const formatTimeForDisplay = (time24h: string) => {
    if (!time24h) return '';
    try {
      const [hours, minutes] = time24h.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
      return '';
    }
  };

  const getDisplayTime = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 'Time to be announced';
    
    const formattedStartTime = formatTimeForDisplay(startTime);
    const formattedEndTime = formatTimeForDisplay(endTime);
    
    return `${formattedStartTime} - ${formattedEndTime}`;
  };

  const getImageUrl = (imageUrl: string | null) => {
    // Return default image if image url is null, undefined, or empty string
    if (!imageUrl) return defaultImage;
    
    // Return the image URL if it's a valid URL
    if (imageUrl.startsWith('http')) return imageUrl;
    
    // Otherwise, prepend the API URL
    return `${import.meta.env.VITE_API_URL}${imageUrl}`;
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<BackendEvent[]>('/admin/events');
      console.log('Raw response:', response.data);

      const currentDate = new Date();
      const futureEvents = response.data.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= currentDate;
      }).map(event => ({
        ...event,
        // Use the new function to handle image URLs properly
        image: getImageUrl(event.image),
        // Handle both camelCase and snake_case properties
        totalVolunteers: parseInt(String(event.total_volunteers ?? event.totalVolunteers ?? 0)),
        currentVolunteers: parseInt(String(event.current_volunteers ?? event.currentVolunteers ?? 0)),
        startTime: event.start_time ?? event.startTime ?? '',
        endTime: event.end_time ?? event.endTime ?? ''
      }));

      console.log('Transformed events:', futureEvents);
      setEvents(futureEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setError('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

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

  const handleVolunteerTime = () => {
    navigate("/time-volunteer");
  };

  const handleVolunteerTreasure = () => {
    navigate("/treasure-volunteer");
  };

  const handleCardClick = (eventId: number) => {
    navigate(`/event/${eventId}`);
  };

  return (
    <motion.div 
      className="event-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <section className="hero">
        <Carousel indicators={true} interval={3000} pause="hover">
          <Carousel.Item>
            <img
              className="d-block w-100"
              src="https://kmpayatasb.org/wp-content/uploads/2024/02/SLT-9.jpg"
              alt="First slide"
            />
          </Carousel.Item>
          <Carousel.Item>
            <img
              className="d-block w-100"
              src="https://www.reedelsevier.com.ph/wp-content/uploads/2017/08/corporate-social-responsibility-image.jpg"
              alt="Second slide"
            />
          </Carousel.Item>
          <Carousel.Item>
            <img
              className="d-block w-100"
              src="https://kmpayatasb.org/wp-content/uploads/2024/07/449175130_1202453737441028_1645834846612611749_n-1380x657.jpg"
              alt="Third slide"
            />
          </Carousel.Item>
        </Carousel>
      </section>

      <section className="featured-events">
        <h6 className="featured-events-title">Featured Events</h6>
        {isLoading && <div>Loading events...</div>}
        {error && <div className="error-message">{error}</div>}
        
        <div className="events-grid">
          {events.map((event) => {
            // Match the admin page's volunteer calculations
            const volunteersNeeded = event.totalVolunteers - event.currentVolunteers;
            const progress = (event.currentVolunteers / event.totalVolunteers) * 100;

            return (
              <div
                key={event.id}
                className="event-card"
                onClick={() => handleCardClick(event.id)}
              >
                <img 
                  src={event.image || defaultImage} 
                  alt={event.title} 
                  className="event-image"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = defaultImage; // Use our defined default image constant
                    target.onerror = null; // Prevent infinite loop
                  }} 
                />
                <h4>{event.title}</h4>
                <p><FaMapMarkerAlt /> {event.location}</p>
                <p><FaCalendarAlt /> {formatDateForDisplay(event.date)}</p>
                {event.startTime && event.endTime && (
                  <p><FaClock /> {getDisplayTime(event.startTime, event.endTime)}</p>
                )}
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                   
                  >
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
                <p className="volunteers-needed">
                  {volunteersNeeded > 0
                    ? `${volunteersNeeded} more volunteers needed`
                    : "No more volunteers needed"}
                </p>
                <p className="event-status">Status: {event.status}</p>
              </div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
};

export default EventPage;

