import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaCalendarAlt, FaClock, FaStar, FaUser, FaCheckCircle, FaUsers } from "react-icons/fa";
import Carousel from "react-bootstrap/Carousel";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import api from '../../config/axios'; // Replace axios import
import "bootstrap/dist/css/bootstrap.min.css";
import "../../styles/Layout.css";
import { motion } from "framer-motion";
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types/auth';
import "../../styles/feedback.css"; // Add import for feedback styles

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
  skillRequirements?: { skill: string, count: number }[]; // Add this line for skill requirements
  skill_requirements?: { skill: string, count: number }[] | string; // Add snake_case version
  isPast?: boolean;
  successMetrics?: {
    volunteersParticipated: number;
    scholarsHelped: number;
  };
  total_scholars?: number;  // Add this field for total scholars
  current_scholars?: number; // Add this field for current scholars
  feedback?: {
    id: number;
    user_name: string;
    user_role?: string; // Added to track user role if available
    rating: number;
    comment: string;
    created_at: string;
  }[];
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
  skillRequirements?: { skill: string, count: number }[]; // Add this line for skill requirements
  isPast?: boolean;
  successMetrics?: {
    volunteersParticipated: number;
    scholarsHelped: number;
  };
  totalScholars?: number;
  currentScholars?: number;
  feedback?: {
    id: number;
    userName: string;
    userRole?: string; // Added to track user role if available
    rating: number;
    comment: string;
    createdAt: string;
  }[];
}

// Add new interface for past events with success metrics
interface PastEvent extends Event {
  isPast: boolean;
  successMetrics?: {
    volunteersParticipated: number;
    scholarsHelped: number;
  };
  totalScholars?: number;
  currentScholars?: number;
  feedback?: {
    id: number;
    userName: string;
    userRole?: string; // Added to track user role if available
    rating: number;
    comment: string;
    createdAt: string;
  }[];
}

// Add these animation variants near the top of the file, after the interfaces
const carouselVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const imageVariants = {
  hidden: { scale: 1.1, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut"
    }
  }
};

// Add these animation variants near the top, after the existing variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const tabVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const titleVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const EventPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultImage = '/images/default-event.png'; // Define default image path
  const { user } = useAuth(); // Get the current user to check skills
  
  // Add state for recommended events
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [otherEvents, setOtherEvents] = useState<Event[]>([]);
  
  // Add state for active tab
  const [activeTab, setActiveTab] = useState<string>("featured");

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
    
    // Return the image URL if it's a Cloudinary URL or any other full URL
    if (imageUrl.startsWith('http')) return imageUrl;
    
    // Default fallback
    return defaultImage;
  }

  // Modified fetchEvents function to handle first-name-only feedback
