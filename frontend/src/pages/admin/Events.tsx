import React, { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaCalendarAlt, FaClock, FaEdit, FaTrash, FaPlus, FaUsers, FaTrashAlt, FaUserPlus, FaSearch, FaTimes, FaUpload, FaBell } from 'react-icons/fa';
import Modal from '../../components/modals/EventModal';
import '../../styles/Events.css';
import axios from 'axios';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LatLng, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet default icon issue
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon,
  shadowUrl: markerIconShadow,
});


// Update the EventType interface to include latitude and longitude
interface EventType {
  id: number;
  title: string;
  date: string;
  location: string;
  image: string;
  description: string;
  totalVolunteers: number;
  currentVolunteers: number;
  status: 'OPEN' | 'CLOSED';
  contact: {
    phone: string;
    email: string;
  };
  startTime: string;
  endTime: string;
  latitude?: number | null;  // Add this line
  longitude?: number | null; // Add this line
}

// Update the Participant interface
interface Participant {
  id: number;
  name: string;
  email: string;
  phone: string;  // Add phone to interface
  profile_photo: string;  // Add this line
  joined_at: string;
  status: 'PENDING' | 'ACTIVE';
}

interface AddVolunteerForm {
  email: string;
  name: string;
  phone: string;
}

// Add new interface for volunteer list
interface Volunteer {
  id: number;
  name: string;
  email: string;
  phone: string;
  profile_photo?: string;
}

// Add a new interface for form data that allows File type for image
interface EventFormData {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string | File | null;  // Allow null for initial state
  description: string;
  totalVolunteers: number;
  currentVolunteers: number;
  status: 'OPEN' | 'CLOSED';
  contact: {
    phone: string;
    email: string;
  };
  startTime: string;
  endTime: string;
  latitude: number | null;
  longitude: number | null;
}

interface MapPosition {
  lat: number;
  lng: number;
}

// Add this interface near your other interfaces
interface GeocodingResult {
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    country?: string;
  };
}

// Add this utility function
const reverseGeocode = async (lat: number, lng: number) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );
    const data: GeocodingResult = await response.json();
    return data.display_name;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// Add this new component for the map selector
const LocationMapPicker: React.FC<{
  onLocationSelect: (position: MapPosition, address: string) => void;
  initialPosition?: MapPosition;
  onClose: () => void;
}> = ({ onLocationSelect, initialPosition, onClose }) => {
  const [position, setPosition] = useState<MapPosition>(
    initialPosition || { lat: 14.7164, lng: 121.1194 } // Default to Payatas coordinates
  );
  const [loading, setLoading] = useState(false);

  const handleLocationSelect = async () => {
    setLoading(true);
    const address = await reverseGeocode(position.lat, position.lng);
    setLoading(false);
    onLocationSelect(position, address || 'Unknown location');
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        setPosition(e.latlng);
      },
    });
    return null;
  };

  return (
    <div className="map-modal-overlay">
      <div className="map-modal-content">
        <h3>Select Event Location</h3>
        <div className="location-map-container">
          <MapContainer
            center={[position.lat, position.lng]}
            zoom={15}
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker position={[position.lat, position.lng]} />
            <MapClickHandler />
          </MapContainer>
        </div>
        <div className="map-modal-actions">
          <button 
            onClick={handleLocationSelect} 
            className="confirm-location-btn"
            disabled={loading}
          >
            {loading ? 'Getting address...' : 'Confirm Location'}
          </button>
          <button onClick={onClose} className="cancel-location-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<EventType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    id: '',
    title: '',
    date: '',
    location: '',
    image: null,  // Initialize as null
    description: '',
    totalVolunteers: 0,
    currentVolunteers: 0,
    contact: {
      phone: '',
      email: ''
    },
    status: 'OPEN' as const,
    startTime: '',
    endTime: '',
    latitude: null,
    longitude: null
  });

  const [validationErrors, setValidationErrors] = useState({
    totalVolunteers: '',
    currentVolunteers: ''
  });

  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedEventParticipants, setSelectedEventParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showAddVolunteerForm, setShowAddVolunteerForm] = useState(false);
  const [addVolunteerForm, setAddVolunteerForm] = useState<AddVolunteerForm>({
    email: '',
    name: '',
    phone: '',
  });

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [searchResults, setSearchResults] = useState<Volunteer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [suggestionsPosition, setSuggestionsPosition] = useState({ top: 0, left: 0 });

  const validateVolunteers = (total: number, current: number) => {
    const errors = {
      totalVolunteers: '',
      currentVolunteers: ''
    };

    if (total <= 0) {
      errors.totalVolunteers = 'Total volunteers must be greater than 0';
    }

    if (current < 0) {
      errors.currentVolunteers = 'Current volunteers cannot be negative';
    }

    if (current > total) {
      errors.currentVolunteers = 'Current volunteers cannot exceed total volunteers';
    }

    setValidationErrors(errors);
    return !errors.totalVolunteers && !errors.currentVolunteers;
  };

  const convertTo24Hour = (time12h: string) => {
    if (!time12h) return '';
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    let hoursNum = parseInt(hours, 10);
    if (modifier === 'PM' && hoursNum < 12) hoursNum += 12;
    if (modifier === 'AM' && hoursNum === 12) hoursNum = 0;
    
    return `${hoursNum.toString().padStart(2, '0')}:${minutes}`;
  };

  const formatTimeForDisplay = (time24h: string) => {
    if (!time24h) return '';
    const [hours, minutes] = time24h.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

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
      return dateString; // Return original if parsing fails
    }
  };

  const formatDateForInput = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedEvent(null);
    setFormData({
      id: '',
      title: '',
      date: '',
      location: '',
      image: null,  // Reset to null for new events
      description: '',
      totalVolunteers: 0,
      currentVolunteers: 0,
      contact: {
        phone: '',
        email: ''
      },
      status: 'OPEN' as const,
      startTime: '',
      endTime: '',
      latitude: null,
      longitude: null
    });
  };

  const handleShow = (event?: EventType) => {
    if (event) {
      // Add baseURL to image path if it's a relative path
      const imageUrl = event.image.startsWith('http') 
        ? event.image 
        : event.image.startsWith('/uploads')
          ? `${event.image}`
          : `${axios.defaults.baseURL}${event.image}`;
      
      setImagePreview(imageUrl);
      setSelectedEvent(event);
      setFormData({
        ...event,
        id: event.id.toString(),
        image: event.image,
        date: formatDateForInput(event.date),
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        contact: {
          phone: event.contact?.phone || '',
          email: event.contact?.email || ''
        },
        latitude: event.latitude || null,
        longitude: event.longitude || null
      });
    } else {
      // When creating new event, clear image preview
      setImagePreview('');
      setShowModal(true);
      setFormData({
        id: '',
        title: '',
        date: '',
        location: '',
        image: null,
        description: '',
        totalVolunteers: 0,
        currentVolunteers: 0,
        contact: {
          phone: '',
          email: ''
        },
        status: 'OPEN' as const,
        startTime: '',
        endTime: '',
        latitude: null,
        longitude: null
      });
    }
    setShowModal(true);
  };

  const [isClosing, setIsClosing] = useState(false);