const fetchEvents = async () => {
  try {
    setIsLoading(true);
    // Use the correct API endpoint with /api prefix
    const response = await api.get<BackendEvent[]>('/events');
    // console.log('Raw event data:', response.data);

    const currentDate = new Date();
    
    // Process all events
    const processedEvents = response.data.map(event => {
      // Add extensive debug logging for skill requirements
      // console.log(`Processing event ${event.id}, title: ${event.title}`);
      
      // Debug log for skill requirements
      // console.log(`Event ${event.id} skill requirements:`, 
      //   event.skillRequirements || event.skill_requirements || 'None');
      
      // Make sure we properly extract the skill requirements
      let processedSkillRequirements = null;
      
      // Try to get skill requirements from either property name
      if (event.skillRequirements) {
        processedSkillRequirements = event.skillRequirements;
      } else if (event.skill_requirements) {
        processedSkillRequirements = event.skill_requirements;
      }
      
      // If skill requirements is a string, try to parse it
      if (typeof processedSkillRequirements === 'string') {
        try {
          processedSkillRequirements = JSON.parse(processedSkillRequirements);
          console.log('Parsed skill requirements from string:', processedSkillRequirements);
        } catch (e) {
          console.error('Failed to parse skill requirements:', e);
          processedSkillRequirements = [];
        }
      }
      
      // Check if the event is in the past
      const eventDate = new Date(event.date);
      const isPast = eventDate < currentDate;
      
      // Generate or calculate success metrics for past events
      let successMetrics;
      if (isPast) {
        // For past events, simulate or calculate success metrics
        // In a real app, this would come from the backend
        const volunteersParticipated = parseInt(String(event.current_volunteers ?? event.currentVolunteers ?? 0));
        
        // Use the actual scholar count from the event data if available
        const scholarsHelped = parseInt(String(event.current_scholars ?? 0));
        
        successMetrics = {
          volunteersParticipated,
          scholarsHelped
        };
      }

      // // Debug feedback data more extensively
      // if (isPast) {
      //   console.log(`Past event ${event.id} (${event.title}) feedback details:`, event.feedback);
      // }
      
      // Process feedback data if it exists - only keep volunteer feedback with comments
      let processedFeedback;
      if (event.feedback && Array.isArray(event.feedback)) {
        processedFeedback = event.feedback
          .filter(item => 
            // Only keep feedback with comments
            item.comment && item.comment.trim() !== '' &&
            // Only keep volunteer feedback
            item.user_role === 'volunteer'
          )
          .map(item => ({
            id: item.id,
            // User name will already be just the first name from the API
            userName: item.user_name,
            userRole: item.user_role || 'volunteer',
            rating: item.rating,
            comment: item.comment,
            createdAt: item.created_at
          }));
        // console.log(`Event ${event.id}: Processed ${processedFeedback.length} filtered feedback items`);
      } else {
        // console.log(`Event ${event.id}: No feedback data available, will fetch separately`);
      }
      
      return {
        ...event,
        // Use the updated function to handle image URLs properly
        image: getImageUrl(event.image),
        // Handle both camelCase and snake_case properties
        totalVolunteers: parseInt(String(event.total_volunteers ?? event.totalVolunteers ?? 0)),
        currentVolunteers: parseInt(String(event.current_volunteers ?? event.currentVolunteers ?? 0)),
        startTime: event.start_time ?? event.startTime ?? '',
        endTime: event.end_time ?? event.endTime ?? '',
        // Ensure we're setting skillRequirements correctly
        skillRequirements: processedSkillRequirements,
        // Add the scholar counts to the processed event
        totalScholars: parseInt(String(event.total_scholars ?? 0)),
        currentScholars: parseInt(String(event.current_scholars ?? 0)),
        // Add past event flag and success metrics
        isPast,
        ...(successMetrics && { successMetrics }),
        feedback: processedFeedback
      };
    });

    // Fetch additional feedback for past events that don't have feedback
    await Promise.all(
      processedEvents
        .filter(event => event.isPast && (!event.feedback || event.feedback.length === 0))
        .map(async (event) => {
          try {
            // console.log(`Fetching additional feedback for event ${event.id}`);
            const feedbackResponse = await api.get(`/public/feedback/${event.id}`);
            if (feedbackResponse.data && feedbackResponse.data.feedback) {
              console.log(`Retrieved ${feedbackResponse.data.feedback.length} feedback items for event ${event.id}`);
              
              // Process the feedback
              event.feedback = feedbackResponse.data.feedback.map((item: {
                id: number;
                user_name: string;
                user_role?: string;
                rating: number;
                comment: string;
                created_at: string;
              }) => ({
                id: item.id,
                userName: item.user_name, // API now returns just first name
                userRole: item.user_role || 'volunteer',
                rating: item.rating,
                comment: item.comment,
                createdAt: item.created_at
              }));
            }
          } catch (feedbackError) {
            console.error(`Error fetching feedback for event ${event.id}:`, feedbackError);
          }
        })
    );

    // console.log('Past events after feedback fetch:', processedEvents.map(e => 
    //   `${e.id}: ${e.title} - ${e.feedback?.length || 0} feedback items`
    // ));

      // Now separate future and past events
      const futureEvents = processedEvents.filter(event => !event.isPast);
      const pastEventsList = processedEvents.filter(event => event.isPast) as PastEvent[];
      
      // console.log('Transformed future events:', futureEvents.length);
      // console.log('Transformed past events:', pastEventsList.length);
      
      // // Debug each event's skill requirements 
      // futureEvents.forEach(event => {
      //   console.log(`Event ${event.id} (${event.title}) final skill requirements:`, 
      //     JSON.stringify(event.skillRequirements));
      // });
      
      // // Debug past events specifically for feedback
      // pastEventsList.forEach(event => {
      //   console.log(`Past event ${event.id} (${event.title}): has ${event.feedback?.length || 0} feedback items`);
      // });
      
      setEvents(futureEvents);
      setPastEvents(pastEventsList);
      
      // After loading events, categorize them based on user skills
      if (user && user.role === 'volunteer' && user.skills) {
        let userSkills: string[] = [];
        
        // Handle different possible formats of user.skills
        if (typeof user.skills === 'string') {
          try {
            userSkills = JSON.parse(user.skills);
          } catch (e) {
            console.error('Error parsing user skills:', e);
          }
        } else if (Array.isArray(user.skills)) {
          userSkills = user.skills;
        }
        
        // console.log('User skills before categorization:', userSkills);
        
        // // Debug which events match user skills
        // futureEvents.forEach(event => {
        //   if (event.skillRequirements && event.skillRequirements.length > 0) {
        //     const matchingSkills = event.skillRequirements.filter(
        //         (req: { skill: string, count: number }) => userSkills.includes(req.skill)
        //       );
        //     console.log(`Event ${event.id} (${event.title}) matching skills:`, 
        //       matchingSkills.length > 0 ? matchingSkills.map((m: { skill: string, count: number }) => m.skill) : 'None');
        //   }
        // });
        
        categorizeEvents(futureEvents, userSkills);
      } else {
        // If not a volunteer or no skills, put all in otherEvents
        setRecommendedEvents([]);
        setOtherEvents(futureEvents);
      }
      
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setError('Failed to load events. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]); // Add user as dependency to re-categorize when user changes

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

  // Function to sort events into recommended and other categories
  const categorizeEvents = (eventsList: Event[], userSkills: string[]) => {
    if (!userSkills || userSkills.length === 0 || !Array.isArray(userSkills)) {
      // If no skills, all events go to others
      setRecommendedEvents([]);
      setOtherEvents(eventsList);
      return;
    }
    
    const recommended: Event[] = [];
    const others: Event[] = [];
    
    eventsList.forEach(event => {
      // Check if event has skill requirements and there's at least one match with user skills
      if (event.skillRequirements && 
          event.skillRequirements.some((req: { skill: string, count: number }) => userSkills.includes(req.skill))) {
        recommended.push(event);
      } else {
        others.push(event);
      }
    });
    
    setRecommendedEvents(recommended);
    setOtherEvents(others);
    
    console.log('User skills:', userSkills);
    console.log('Recommended events:', recommended.length);
    console.log('Other events:', others.length);
  };

  // Helper to render stars based on rating
  const renderStars = (rating: number) => {
    return (
      <div className="feedback-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? "star filled" : "star"}>
            ★
          </span>
        ))}
      </div>
    );
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
        <motion.div
          initial="hidden"
          animate="visible"
          variants={carouselVariants}
        >
          <Carousel indicators={true} interval={3000} pause="hover">
            <Carousel.Item>
              <motion.div variants={imageVariants}>
                <img
                  className="d-block w-100"
                  src="https://kmpayatasb.org/wp-content/uploads/2024/02/SLT-9.jpg"
                  alt="First slide"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </motion.div>
            </Carousel.Item>
            <Carousel.Item>
              <motion.div variants={imageVariants}>
                <img
                  className="d-block w-100"
                  src="https://www.reedelsevier.com.ph/wp-content/uploads/2017/08/corporate-social-responsibility-image.jpg"
                  alt="Second slide"
                  loading="lazy"
                  decoding="async"
                />
              </motion.div>
            </Carousel.Item>
            <Carousel.Item>
              <motion.div variants={imageVariants}>
                <img
                  className="d-block w-100"
                  src="https://kmpayatasb.org/wp-content/uploads/2024/07/449175130_1202453737441028_1645834846612611749_n-1380x657.jpg"
                  alt="Third slide"
                  loading="lazy"
                  decoding="async"
                />
              </motion.div>
            </Carousel.Item>
          </Carousel>
        </motion.div>
      </section>

      <section className="events-section">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k || "featured")}
            className="event-tabs mb-4"
            fill
          >
            <Tab eventKey="featured" title="Featured Events">
              {isLoading && <div className="loading-indicator">Loading events...</div>}
              {error && <div className="error-message">{error}</div>}
              
              {/* Recommended Events Section */}
              {user && user.role === 'volunteer' && recommendedEvents.length > 0 && (
                <>
                  <motion.h2 
                    className="section-title recommended-title"
                    variants={titleVariants}
                  >
                    <span className="highlight">Recommended For You</span> 
                    <span className="subtitle">Based on your skills</span>
                  </motion.h2>
                  <motion.div 
                    className="events-grid recommended-grid"
                    variants={containerVariants}
                  >
                    {recommendedEvents.map((event) => {
                      // Match the admin page's volunteer calculations
                      const volunteersNeeded = event.totalVolunteers - event.currentVolunteers;
                      const progress = (event.currentVolunteers / event.totalVolunteers) * 100;

                      return (
                        <motion.div 
                          key={event.id} 
                          className="event-card recommended"
                          onClick={() => handleCardClick(event.id)}
                          variants={cardVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="event-image">
                            <img 
                              src={event.image || defaultImage} 
                              alt={event.title} 
                              className="event-image"
                              onError={(e) => {
                                console.error(`Failed to load image: ${event.image}`);
                                const target = e.target as HTMLImageElement;
                                target.src = defaultImage; // Use our defined default image constant
                                target.onerror = null; // Prevent infinite loop
                              }} 
                            />
                            <div className="recommended-badge">
                              <FaStar /> Matches Your Skills
                            </div>
                          </div>
                          <div className="event-content">
                            <h4>{event.title}</h4>
                            <p><FaMapMarkerAlt /> {event.location}</p>
                            <p><FaCalendarAlt /> {formatDateForDisplay(event.date)}</p>
                            {event.startTime && event.endTime && (
                              <p><FaClock /> {getDisplayTime(event.startTime, event.endTime)}</p>
                            )}
                            <div className="progress-bar-container">
                              <div
                                className="progress-bar"
                                style={{ 
                                  width: `${progress}%`,
                                  backgroundColor: progress === 100 ? '#28a745' : undefined
                                }}
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
                            
                            {/* Display matching skills */}
                            {event.skillRequirements && user?.skills && (
                              <div className="matching-skills">
                                <div className="skills-label">Matching Skills:</div>
                                <div className="skills-badges">
                                  {event.skillRequirements
                                    .filter(req => 
                                      Array.isArray(user.skills) && user.skills.includes(req.skill)
                                    )
                                    .map(req => (
                                      <span key={req.skill} className="skill-badge">
                                        {req.skill.replace('_', ' ')}
                                      </span>
                                    ))
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </>
              )}

              {/* Other Events Section */}
              <motion.h2 
                className={`section-title ${user && user.role === 'volunteer' && recommendedEvents.length > 0 ? 'other-events' : ''}`}
                variants={titleVariants}
              >
                {user && user.role === 'volunteer' && recommendedEvents.length > 0 
                  ? <span className="other-events-title">
                      <span className="highlight">Other Events</span>
                      <span className="subtitle">Browse all available opportunities</span>
                    </span>
                  : 'All Events'}
              </motion.h2>
              
              {otherEvents.length > 0 ? (
                <motion.div 
                  className="events-grid"
                  variants={containerVariants}
                >
                  {otherEvents.map((event) => {
                    // Match the admin page's volunteer calculations
                    const volunteersNeeded = event.totalVolunteers - event.currentVolunteers;
                    const progress = (event.currentVolunteers / event.totalVolunteers) * 100;

                    return (
                      <motion.div
                        key={event.id}
                        className="event-card"
                        onClick={() => handleCardClick(event.id)}
                        variants={cardVariants}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <img 
                          src={event.image || defaultImage} 
                          alt={event.title} 
                          className="event-image"
                          onError={(e) => {
                            console.error(`Failed to load image: ${event.image}`);
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
                            style={{ 
                              width: `${progress}%`,
                              backgroundColor: progress === 100 ? '#28a745' : undefined
                            }}
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
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div 
                  className="no-events"
                  variants={cardVariants}
                >
                  {recommendedEvents.length > 0 
                    ? 'No other events available at the moment.' 
                    : 'No events available at the moment.'}
                </motion.div>
              )}
            </Tab>
            
            <Tab eventKey="past" title="Past Events">
              <motion.div 
                className="past-events-container"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.h2 
                  className="section-title"
                  variants={titleVariants}
                >
                  <span className="highlight">Past Events</span>
                </motion.h2>
                <motion.h5 variants={titleVariants}>
                  <span className="subtitle">Our successful community initiatives</span>
                </motion.h5>
                
                {isLoading && <div className="loading-indicator">Loading past events...</div>}
                {error && <div className="error-message">{error}</div>}
                
                {pastEvents.length > 0 ? (
                  <motion.div 
                    className="past-events-list"
                    variants={containerVariants}
                  >
                    {pastEvents.map((event) => (
                      <motion.div 
                        key={event.id} 
                        className="past-event-card"
                        variants={cardVariants}
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="past-event-image">
                          <img 
                            src={event.image || defaultImage} 
                            alt={event.title} 
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = defaultImage;
                              target.onerror = null;
                            }} 
                          />
                          <div className="past-event-badge">
                            <FaCheckCircle /> Completed
                          </div>
                        </div>
                        <div className="past-event-content">
                          <h3>{event.title}</h3>
                          <p className="past-event-date">
                            <FaCalendarAlt /> {formatDateForDisplay(event.date)}
                          </p>
                          <p className="past-event-location">
                            <FaMapMarkerAlt /> {event.location}
                          </p>
                          
                          <div className="past-event-metrics">
                            <div className="metric">
                              <FaUsers className="metric-icon" />
                              <div className="metric-content">
                                <span className="metric-value">
                                  {event.successMetrics?.volunteersParticipated || event.currentVolunteers}
                                </span>
                                <span className="metric-label">Volunteers Participated</span>
                              </div>
                            </div>
                            
                            <div className="metric">
                              <FaUser className="metric-icon" />
                              <div className="metric-content">
                                <span className="metric-value">
                                  {event.currentScholars || event.successMetrics?.scholarsHelped || 0}
                                </span>
                                <span className="metric-label">Scholar Members Helped</span>
                              </div>
                            </div>
                          </div>
                          
                          <p className="past-event-success-message">
                            This event was successfully completed with {event.successMetrics?.volunteersParticipated || event.currentVolunteers} volunteers 
                            who made a positive impact by helping {event.currentScholars || event.successMetrics?.scholarsHelped || 0} scholar members.
                          </p>
                      
                      
                      
                          {/* Improved volunteer feedback section with fallback checks */}
                          {event.feedback && Array.isArray(event.feedback) && event.feedback.length > 0 ? (
                            <div className="past-event-feedback">
                              <h4>Volunteer Feedback</h4>
                              <div className="feedback-items">
                                {/* Show up to 2 feedback items */}
                                {event.feedback.slice(0, 2).map((item) => (
                                  <div key={item.id} className="feedback-item">
                                    <div className="feedback-header">
                                      <span className="feedback-author">
                                        {item.userName} 
                                        {item.userRole && <small> ({item.userRole})</small>}
                                      </span>
                                      {renderStars(item.rating)}
                                    </div>
                                    <p className="feedback-comment">"{item.comment}"</p>
                                  </div>
                                ))}
                                {/* Add "View more" link if there are more than 2 feedback items */}
                                {event.feedback.length > 2 && (
                                  <div className="view-more-feedback" onClick={() => handleCardClick(event.id)}>
                                    <span>View more feedback ({event.feedback.length - 2} more)</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="no-feedback">
                              <p>No volunteer feedback available for this event.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div 
                    className="no-events"
                    variants={cardVariants}
                  >
                    No past events available at the moment.
                  </motion.div>
                )}
              </motion.div>
            </Tab>
          </Tabs>
        </motion.div>
      </section>
    </motion.div>
  );
};

export default EventPage;