const handleCloseSuggestions = () => {
  setIsClosing(true);
  setTimeout(() => {
    setShowSuggestions(false);
    setIsClosing(false);
  }, 200); 
};



  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get('/api/admin/events');
      
      if (Array.isArray(response.data)) {
        const transformedEvents = response.data.map(event => ({
          ...event,
          startTime: event.start_time || event.startTime || '',
          endTime: event.end_time || event.endTime || '',
          totalVolunteers: parseInt(event.total_volunteers || event.totalVolunteers) || 0,
          currentVolunteers: parseInt(event.current_volunteers || event.currentVolunteers) || 0,
          contact: {
            phone: event.contact_phone || event.contact?.phone || '',
            email: event.contact_email || event.contact?.email || ''
          }
        }));
        setEvents(transformedEvents);
      } else {
        console.error('Invalid data format:', response.data);
        setEvents([]);
        setError('Invalid data received from server');
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]);
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || error.message);
      } else {
        setError('Failed to load events');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Add this state for image preview
  const [imagePreview, setImagePreview] = useState<string>('');

  // Add this function to handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData(prev => ({ 
          ...prev, 
          image: file 
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Add this state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update handleSubmit to properly send coordinates
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateVolunteers(formData.totalVolunteers, formData.currentVolunteers)) {
    return;
  }

  // Add validation for coordinates
  if (!formData.latitude || !formData.longitude) {
    toast.error('Please select a location on the map');
    return;
  }

  setIsSubmitting(true);
  const formDataToSend = new FormData();

  // Explicitly add coordinates
  formDataToSend.append('latitude', formData.latitude.toString());
  formDataToSend.append('longitude', formData.longitude.toString());

  // Rest of your form data
  Object.entries(formData).forEach(([key, value]) => {
    if (key === 'contact') {
      formDataToSend.append('contactPhone', (value as { phone: string }).phone);
      formDataToSend.append('contactEmail', (value as { email: string }).email);
    } else if (key === 'image') {
      if (value instanceof File) {
        formDataToSend.append('image', value);
      }
    } else if (key !== 'latitude' && key !== 'longitude') {
      // Skip latitude/longitude as we've already added them
      formDataToSend.append(key, String(value));
    }
  });

  try {
    const url = selectedEvent 
      ? `/api/admin/events/${selectedEvent.id}`
      : '/api/admin/events';

    const response = await axios({
      method: selectedEvent ? 'PUT' : 'POST',
      url,
      data: formDataToSend,
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    console.log('Server response:', response.data);
    await fetchEvents();
    handleClose();
    toast.success(`Event ${selectedEvent ? 'updated' : 'created'} successfully`);
  } catch (error) {
    console.error('Failed to save event:', error);
    toast.error('Failed to save event. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};

const handleDelete = async (id: number) => {
  if (window.confirm('Are you sure you want to delete this event?')) {
    try {
      // Add authorization header to the delete request
      await axios.delete(`/api/events/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Event deleted successfully');
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event. Please try again.');
    }
  }
};

  const fetchParticipants = async (eventId: number) => {
    try {
      setLoadingParticipants(true);
      const response = await axios.get(`/api/events/${eventId}/participants`);
      setSelectedEventParticipants(response.data);
      setSelectedEvent(events.find(event => event.id === eventId) || null); // Add this line
      setShowParticipantsModal(true);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleRemoveParticipant = async (eventId: number, userId: number) => {
    if (!eventId || isNaN(eventId)) {
      console.error('Invalid event ID:', eventId);
      return;
    }

    if (window.confirm('Are you sure you want to remove this participant?')) {
      try {
        await axios.delete(`/api/events/${eventId}/participants/${userId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        // Refresh participants list
        await fetchParticipants(eventId);
        // Refresh event details to update volunteer count
        await fetchEvents();
      } catch (error) {
        console.error('Failed to remove participant:', error);
      }
    }
  };

  // Add new function to fetch volunteers
  const fetchVolunteers = async () => {
    try {
      console.log('Fetching volunteers...');
      const response = await axios.get('/api/admin/volunteers', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('Fetched volunteers:', response.data);
      setVolunteers(response.data);
    } catch (error) {
      console.error('Failed to fetch volunteers:', error);
      setError('Failed to load volunteers list');
    }
  };

  // Add effect to fetch volunteers when modal opens
  useEffect(() => {
    if (showParticipantsModal) {
      fetchVolunteers();
    }
  }, [showParticipantsModal]);

  // Modify handleAddVolunteer
  const handleAddVolunteer = async (volunteer: Volunteer) => {
    if (!selectedEvent) return;

    try {
      const response = await axios.post(
        `/api/events/${selectedEvent.id}/add-volunteer`,
        { volunteerId: volunteer.id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      await fetchParticipants(selectedEvent.id);
      await fetchEvents();
      setShowAddVolunteerForm(false);
      setSelectedVolunteer(null);
    } catch (error) {
      console.error('Failed to add volunteer:', error);
    }
  };

  // Modify renderAddVolunteerForm to show volunteer list
  const renderAddVolunteerForm = () => (
    <div className="add-volunteer-form">
      <h3>Add Volunteer</h3>
      <div className="volunteer-search-container">
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search volunteers..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
              const filtered = volunteers.filter(v => 
                v.name.toLowerCase().includes(e.target.value.toLowerCase()) ||
                v.email.toLowerCase().includes(e.target.value.toLowerCase())
              );
              setSearchResults(filtered);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="search-input"
          />
          {searchTerm && (
            <FaTimes 
              className="clear-search" 
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
              }}
            />
          )}
        </div>

        {showSuggestions && searchResults.length > 0 && (
          <div className="search-suggestions">
            {searchResults.map(volunteer => (
              <div 
                key={volunteer.id} 
                className="suggestion-item"
                onClick={() => {
                  handleAddVolunteer(volunteer);
                  setSearchTerm('');
                  setShowSuggestions(false);
                  setSearchResults([]);
                }}
              >
                <img 
                  src={volunteer.profile_photo || '/default-avatar.png'} 
                  alt={volunteer.name}
                  className="suggestion-avatar"
                />
                <div className="suggestion-info">
                  <div className="suggestion-name">{volunteer.name}</div>
                  <div className="suggestion-email">{volunteer.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <button type="button" onClick={() => {
        setShowAddVolunteerForm(false);
        setSearchTerm('');
        setSearchResults([]);
      }} className="cancel-btn">
        Close
      </button>
    </div>
  );

  // Add this helper function near the top with other functions
  const filterOutExistingParticipants = (volunteers: Volunteer[], currentParticipants: Participant[]) => {
    const participantIds = new Set(currentParticipants.map(p => p.id));
    return volunteers.filter(v => !participantIds.has(v.id));
  };

  // Add this new function before the AdminEvents component
const sendNotification = async (userId: number, eventId: number) => {
  try {
    // Get the event title from the selected event
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    await axios.post('/api/notifications/send', {
      userId,
      type: 'event_reminder',
      content: `"${event.title}" is coming up soon!`,
      relatedId: eventId.toString()
    });
    toast.success('Reminder notification sent');
  } catch (error) {
    console.error('Error sending notification:', error);
    toast.error('Failed to send notification');
  }
};

// Add this new function after sendNotification function
const sendNotificationToAllPending = async (eventId: number) => {
  try {
    const button = document.querySelector('.notify-all-btn') as HTMLButtonElement;
    if (button) {
      button.disabled = true;
      button.innerHTML = '<FaBell /> Sending...';
    }

    const pendingParticipants = selectedEventParticipants.filter(p => p.status === 'PENDING');
    if (pendingParticipants.length === 0) {
      toast.info('No pending participants to notify');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    await Promise.all(
      pendingParticipants.map(async participant => {
        try {
          await sendNotification(participant.id, eventId);
          successCount++;
        } catch (error) {
          console.error(`Failed to notify participant ${participant.id}:`, error);
          failCount++;
        }
      })
    );

    // Show success checkmark animation
    if (button) {
      button.classList.add('notify-success');
      button.innerHTML = `
        <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
          <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
        Sent ${successCount}
      `;

      // Reset button after animation with smaller bell icon
      setTimeout(() => {
        button.classList.remove('notify-success');
        button.disabled = false;
        button.innerHTML = '<svg class="svg-inline--fa fa-bell" style="width: 14px; height: 14px;" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="bell" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M224 0c-17.7 0-32 14.3-32 32V51.2C119 66 64 130.6 64 208v18.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416H416c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8V208c0-77.4-55-142-128-156.8V32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3H160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z"></path></svg> Notify All Pending';
      }, 2000);
    }

    // Update participant list
    await fetchParticipants(eventId);

  } catch (error) {
    console.error('Error sending notifications:', error);
    toast.error('Failed to send notifications');
    
    // Reset button on error
    const button = document.querySelector('.notify-all-btn') as HTMLButtonElement;
    if (button) {
      button.disabled = false;
      button.innerHTML = '<FaBell /> Notify All Pending';
    }
  }
};

  // Modify the existing renderParticipantsModal
  const renderParticipantsModal = () => (
    <div className="modal-overlay" onClick={() => setShowParticipantsModal(false)}>
      <div 
        className={`modal-content-participants ${showSuggestions && searchResults.length > 0 ? 'with-suggestions' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="participants-header">
          <h2>Event Participants</h2>
          {selectedEvent && selectedEventParticipants.some(p => p.status === 'PENDING') && (
            <button
              onClick={() => sendNotificationToAllPending(selectedEvent.id)}
              className="notify-all-btn"
              title="Send reminder to all pending participants"
            >
              <FaBell /> Notify All Pending
            </button>
          )}
        </div>
        <div className="volunteer-search-container">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Add volunteers by name or email..."
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);
                // Filter volunteers excluding current participants
                const availableVolunteers = filterOutExistingParticipants(volunteers, selectedEventParticipants);
                const filtered = availableVolunteers.filter(v => 
                  v.name.toLowerCase().includes(value.toLowerCase()) ||
                  v.email.toLowerCase().includes(value.toLowerCase())
                );
                setSearchResults(filtered);
                setShowSuggestions(true);
                console.log('Filtered results:', filtered);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="quick-add-input"
            />
            {searchTerm && (
              <FaTimes 
                className="clear-search" 
                onClick={() => {
                  setSearchTerm('');
                  setSearchResults([]);
                  setShowSuggestions(false);
                }}
              />
            )}
          </div>

          {/* Update the suggestions display logic */}
          {showSuggestions && searchTerm && searchResults.length > 0 && (
            <div className="quick-suggestions">
              {searchResults.map(volunteer => (
                <div 
                  key={volunteer.id} 
                  className="suggestion-item"
                  onClick={() => {
                    handleAddVolunteer(volunteer);
                    setSearchTerm('');
                    setShowSuggestions(false);
                  }}
                >
                  <img 
                    src={volunteer.profile_photo || '/images/default-avatar.jpg'} 
                    alt={volunteer.name}
                    className="suggestion-avatar"
                  />
                  <div className="suggestion-info">
                    <div className="suggestion-name">{volunteer.name}</div>
                    <div className="suggestion-email">{volunteer.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="participants-list">
          {selectedEventParticipants.length > 0 ? (
            <table className="participants-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedEventParticipants.map((participant) => (
                  <tr key={participant.id}>
                    <td>
                      <div className="participant-info">
                        <img 
                          src={participant.profile_photo || '/images/default-avatar.jpg'} 
                          alt={participant.name}
                          className="participant-avatar"
                        />
                        <span>{participant.name}</span>
                      </div>
                    </td>
                    <td>{participant.email}</td>
                    <td>{participant.phone || 'N/A'}</td>
                    <td>{new Date(participant.joined_at).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${participant.status.toLowerCase()}`}>
                        {participant.status}
                      </span>
                    </td>
                    <td>
                      <div className="participant-actions">
                        {participant.status === 'PENDING' && (
                          <button
                            onClick={() => sendNotification(participant.id, selectedEvent!.id)}
                            className="notify-participant-btn"
                            title="Send reminder"
                          >
                            <FaBell size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => selectedEvent && handleRemoveParticipant(selectedEvent.id, participant.id)}
                          className="remove-participant-btn"
                          title="Remove participant"
                          disabled={!selectedEvent}
                        >
                          <FaTrashAlt size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No participants yet</p>
          )}
        </div>
        
        <button 
          onClick={() => setShowParticipantsModal(false)} 
          className="participant-modal-close-btn"
        >
          Close
        </button>
      </div>
    </div>
  );

  const getDisplayTime = (startTime: string | null | undefined, endTime: string | null | undefined) => {
    // Handle null/undefined cases
    if (!startTime || !endTime) return 'Time not set';
    
    // Check if times are in 24-hour format
    const is24HourFormat = !startTime.includes('AM') && !startTime.includes('PM');
    
    if (is24HourFormat) {
      return `${formatTimeForDisplay(startTime)} - ${formatTimeForDisplay(endTime)}`;
    }
    // If already in 12-hour format, return as is
    return `${startTime} - ${endTime}`;
  };

  const sortEvents = (events: EventType[]) => {
    const now = new Date();
    const currentEvents = events.filter(event => new Date(event.date) >= now);
    const pastEvents = events.filter(event => new Date(event.date) < now);
    return { currentEvents, pastEvents };
  };

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapPosition | null>(null);

  // Update handleLocationSelect to ensure coordinates are properly stored
const handleLocationSelect = async (position: MapPosition, address: string) => {
  console.log('Selected position:', position); // Debug log
  
  setSelectedLocation(position);
  setFormData(prev => ({
    ...prev,
    location: address,
    latitude: position.lat,
    longitude: position.lng
  }));
  
  // Debug log
  console.log('Updated form data:', {
    location: address,
    latitude: position.lat,
    longitude: position.lng
  });
  
  setShowLocationPicker(false);
};

// Add this near other validations
const validateLocation = () => {
  if (!formData.latitude || !formData.longitude) {
    return false;
  }
  return true;
};

  // Add this near other useEffect hooks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlightId = params.get('highlight');
    
    if (highlightId) {
      const eventToHighlight = events.find(e => e.id.toString() === highlightId);
      if (eventToHighlight) {
        // Scroll to the highlighted event
        const element = document.getElementById(`event-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlighted');
          // Remove highlight after animation
          setTimeout(() => {
            element.classList.remove('highlighted');
          }, 3000);
        }
      }
    }
  }, [events]);

  // Add this useEffect to handle URL parameters and event highlighting
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlightId = params.get('highlight');
    
    if (highlightId && events.length > 0) {
      // Find the event
      const eventToHighlight = events.find(e => e.id.toString() === highlightId);
      
      if (eventToHighlight) {
        // First scroll to the event
        const element = document.getElementById(`event-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlighted');
          
          // Open the event details modal
          handleShow(eventToHighlight);
          
          // Remove highlight after animation
          setTimeout(() => {
            element.classList.remove('highlighted');
          }, 3000);
        }
      }
    }
  }, [events]); // Depend on events array

  // Add this useEffect near other useEffect hooks
  useEffect(() => {
    const eventIdToOpen = localStorage.getItem('openEventModal');
    if (eventIdToOpen && events.length > 0) {
      const eventToShow = events.find(e => e.id.toString() === eventIdToOpen);
      if (eventToShow) {
        handleShow(eventToShow);
        // Clear the flag after opening
        localStorage.removeItem('openEventModal');
      }
    }
  }, [events]);

  // Add this useEffect to handle stored event
  useEffect(() => {
    // Check for stored event after events are loaded
    const storedEvent = localStorage.getItem('eventToEdit');
    if (storedEvent && events.length > 0) {
      try {
        const eventData = JSON.parse(storedEvent);
        const matchingEvent = events.find(e => e.id === eventData.id);
        if (matchingEvent) {
          handleShow(matchingEvent);
          // Clear stored event after opening modal
          localStorage.removeItem('eventToEdit');
        }
      } catch (error) {
        console.error('Error parsing stored event:', error);
      }
    }
  }, [events]);

  // Update the useEffect for handling stored event
  useEffect(() => {
    const storedEventData = localStorage.getItem('eventToEdit');
    
    if (storedEventData) {
      try {
        const eventData = JSON.parse(storedEventData);
        console.log('Found stored event:', eventData);

        // Wait for events to be loaded
        if (events.length > 0) {
          const matchingEvent = events.find(e => e.id === eventData.id);
          if (matchingEvent) {
            console.log('Opening modal for event:', matchingEvent);
            handleShow(matchingEvent);
            
            // Clear stored event after opening modal
            localStorage.removeItem('eventToEdit');
            
            // Scroll to the event card
            const element = document.getElementById(`event-${eventData.id}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('highlighted');
              setTimeout(() => element.classList.remove('highlighted'), 3000);
            }
          }
        }
      } catch (error) {
        console.error('Error handling stored event:', error);
        localStorage.removeItem('eventToEdit');
      }
    }
  }, [events]); // Only depend on events array

  // Update the event card rendering to include proper ID
  const renderEventCard = (event: EventType) => (
    <div 
      key={event.id} 
      id={`event-${event.id}`} 
      className="event-card admin"
      onClick={() => handleShow(event)} // Add this click handler
      style={{ cursor: 'pointer' }} // Add cursor style
    >
      {/* ... existing event card content ... */}
    </div>
  );

  return (
    <div className="admin-events-container">
      <div className="admin-event-header">
        <h2 className='event-management-title'>Event Management</h2>
        <button 
          onClick={() => handleShow()}
          className="create-event-btn"
        >
          <FaPlus /> Create New Event
        </button>
      </div>

      {isLoading && <div>Loading events...</div>}
      {error && <div className="error-message">{error}</div>}
      
      {events && events.length > 0 ? (
        <>
          <h3 className="events-section-title">Current & Upcoming Events</h3>
          <div className="events-grid">
            {sortEvents(events).currentEvents.map((event) => {
              const volunteersNeeded = event.totalVolunteers - event.currentVolunteers;
              const progress = (event.currentVolunteers / event.totalVolunteers) * 100;

              return (
                <div key={event.id} id={`event-${event.id}`} className="event-card admin">
                  <img 
                    src={event.image.startsWith('http') 
                      ? event.image 
                      : event.image.startsWith('/uploads') 
                        ? `${event.image}`
                        : '/images/default-event.png'
                    } 
                    alt={event.title} 
                    className="event-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/default-event.png';
                      console.log('Failed to load image:', event.image); // Debug log
                    }}
                  />
                  <div className="event-actions">
                    <button onClick={() => fetchParticipants(event.id)} className="participants-btn">
                      <FaUsers size={18} />
                    </button>
                    <button onClick={() => handleShow(event)} className="edit-btn">
                      <FaEdit size={18} />
                    </button>
                    <button onClick={() => handleDelete(event.id)} className="delete-btn-event">
                      <FaTrash size={18} />
                    </button>
                  </div>
                  <h4>{event.title}</h4>
                  <p><FaMapMarkerAlt size={14} className="icon" /> {event.location}</p>
                  <p><FaCalendarAlt size={14} className="icon" /> {formatDateForDisplay(event.date)}</p>
                  <p><FaClock size={14} className="icon" /> {getDisplayTime(event?.startTime, event?.endTime)}</p>
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

          {sortEvents(events).pastEvents.length > 0 && (
            <>
              <h3 className="events-section-title past-events">Past Events</h3>
              <div className="events-grid past">
                {sortEvents(events).pastEvents.map((event) => {
                  const volunteersNeeded = event.totalVolunteers - event.currentVolunteers;
                  const progress = (event.currentVolunteers / event.totalVolunteers) * 100;

                  return (
                    <div key={event.id} className="event-card admin past">
                      <img 
                        src={event.image.startsWith('http') 
                          ? event.image 
                          : event.image.startsWith('/uploads') 
                            ? `${event.image}`
                            : '/images/default-event.png'
                        } 
                        alt={event.title} 
                        className="event-image"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/default-event.png';
                          console.log('Failed to load image:', event.image); // Debug log
                        }}
                      />
                      <div className="event-actions">
                        <button onClick={() => fetchParticipants(event.id)} className="participants-btn">
                          <FaUsers size={18} />
                        </button>
                        <button onClick={() => handleShow(event)} className="edit-btn">
                          <FaEdit size={18} />
                        </button>
                        <button onClick={() => handleDelete(event.id)} className="delete-btn-event">
                          <FaTrash size={18} />
                        </button>
                      </div>
                      <h4>{event.title}</h4>
                      <p><FaMapMarkerAlt size={14} className="icon" /> {event.location}</p>
                      <p><FaCalendarAlt size={14} className="icon" /> {formatDateForDisplay(event.date)}</p>
                      <p><FaClock size={14} className="icon" /> {getDisplayTime(event?.startTime, event?.endTime)}</p>
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
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      ) : !isLoading && (
        <div>No events found</div>
      )}

      <Modal 
        show={showModal} 
        onClose={handleClose}
        title={selectedEvent ? 'Edit Event' : 'Create New Event'}
        isSubmitting={isSubmitting}
      >
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-control"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Start Time</label>
            <input
              type="time"
              className="form-control"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">End Time</label>
            <input
              type="time"
              className="form-control"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <div className="location-input-group">
              <input
                type="text"
                className="form-control"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
              <button
                type="button"
                className="map-picker-btn"
                onClick={() => setShowLocationPicker(true)}
              >
                <FaMapMarkerAlt /> Pick on Map
              </button>
            </div>
          </div>

          {/* Add these new form groups for coordinates */}
          <div className="coordinates-group">
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input
                type="text"
                className="form-control"
                value={formData.latitude || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  latitude: parseFloat(e.target.value) || null 
                })}
                placeholder="Latitude will appear here after selecting location"
                readOnly
              />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input
                type="text"
                className="form-control"
                value={formData.longitude || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  longitude: parseFloat(e.target.value) || null 
                })}
                placeholder="Longitude will appear here after selecting location"
                readOnly
              />
            </div>
          </div>

          <div className="form-group required">
            <label className="form-label">
              Event Image
              <span className="required-asterisk">*</span>
            </label>
            <div className="image-upload-container">
              {imagePreview ? (
                <div className="image-preview">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/default-event.png';
                    }}
                  />
                </div>
              ) : (
                <div className="image-preview">
                  <img 
                    src="/images/default-event.png" 
                    alt="Default preview" 
                    className="default-preview-image" 
                  />
                  <p className="no-image-overlay">No image selected</p>
                </div>
              )}
              <label className="image-upload-label">
                <FaUpload className="upload-icon" />
                {selectedEvent ? 'Change Image' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  className="image-upload-input"
                  onChange={handleImageUpload}
                  required={!selectedEvent}
                />
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              rows={3}
              className="form-control"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Total Volunteers Needed</label>
            <input
              type="number"
              className={`form-control ${validationErrors.totalVolunteers ? 'is-invalid' : ''}`}
              value={formData.totalVolunteers}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFormData({ ...formData, totalVolunteers: value });
                validateVolunteers(value, formData.currentVolunteers);
              }}
              min="1"
              required
            />
            {validationErrors.totalVolunteers && (
              <div className="invalid-feedback">
                {validationErrors.totalVolunteers}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Current Volunteers</label>
            <input
              type="number"
              className={`form-control ${validationErrors.currentVolunteers ? 'is-invalid' : ''}`}
              value={formData.currentVolunteers}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFormData({ ...formData, currentVolunteers: value });
                validateVolunteers(formData.totalVolunteers, value);
              }}
              min="0"
              max={formData.totalVolunteers}
              required
            />
            {validationErrors.currentVolunteers && (
              <div className="invalid-feedback">
                {validationErrors.currentVolunteers}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Contact Phone</label>
            <input
              type="text"
              className="form-control"
              value={formData.contact.phone}
              onChange={(e) => setFormData({
                ...formData,
                contact: { ...formData.contact, phone: e.target.value }
              })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contact Email</label>
            <input
              type="email"
              className="form-control"
              value={formData.contact.email}
              onChange={(e) => setFormData({
                ...formData,
                contact: { ...formData.contact, email: e.target.value }
              })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={formData.status}
              onChange={(e) => setFormData({ 
                ...formData, 
                status: e.target.value as 'OPEN' | 'CLOSED'
              })}
              required
            >
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div className="modal-actions">
            <button 
              type="button"
              className="event-admin-cancel" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="event-admin-submit"
              disabled={isSubmitting || !validateLocation()}
            >
              {isSubmitting 
                ? 'Saving...' 
                : (selectedEvent ? 'Update Event' : 'Create Event')
              }
            </button>
          </div>
        </form>
      </Modal>
      {showParticipantsModal && renderParticipantsModal()}
      {showLocationPicker && (
        <LocationMapPicker
          onLocationSelect={handleLocationSelect}
          initialPosition={selectedLocation || undefined}
          onClose={() => setShowLocationPicker(false)}
        />
      )}    </div>  );};

export default AdminEvents;





