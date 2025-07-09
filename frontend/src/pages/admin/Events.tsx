import React, { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaCalendarAlt, FaClock, FaEdit, FaTrash, FaPlus, FaUsers, FaTrashAlt, FaUserPlus, FaSearch, FaTimes, FaUpload, FaBell, FaCheck } from 'react-icons/fa';
import Modal from '../../components/modals/EventModal';
import '../../styles/Events.css';
import axios from 'axios';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LatLng, L, Icon } from 'leaflet';
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


// Define skill options for the skills dropdown and badges
interface SkillOption {
  value: string;
  label: string;
  description: string;
}

const skillOptions: SkillOption[] = [
  { value: 'tutoring', label: 'Tutoring/Academic Support', description: 'Helping students with homework, teaching subjects, conducting study sessions' },
  { value: 'mentoring', label: 'Mentoring', description: 'Providing guidance, career advice, and personal development support' },
  { value: 'counseling', label: 'Community Counseling', description: 'Offering emotional support, conflict resolution, and basic mental health services' },
  { value: 'healthcare', label: 'Healthcare Support', description: 'First aid, health education, medical assistance, health awareness programs' },
  { value: 'arts_culture', label: 'Arts & Culture Programs', description: 'Teaching music, art, dance, theater, organizing cultural events' },
  { value: 'sports_recreation', label: 'Sports & Recreation', description: 'Coaching sports, organizing games, planning recreational activities' },
  { value: 'environmental', label: 'Environmental Projects', description: 'Clean-ups, recycling initiatives, environmental education' },
  { value: 'food_distribution', label: 'Food Distribution', description: 'Preparing meals, distributing food packages, managing food banks' },
  { value: 'shelter_support', label: 'Shelter Support', description: 'Working in shelters, housing programs, construction assistance' },
  { value: 'administrative', label: 'Administrative Support', description: 'Office management, data entry, record keeping, documentation' },
  { value: 'event_planning', label: 'Event Planning', description: 'Organizing community events, fundraisers, awareness programs' },
  { value: 'technical', label: 'Technical Support', description: 'Computer skills training, tech troubleshooting, digital literacy programs' },
  { value: 'elderly_support', label: 'Elderly Support', description: 'Elder care, companionship, assistance with daily activities' },
  { value: 'child_care', label: 'Child Care', description: 'Childcare services, after-school programs, recreational activities for children' },
  { value: 'translation', label: 'Translation/Interpretation', description: 'Language services for non-native speakers in the community' },
];

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
  totalScholars: number;    // Add this line
  currentScholars: number;  // Add this line
  status: 'OPEN' | 'CLOSED';
  contact: {
    phone: string;
    email: string;
  };
  startTime: string;
  endTime: string;
  latitude?: number | null;  // Add this line
  longitude?: number | null; // Add this line
  requirements?: string; // Add this line
  skillRequirements?: SkillRequirement[] | null; // Add this line
}

// Add a new interface for skill requirements
interface SkillRequirement {
  skill: string;
  count: number;
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
  skills?: string[] | null;        // Add skills field
  disability?: {                  // Add disability field
    types?: string[];
    details?: string;
  } | null;
  role: string; // Add this line to include the role
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
  totalScholars: number;    // Add this line
  currentScholars: number;  // Add this line
  status: 'OPEN' | 'CLOSED';
  contact: {
    phone: string;
    email: string;
  };
  startTime: string;
  endTime: string;
  latitude: number | null;
  longitude: number | null;
  requirements: string; // Add this line
  skillRequirements: SkillRequirement[]; // Add this line
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
      click: (e: { latlng: { lat: number; lng: number } }) => {
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

// Update this utility function for resolving image URLs to be more robust and fix image loading issues
const resolveImageUrl = (imagePath: string | null): string => {
  if (!imagePath) return '/images/default-event.png';
  
  // For debugging
  console.log('Resolving image URL for:', imagePath);
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) return imagePath;
  
  // If it starts with '/uploads', append the base URL
  if (imagePath.startsWith('/uploads')) {
    const baseUrl = axios.defaults.baseURL || 'http://localhost:5175';
    console.log(`Resolved URL: ${baseUrl}${imagePath}`);
    return `${baseUrl}${imagePath}`;
  }
  
  // For relative paths without leading slash
  if (!imagePath.startsWith('/')) {
    const baseUrl = axios.defaults.baseURL || 'http://localhost:5175';
    console.log(`Resolved relative URL: ${baseUrl}/uploads/events/${imagePath}`);
    return `${baseUrl}/uploads/events/${imagePath}`;
  }
  
  // Default fallback
  return '/images/default-event.png';
};

// Add this new function before the AdminEvents component
const approveParticipant = async (eventId: number, userId: number) => {
  try {
    await axios.put(
      `/events/${eventId}/participants/${userId}/approve`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error approving participant:', error);
    throw error;
  }
};

// Add this new function before the AdminEvents component
const rejectParticipant = async (eventId: number, userId: number, reason: string = '') => {
  try {
    await axios.put(
      `/events/${eventId}/participants/${userId}/reject`,
      { reason },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error rejecting participant:', error);
    throw error;
  }
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
    totalScholars: 0,     // Add this line
    currentScholars: 0,   // Add this line
    contact: {
      phone: '',
      email: ''
    },
    status: 'OPEN' as const,
    startTime: '',
    endTime: '',
    latitude: null,
    longitude: null,
    requirements: '', // Add this line with default empty string
    skillRequirements: [] // Initialize as empty array
  });

  const [validationErrors, setValidationErrors] = useState({
    totalVolunteers: '',
    currentVolunteers: '',
    totalScholars: '',    // Add this line
    currentScholars: ''   // Add this line
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

  const validateVolunteers = (
    totalVol: number, 
    currentVol: number,
    totalSch: number,
    currentSch: number
  ) => {
    const errors = {
      totalVolunteers: '',
      currentVolunteers: '',
      totalScholars: '',    // Add this line
      currentScholars: ''   // Add this line
    };

    // Original volunteer validations
    if (totalVol < 0) {
      errors.totalVolunteers = 'Total volunteers cannot be negative';
    }

    if (currentVol < 0) {
      errors.currentVolunteers = 'Current volunteers cannot be negative';
    }

    if (currentVol > totalVol) {
      errors.currentVolunteers = 'Current volunteers cannot exceed total volunteers';
    }

    // Add validation for scholar counts
    if (totalSch < 0) {
      errors.totalScholars = 'Total scholars cannot be negative';
    }

    if (currentSch < 0) {
      errors.currentScholars = 'Current scholars cannot be negative';
    }

    if (currentSch > totalSch) {
      errors.currentScholars = 'Current scholars cannot exceed total scholars';
    }

    setValidationErrors(errors);
    return !errors.totalVolunteers && 
           !errors.currentVolunteers &&
           !errors.totalScholars &&
           !errors.currentScholars;
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
      totalScholars: 0,     // Reset scholar counts
      currentScholars: 0,   // Reset scholar counts
      contact: {
        phone: '',
        email: ''
      },
      status: 'OPEN' as const,
      startTime: '',
      endTime: '',
      latitude: null,
      longitude: null,
      requirements: '', // Reset requirements
      skillRequirements: [] // Initialize with empty array for new events
    });
  };

const handleShow = (event?: EventType) => {
  // Capture scroll position before opening modal
  const scrollY = window.scrollY;
  document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
  
  if (event) {
    // Add explicit console logs to troubleshoot the requirements field
    console.log('Event object in handleShow:', JSON.stringify(event, null, 2));
    console.log('Event requirements value:', event.requirements);
    
    // Use our improved resolveImageUrl function
    const imageUrl = resolveImageUrl(event.image);
    console.log('Setting image preview to:', imageUrl);
    
    setImagePreview(imageUrl);
    setSelectedEvent(event);
    
    // Create a complete object of all fields for debugging purposes
    const fullFormData = {
      id: event.id.toString(),
      title: event.title,
      date: formatDateForInput(event.date),
      location: event.location,
      image: event.image,
      description: event.description,
      totalVolunteers: event.totalVolunteers || 0,
      currentVolunteers: event.currentVolunteers || 0,
      totalScholars: event.totalScholars || 0,       // Add scholar count
      currentScholars: event.currentScholars || 0,   // Add scholar count
      contact: {
        phone: event.contact?.phone || '',
        email: event.contact?.email || ''
      },
      status: event.status,
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      latitude: event.latitude || null,
      longitude: event.longitude || null,
      requirements: event.requirements || '', // Ensure requirements is populated with empty string fallback
      skillRequirements: event.skillRequirements || [] // Add skill requirements
    };
    
    console.log('Setting form data to:', fullFormData);
    setFormData(fullFormData);
    
    // Check state update after a short delay to confirm values
    setTimeout(() => {
      console.log('FormData after timeout:', formData);
    }, 100);
  } else {
    // When creating new event, clear image preview
    setImagePreview('');
    setFormData({
      id: '',
      title: '',
      date: '',
      location: '',
      image: null,
      description: '',
      totalVolunteers: 0,
      currentVolunteers: 0,
      totalScholars: 0,     // Initialize scholar counts
      currentScholars: 0,   // Initialize scholar counts
      contact: {
        phone: '',
        email: ''
      },
      status: 'OPEN' as const,
      startTime: '',
      endTime: '',
      latitude: null,
      longitude: null,
      requirements: '', // Initialize with empty string for new events
      skillRequirements: [] // Initialize with empty array for new events
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
    console.log('Fetching events from:', `${axios.defaults.baseURL}/admin/events`);
    
    const response = await axios.get('/admin/events');
    console.log('Raw response data:', JSON.stringify(response.data, null, 2));
    
    if (Array.isArray(response.data)) {
      const transformedEvents = response.data.map(event => {
        // Debug log for requirements field
        console.log(`Event ${event.id} requirements:`, event.requirements);
        console.log(`Event ${event.id} skill_requirements:`, event.skill_requirements);
        
        // Ensure skill_requirements is always an array
        const skillRequirements = Array.isArray(event.skill_requirements) 
          ? event.skill_requirements 
          : (event.skill_requirements 
            ? JSON.parse(typeof event.skill_requirements === 'string' ? event.skill_requirements : JSON.stringify(event.skill_requirements)) 
            : []);
            
        console.log(`Processed skill_requirements for event ${event.id}:`, skillRequirements);
        
        return {
          ...event,
          // No need to modify image path here, we'll use resolveImageUrl when displaying
          startTime: event.start_time || event.startTime || '',
          endTime: event.end_time || event.endTime || '',
          totalVolunteers: parseInt(event.total_volunteers || event.totalVolunteers) || 0,
          currentVolunteers: parseInt(event.current_volunteers || event.currentVolunteers) || 0,
          totalScholars: parseInt(event.total_scholars || event.totalScholars) || 0,
          currentScholars: parseInt(event.current_scholars || event.currentScholars) || 0,
          requirements: event.requirements || '', // Ensure requirements is always a string
          contact: {
            phone: event.contact_phone || event.contact?.phone || '',
            email: event.contact_email || event.contact?.email || ''
          },
          // Use our processed skillRequirements
          skillRequirements: skillRequirements
        };
      });
      
      console.log('Transformed events with skill requirements:', transformedEvents.map(e => ({
        id: e.id,
        title: e.title,
        skillRequirements: e.skillRequirements
      })));
      
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

  // Add state for managing skill allocation
  const [totalSkillsAllocated, setTotalSkillsAllocated] = useState(0);
  const [skillAllocationError, setSkillAllocationError] = useState('');

  // Add useEffect to calculate total skills allocated and validate
  useEffect(() => {
    // Filter out any empty or invalid skill requirements first
    const validSkillRequirements = formData.skillRequirements.filter(req => 
      req.skill && skillOptions.some(opt => opt.value === req.skill)
    );
    
    const total = validSkillRequirements.reduce((sum, req) => sum + req.count, 0);
    setTotalSkillsAllocated(total);
    
    if (total > formData.totalVolunteers) {
      setSkillAllocationError(`You've allocated ${total} skill positions but only have ${formData.totalVolunteers} total volunteers`);
    } else {
      setSkillAllocationError('');
    }
  }, [formData.skillRequirements, formData.totalVolunteers]);

  // Add handler for adding a skill requirement
const handleAddSkillRequirement = (selectedSkill: string) => {
  if (!selectedSkill) return;
  
  // Check if skill is already added
  if (formData.skillRequirements.some(req => req.skill === selectedSkill)) {
    toast.warning(`${skillOptions.find(opt => opt.value === selectedSkill)?.label} is already added`);
    return;
  }
  
  // Create a new array with the new skill requirement instead of mutating the existing one
  const updatedSkillRequirements = [
    ...formData.skillRequirements,
    { skill: selectedSkill, count: 1 }
  ];
  
  // Log the updated skill requirements for debugging
  console.log('Adding skill requirement:', selectedSkill);
  console.log('Updated skill requirements:', updatedSkillRequirements);
  
  setFormData(prev => ({
    ...prev,
    skillRequirements: updatedSkillRequirements
  }));
};

  // Add handler for removing a skill requirement
  const handleRemoveSkillRequirement = (skillValue: string) => {
    setFormData(prev => ({
      ...prev,
      skillRequirements: prev.skillRequirements.filter(req => req.skill !== skillValue)
    }));
  };

  // Add handler for updating skill count
  const handleSkillCountChange = (skillValue: string, count: number) => {
    setFormData(prev => ({
      ...prev,
      skillRequirements: prev.skillRequirements.map(req => 
        req.skill === skillValue ? { ...req, count } : req
      )
    }));
  };

  // Update handleSubmit to properly send requirements
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateVolunteers(formData.totalVolunteers, formData.currentVolunteers, formData.totalScholars, formData.currentScholars)) {
    return;
  }

  if (skillAllocationError) {
    toast.error(skillAllocationError);
    return;
  }

  // Add validation for coordinates
  if (!formData.latitude || !formData.longitude) {
    toast.error('Please select a location on the map');
    return;
  }

  // Filter out invalid skill requirements before submission
  const validSkillRequirements = formData.skillRequirements.filter(req => 
    req.skill && skillOptions.some(opt => opt.value === req.skill)
  );
  
  // Create a cleaned form data object with valid skill requirements
  const cleanedFormData = {
    ...formData,
    skillRequirements: validSkillRequirements
  };

  setIsSubmitting(true);
  const formDataToSend = new FormData();

  // Log all form data for debugging
  console.log('Form data before submission:', cleanedFormData);
  console.log('Requirements value:', cleanedFormData.requirements);

  // Explicitly add coordinates with proper type conversion
  formDataToSend.append('latitude', formData.latitude.toString());
  formDataToSend.append('longitude', formData.longitude.toString());
  
  // Make sure to explicitly include requirements
  console.log('Adding requirements to form data:', cleanedFormData.requirements);
  formDataToSend.append('requirements', cleanedFormData.requirements || '');

  // Process the rest of the form data
  Object.entries(cleanedFormData).forEach(([key, value]) => {
    if (key === 'contact') {
      formDataToSend.append('contactPhone', (value as { phone: string }).phone);
      formDataToSend.append('contactEmail', (value as { email: string }).email);
    } else if (key === 'image') {
      if (value instanceof File) {
        console.log('Appending image file:', value.name);
        formDataToSend.append('image', value);
      } else if (typeof value === 'string' && value) {
        // If we're updating and not changing the image, we need to send the path
        console.log('Using existing image path:', value);
        formDataToSend.append('existingImage', value);
      }
    } else if (key !== 'latitude' && key !== 'longitude' && key !== 'requirements' && key !== 'skillRequirements') {
      // Skip already handled fields
      formDataToSend.append(key, String(value === null ? '' : value));
    }
  });

  // Add skill requirements as JSON string, using the cleaned version
  formDataToSend.append('skillRequirements', JSON.stringify(cleanedFormData.skillRequirements));

  // Log all form data entries for debugging
  for (let pair of formDataToSend.entries()) {
    console.log('Form data entry:', pair[0], pair[1]);
  }

  try {
    const url = selectedEvent 
      ? `/admin/events/${selectedEvent.id}`
      : '/admin/events';
    
    console.log(`Submitting form to ${url}`);
    
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
      await axios.delete(`/events/${id}`, {
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

// Update the fetchParticipants function to include skill assignments
const fetchParticipants = async (eventId: number) => {
  // Capture scroll position before opening modal
  const scrollY = window.scrollY;
  document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
  
  try {
    setLoadingParticipants(true);
    
    // Update API call to request additional user information including role and skills
    const response = await axios.get(`/events/${eventId}/participants`, {
      params: { 
        includeDetails: true, 
        includeRole: true,
        includeSkills: true 
      }
    });
    
    console.log('Fetched participants with details:', response.data);
    setSelectedEventParticipants(response.data);
    
    // Initialize skill assignments based on assigned_skill from API
    const skillAssignments: {[userId: number]: string | null} = {};
    response.data.forEach((participant: Participant & { assigned_skill?: string }) => {
      if (participant.assigned_skill) {
        skillAssignments[participant.id] = participant.assigned_skill;
      }
    });
    
    // Set the skill assignments state
    setParticipantSkillAssignments(skillAssignments);
    
    setSelectedEvent(events.find(event => event.id === eventId) || null);
    setShowParticipantsModal(true);
  } catch (error) {
    console.error('Failed to fetch participants:', error);
    toast.error('Failed to load participants');
  } finally {
    setLoadingParticipants(false);
  }
};

  // Update handleRemoveParticipant to include a reason prompt
  const handleRemoveParticipant = async (eventId: number, userId: number) => {
    if (!eventId || isNaN(eventId)) {
      console.error('Invalid event ID:', eventId);
      return;
    }

    // Get the participant name from the list for the confirmation message
    const participant = selectedEventParticipants.find(p => p.id === userId);
    if (!participant) return;

    // Prompt for removal reason
    const reason = window.prompt(
      `Please provide a reason for removing ${participant.name} from this event (optional):`
    );

    // If the user clicks cancel on the prompt, abort the removal
    if (reason === null) return;

    try {
      await axios.delete(`/events/${eventId}/participants/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        data: { reason } // Send reason in request body
      });
      
      // Refresh participants list
      await fetchParticipants(eventId);
      // Refresh event details to update volunteer count
      await fetchEvents();
      
      // Show success message
      toast.success(`${participant.name} has been removed from the event`);
    } catch (error) {
      console.error('Failed to remove participant:', error);
      toast.error('Failed to remove participant');
    }
  };

  // Add new function to fetch volunteers
  const fetchVolunteers = async () => {
    try {
      console.log('Fetching volunteers...');
      const response = await axios.get('/admin/volunteers', {
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
        `/events/${selectedEvent.id}/add-volunteer`,
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

    await axios.post('/notifications/send', {
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

// Add this new function to handle approving participants
const handleApproveParticipant = async (eventId: number, userId: number) => {
  try {
    const button = document.querySelector(`button[data-user-id="${userId}"].approve-participant-btn`) as HTMLButtonElement;
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    }
    
    await approveParticipant(eventId, userId);
    
    // Show success animation on button
    if (button) {
      button.classList.add('approve-success');
      button.innerHTML = `
        <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
          <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
      `;
      
      // After animation, refresh participant list
      setTimeout(async () => {
        toast.success('Participant approved successfully');
        await fetchParticipants(eventId);
        await fetchEvents(); // Refresh events to update counts if needed
      }, 1500);
    } else {
      // If no button reference, just refresh the data
      toast.success('Participant approved successfully');
      await fetchParticipants(eventId);
      await fetchEvents();
    }
  } catch (error: any) {
    console.error('Failed to approve participant:', error);
    toast.error(error.response?.data?.error || 'Failed to approve participant');
    
    // Reset button if we have a reference
    const button = document.querySelector(`button[data-user-id="${userId}"].approve-participant-btn`) as HTMLButtonElement;
    if (button) {
      button.disabled = false;
      button.innerHTML = '<FaCheck size={16} />';
    }
  }
};

// Add this new state
const [rejectionReason, setRejectionReason] = useState<string>('');
const [showRejectionModal, setShowRejectionModal] = useState<boolean>(false);
const [rejectingParticipant, setRejectingParticipant] = useState<{userId: number, name: string} | null>(null);

// Add this new function to handle rejecting participants
const handleRejectParticipant = async () => {
  if (!selectedEvent || !rejectingParticipant) return;
  
  try {
    await rejectParticipant(selectedEvent.id, rejectingParticipant.userId, rejectionReason);
    
    toast.success(`Participant ${rejectingParticipant.name} was rejected`);
    
    // Refresh participants list
    await fetchParticipants(selectedEvent.id);
    
    // Refresh events to update counts
    await fetchEvents();
    
    // Close rejection modal and reset state
    setShowRejectionModal(false);
    setRejectingParticipant(null);
    setRejectionReason('');
    
  } catch (error: any) {
    console.error('Failed to reject participant:', error);
    toast.error(error.response?.data?.error || 'Failed to reject participant');
  }
};

// Add new component for rejection confirmation modal
const renderRejectionModal = () => (
  <div className="modal-overlay" onClick={() => setShowRejectionModal(false)}>
    <div 
      className="modal-content-rejection"
      onClick={e => e.stopPropagation()}
    >
      <h3>Reject Participant</h3>
      <p>
        Are you sure you want to reject <strong>{rejectingParticipant?.name}</strong> from this event?
      </p>
      
      <div className="form-group">
        <label className="form-label">Reason (optional):</label>
        <textarea
          className="form-control"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Provide a reason for rejection (will be sent to the volunteer)"
          rows={3}
        />
      </div>
      
      <div className="rejection-actions">
        <button 
          onClick={() => setShowRejectionModal(false)} 
          className="cancel-reject-btn"
        >
          Cancel
        </button>
        <button 
          onClick={handleRejectParticipant} 
          className="confirm-reject-btn"
        >
          Confirm Rejection
        </button>
      </div>
    </div>
  </div>
);

// Add this new function for bulk approval
const approveAllPendingParticipants = async (eventId: number) => {
  try {
    const pendingParticipants = selectedEventParticipants.filter(p => p.status === 'PENDING');
    if (pendingParticipants.length === 0) {
      return;
    }
    
    const button = document.querySelector('.approve-all-btn') as HTMLButtonElement;
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    }
    
    let successCount = 0;
    let failCount = 0;
    
    await Promise.all(
      pendingParticipants.map(async participant => {
        try {
          await approveParticipant(eventId, participant.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to approve participant ${participant.id}:`, error);
          failCount++;
        }
      })
    );
    
    // Show success checkmark animation
    if (button) {
      button.classList.add('approve-success');
      button.innerHTML = `
        <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
          <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
        Approved ${successCount}
      `;
      
      // Reset button after animation
      setTimeout(() => {
        button.classList.remove('approve-success');
        button.disabled = false;
        button.innerHTML = '<FaCheck /> Approve All Pending';
      }, 2000);
    }
    
    // If any failures, show error
    if (failCount > 0) {
      toast.error(`Failed to approve ${failCount} participant(s)`);
    }
    
    // Success message
    if (successCount > 0) {
      toast.success(`Successfully approved ${successCount} participant(s)`);
    }
    
    // Refresh participants list
    await fetchParticipants(eventId);
    
    // Refresh events to update counts
    await fetchEvents();
    
  } catch (error) {
    console.error('Error approving all participants:', error);
    toast.error('Failed to approve participants');
    
    // Reset button on error
    const button = document.querySelector('.approve-all-btn') as HTMLButtonElement;
    if (button) {
      button.disabled = false;
      button.innerHTML = '<FaCheck /> Approve All Pending';
    }
  }
};

// Add these state variables for bulk selection and removal
const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
const [showBulkRemoveConfirm, setShowBulkRemoveConfirm] = useState(false);
const [bulkRemoveReason, setBulkRemoveReason] = useState('');
const [isBulkRemoving, setIsBulkRemoving] = useState(false);

// Add a handler for checkbox selection
const handleParticipantSelection = (userId: number) => {
  setSelectedParticipants(prev => {
    if (prev.includes(userId)) {
      return prev.filter(id => id !== userId);
    } else {
      return [...prev, userId];
    }
  });
};

// Add handler for select/deselect all
const handleSelectAllParticipants = () => {
  if (selectedParticipants.length === selectedEventParticipants.length) {
    // If all are selected, deselect all
    setSelectedParticipants([]);
  } else {
    // Otherwise select all
    setSelectedParticipants(selectedEventParticipants.map(p => p.id));
  }
};

// Add bulk remove handler
const handleBulkRemoveParticipants = async () => {
  if (selectedParticipants.length === 0 || !selectedEvent) return;
  
  setShowBulkRemoveConfirm(true);
};

// Add function to execute bulk removal
const confirmBulkRemove = async () => {
  if (selectedParticipants.length === 0 || !selectedEvent) return;
  
  setIsBulkRemoving(true);
  
  try {
    await axios.delete(`/events/${selectedEvent.id}/participants`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      data: { 
        userIds: selectedParticipants,
        reason: bulkRemoveReason 
      }
    });
    
    toast.success(`Successfully removed ${selectedParticipants.length} participants`);
    
    // Refresh participants list and events
    await fetchParticipants(selectedEvent.id);
    await fetchEvents();
    
    // Reset state
    setSelectedParticipants([]);
    setShowBulkRemoveConfirm(false);
    setBulkRemoveReason('');
    
  } catch (error) {
    console.error('Failed to remove participants:', error);
    toast.error('Failed to remove participants');
  } finally {
    setIsBulkRemoving(false);
  }
};

// Add bulk remove confirmation modal component
const renderBulkRemoveConfirmation = () => (
  <div className="modal-overlay" onClick={() => setShowBulkRemoveConfirm(false)}>
    <div 
      className="modal-content-rejection"
      onClick={e => e.stopPropagation()}
    >
      <h3>Remove Multiple Participants</h3>
      <p>
        Are you sure you want to remove <strong>{selectedParticipants.length}</strong> participants from this event?
      </p>
      
      <div className="form-group">
        <label className="form-label">Reason (optional):</label>
        <textarea
          className="form-control"
          value={bulkRemoveReason}
          onChange={(e) => setBulkRemoveReason(e.target.value)}
          placeholder="Provide a reason for removal (will be sent to the volunteers)"
          rows={3}
        />
      </div>
      
      <div className="rejection-actions">
        <button 
          onClick={() => {
            setShowBulkRemoveConfirm(false);
            setBulkRemoveReason('');
          }}
          className="cancel-reject-btn"
          disabled={isBulkRemoving}
        >
          Cancel
        </button>
        <button 
          onClick={confirmBulkRemove}
          className="confirm-reject-btn"
          disabled={isBulkRemoving}
        >
          {isBulkRemoving ? 'Removing...' : 'Remove Participants'}
        </button>
      </div>
    </div>
  </div>
);

// Add a new component to display skills with tooltips
const SkillBadges: React.FC<{ skills: string[] }> = ({ skills }) => {
  if (!skills || skills.length === 0) return <span className="text-muted">No skills listed</span>;

  return (
    <div className="skill-badges">
      {skills.map((skill, index) => {
        // Get the full label and description from skillOptions
        const skillInfo = skillOptions.find(s => s.value === skill);
        
        return (
          <span 
            key={index} 
            className="skill-badge" 
            title={skillInfo ? `${skillInfo.label}: ${skillInfo.description}` : skill}
            data-tooltip-id={`skill-tooltip-${index}`}
          >
            {skillInfo ? skillInfo.label : skill}
          </span>
        );
      })}
    </div>
  );
};

// Add a component to display disability information
const DisabilityInfo: React.FC<{ disability: { types?: string[], details?: string } | null }> = ({ disability }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  if (!disability) return <span className="text-muted">None</span>;
  
  return (
    <div className="disability-info-container">
      <div className="disability-types">
        {disability.types?.map((type, index) => (
          <span key={index} className="disability-type-badge">
            {type}
          </span>
        ))}
      </div>
      
      {disability.details && (
        <div className="disability-details">
          <button 
            className="details-toggle-btn"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
          
          {showDetails && (
            <div className="details-content">
              {disability.details}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Add a new groupParticipantsByRole function
const groupParticipantsByRole = (participants: Participant[]) => {
  return participants.reduce((acc, participant) => {
    // Check user role from the participant object
    // Since we don't have the role in the Participant interface currently, let's modify the query
    const role = participant.role || 'volunteer'; // Default to volunteer if role is not specified
    
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(participant);
    return acc;
  }, {} as Record<string, Participant[]>);
};

// Fix the renderParticipantsModal function
// Add new state for managing skill assignments
const [participantSkillAssignments, setParticipantSkillAssignments] = useState<{
  [userId: number]: string | null
}>({});

// Add new function to handle skill assignment change
const handleSkillAssignmentChange = (userId: number, skillValue: string) => {
  setParticipantSkillAssignments(prev => ({
    ...prev,
    [userId]: skillValue === '' ? null : skillValue
  }));
};

// Update the saveSkillAssignment function to use the API
// Function to save skill assignment that calls the API
const saveSkillAssignment = async (userId: number, skillValue: string | null) => {
  if (!selectedEvent) return;
  
  // Declare saveButton variable outside try/catch so it's accessible in both blocks
  let saveButton: HTMLButtonElement | null = null;
  
  try {
    // Set the button to loading state
    saveButton = document.querySelector(`button[data-save-skill="${userId}"]`) as HTMLButtonElement;
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    }
    
    // Call the API to assign the skill
    const response = await axios.put(
      `/events/${selectedEvent.id}/participants/${userId}/skill`,
      { skill: skillValue },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    console.log('Skill assignment saved:', response.data);
    
    // Show success toast
    toast.success(`Skill ${skillValue ? 'assigned' : 'removed'} successfully`);
    
    // Reset the button after success
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = '<svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/><path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>';
      
      // Reset button to normal after animation
      setTimeout(() => {
        if (saveButton) {
          saveButton.innerHTML = '<svg class="svg-inline--fa fa-check" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"></path></svg>';
        }
      }, 2000);
    }
    
  } catch (error) {
    console.error('Error saving skill assignment:', error);
    
    // Show error toast with specific message if available
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      toast.error(error.response.data.error);
    } else {
      toast.error('Failed to save skill assignment');
    }
    
    // Reset the button on error
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = '<svg class="svg-inline--fa fa-check" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"></path></svg>';
    }
  }
};

// Add a function to get available skills that match the event requirements
const getAvailableSkillsForAssignment = (eventSkillRequirements: SkillRequirement[]) => {
  // If no requirements are specified, return all skills
  if (!eventSkillRequirements || eventSkillRequirements.length === 0) {
    return skillOptions;
  }
  
  // Only return skills that are needed for this event
  return skillOptions.filter(skillOption => 
    eventSkillRequirements.some(req => req.skill === skillOption.value)
  );
};

// Add function to get the counts of currently assigned skills
const getCurrentSkillAssignmentCounts = (participants: Participant[]) => {
  const counts: {[skillValue: string]: number} = {};
  
  participants.forEach(participant => {
    const assignedSkill = participantSkillAssignments[participant.id];
    if (assignedSkill) {
      counts[assignedSkill] = (counts[assignedSkill] || 0) + 1;
    }
  });
  
  return counts;
};

const renderParticipantsModal = () => {
  // Group participants by role
  const participantsByRole = groupParticipantsByRole(selectedEventParticipants);
  
  // Get volunteers and scholars separately
  const volunteers = participantsByRole['volunteer'] || [];
  const scholars = participantsByRole['scholar'] || [];
  
  // Get the available skills that match event requirements
  const availableSkills = selectedEvent?.skillRequirements 
    ? getAvailableSkillsForAssignment(selectedEvent.skillRequirements)
    : skillOptions;
  
  // Get current counts of assigned skills
  const currentAssignmentCounts = getCurrentSkillAssignmentCounts(volunteers);
  
  // Calculate remaining slots for each skill requirement
  const remainingSlots: {[skillValue: string]: number} = {};
  if (selectedEvent?.skillRequirements) {
    selectedEvent.skillRequirements.forEach(req => {
      const assigned = currentAssignmentCounts[req.skill] || 0;
      remainingSlots[req.skill] = req.count - assigned;
    });
  }
  
  return (
    <div className="modal-overlay" onClick={() => setShowParticipantsModal(false)}>
      <div 
        className={`modal-content-participants ${showSuggestions && searchResults.length > 0 ? 'with-suggestions' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="participants-header">
          <h2>Event Participants</h2>
          <div className="participants-actions">
            {selectedEvent && selectedEventParticipants.some(p => p.status === 'PENDING') && (
              <button
                onClick={() => selectedEvent && approveAllPendingParticipants(selectedEvent.id)}
                className="approve-all-btn"
                title="Approve all pending participants"
              >
                <FaCheck /> Approve All Pending
              </button>
            )}
            
            {/* Add bulk actions */}
            {selectedEventParticipants.length > 0 && (
              <div className="bulk-actions">
                {selectedParticipants.length > 0 ? (
                  <button 
                    onClick={handleBulkRemoveParticipants}
                    className="bulk-remove-btn"
                    title="Remove selected participants"
                  >
                    <FaTrash /> Remove Selected ({selectedParticipants.length})
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Add this skill requirements summary section */}
{selectedEvent?.skillRequirements && selectedEvent.skillRequirements.length > 0 && (
  <div className="skill-requirements-summary">
    <h4>Skill Requirements</h4>
    <div className="skill-assignment-badges">
      {selectedEvent.skillRequirements.map(req => {
        const skillInfo = skillOptions.find(opt => opt.value === req.skill);
        const assigned = currentAssignmentCounts[req.skill] || 0;
        const remaining = req.count - assigned;
        
        return (
          <div key={req.skill} className={`skill-assignment-badge ${remaining > 0 ? 'needs-more' : 'filled'}`}>
            <span className="skill-name">{skillInfo?.label || req.skill}</span>
            <span className="skill-count">
              {assigned}/{req.count} assigned
            </span>
          </div>
        );
      })}
    </div>
  </div>
)}
        
        {/* Rest of volunteer search container */}
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
          {/* Volunteers Section */}
          <h3 className="participant-section-title">Volunteers ({volunteers.length})</h3>
          {volunteers.length > 0 ? (
            <table className="participants-table">
              <thead>
                <tr>
                  <th>
                    <input 
                      type="checkbox" 
                      checked={selectedParticipants.length === volunteers.length && volunteers.length > 0}
                      onChange={() => {
                        // Modify this to only select/deselect volunteers
                        if (selectedParticipants.length === volunteers.length && volunteers.length > 0) {
                          setSelectedParticipants(prev => 
                            prev.filter(id => !volunteers.some(v => v.id === id))
                          );
                        } else {
                          setSelectedParticipants(prev => [
                            ...prev.filter(id => !volunteers.some(v => v.id === id)),
                            ...volunteers.map(v => v.id)
                          ]);
                        }
                      }}
                      className="select-all-checkbox"
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                  <th>Skills</th>
                  <th>Disability</th>
                  <th>Assigned Skill</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map((participant) => (
                  <tr key={participant.id}>
                    <td>
                      <input 
                        type="checkbox"
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={() => handleParticipantSelection(participant.id)}
                        className="participant-checkbox"
                      />
                    </td>
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
                      <SkillBadges skills={participant.skills || []} />
                    </td>
                    <td>
                      <DisabilityInfo disability={participant.disability || null} />
                    </td>
                    <td className="skill-assignment-cell">
  <div className="skill-assignment-wrapper">
    <select
      value={participantSkillAssignments[participant.id] || ''}
      onChange={(e) => handleSkillAssignmentChange(participant.id, e.target.value)}
      className="skill-assignment-select"
      disabled={participant.status !== 'ACTIVE'}
    >
                    <option value="">None</option>
      {availableSkills.map(skill => {
        const isAvailable = !selectedEvent?.skillRequirements || 
          (remainingSlots[skill.value] > 0 || 
           participantSkillAssignments[participant.id] === skill.value);
        
        return (
          <option
            key={skill.value}
            value={skill.value}
            disabled={!isAvailable || participant.status !== 'ACTIVE'}
          >
            {skill.label} {remainingSlots[skill.value] <= 0 && participantSkillAssignments[participant.id] !== skill.value ? '(Full)' : ''}
          </option>
        );
      })}
    </select>

  </div>
</td>
                    <td>
                      <div className="participant-actions">
                        {/* Existing participant action buttons */}
                        {participant.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => selectedEvent && handleApproveParticipant(selectedEvent.id, participant.id)}
                              className="approve-participant-btn"
                              title="Approve participant"
                              data-user-id={participant.id}
                              disabled={!selectedEvent}
                            >
                              <FaCheck size={16} />
                            </button>
                            
                            <button
                              onClick={() => {
                                setRejectingParticipant({
                                  userId: participant.id,
                                  name: participant.name
                                });
                                setShowRejectionModal(true);
                              }}
                              className="reject-participant-btn"
                              title="Reject participant"
                              disabled={!selectedEvent}
                            >
                              <FaTimes size={15} />
                            </button>
                          </>
                        ) : null}
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
            <p>No volunteer participants yet</p>
          )}
          
          {/* Scholars Section - New */}
          <h3 className="participant-section-title scholar-section-title">Scholars ({scholars.length})</h3>
          {scholars.length > 0 ? (
            <table className="participants-table scholars-table">
              <thead>
                <tr>
                  <th>
                    <input 
                      type="checkbox" 
                      checked={selectedParticipants.length === scholars.length && scholars.length > 0}
                      onChange={() => {
                        // Select/deselect only scholars
                        if (selectedParticipants.length === scholars.length && scholars.length > 0) {
                          setSelectedParticipants(prev => 
                            prev.filter(id => !scholars.some(s => s.id === id))
                          );
                        } else {
                          setSelectedParticipants(prev => [
                            ...prev.filter(id => !scholars.some(s => s.id === id)),
                            ...scholars.map(s => s.id)
                          ]);
                        }
                      }}
                      className="select-all-checkbox"
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scholars.map((participant) => (
                  <tr key={participant.id}>
                    <td>
                      <input 
                        type="checkbox"
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={() => handleParticipantSelection(participant.id)}
                        className="participant-checkbox"
                      />
                    </td>
                    <td>
                      <div className="participant-info">
                        <img 
                          src={participant.profile_photo || '/images/default-avatar.jpg'} 
                          alt={participant.name}
                          className="participant-avatar scholar-avatar"
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
                        {participant.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => selectedEvent && handleApproveParticipant(selectedEvent.id, participant.id)}
                              className="approve-participant-btn"
                              title="Approve participant"
                              data-user-id={participant.id}
                              disabled={!selectedEvent}
                            >
                              <FaCheck size={16} />
                            </button>
                            
                            <button
                              onClick={() => {
                                setRejectingParticipant({
                                  userId: participant.id,
                                  name: participant.name
                                });
                                setShowRejectionModal(true);
                              }}
                              className="reject-participant-btn"
                              title="Reject participant"
                              disabled={!selectedEvent}
                            >
                              <FaTimes size={15} />
                            </button>
                          </>
                        ) : null}
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
            <p>No scholar participants yet</p>
          )}
        </div>
        
        <div className="automated-reminders-info">
          <p>
            <FaBell className="reminder-icon" /> 
            Automated reminder emails and notifications are sent 
            <span className="reminder-timing">  7 days before </span> and 
            <span className="reminder-timing">  1 day before </span> 
            the event to all approved participants
          </p>
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
};

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
    const openParticipants = params.get('participants') === 'true';
    
    if (highlightId && events.length > 0) {
      // Find the event
      const eventToHighlight = events.find(e => e.id.toString() === highlightId);
      
      if (eventToHighlight) {
        // First scroll to the event
        const element = document.getElementById(`event-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlighted');
          
          // Check if we should open the participants modal directly
          if (openParticipants) {
            console.log('Opening participants for event:', eventToHighlight);
            // First select the event 
            setSelectedEvent(eventToHighlight);
            // Then fetch participants and open the modal
            fetchParticipants(eventToHighlight.id);
          } else {
            // Otherwise just open the event details modal
            handleShow(eventToHighlight);
          }
          
          // Remove highlight after animation
          setTimeout(() => {
            element.classList.remove('highlighted');
          }, 3000);
        }
      }
      
      // Clean up URL query params after processing
      if (history && history.replaceState) {
        const cleanUrl = window.location.pathname;
        history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, [events]); // Depend on events array

// Add another useEffect for handling localStorage flag specifically
useEffect(() => {
  // Check for stored ID to open participants modal
  const participantEventId = localStorage.getItem('openEventParticipantsModal');
  
  if (participantEventId && events.length > 0) {
    const eventId = parseInt(participantEventId);
    const event = events.find(e => e.id === eventId);
    
    if (event) {
      console.log('Opening participants modal for event:', event.title);
      // First select the event
      setSelectedEvent(event);
      // Then fetch participants and open the modal
      fetchParticipants(eventId);
      
      // Clean up localStorage
      localStorage.removeItem('openEventParticipantsModal');
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

  // Add a component to render the skill requirements section
const renderSkillRequirements = () => {
  // Get skills that haven't been added yet
  const availableSkills = skillOptions.filter(
    opt => !formData.skillRequirements.some(req => req.skill === opt.value)
  );
  
  // Filter out any empty or invalid skill requirements
  const validSkillRequirements = formData.skillRequirements.filter(req => 
    req.skill && skillOptions.some(opt => opt.value === req.skill)
  );
  
  return (
    <div className="form-group skill-requirements-section">
      <label className="form-label">
        Volunteer Skill Requirements
        <span className="field-help">(Optional - Specify roles needed for this event)</span>
      </label>
      
      <div className="skill-allocation-info">
        <span className={skillAllocationError ? 'text-danger' : ''}>
          {totalSkillsAllocated} of {formData.totalVolunteers} volunteers allocated to specific skills
        </span>
        {skillAllocationError && (
          <div className="allocation-error">{skillAllocationError}</div>
        )}
      </div>
      
      <div className="skill-requirements-list">
        {validSkillRequirements.map((req) => {
          const skillInfo = skillOptions.find(opt => opt.value === req.skill);
          if (!skillInfo) return null; // Skip rendering if no matching skill info is found
          
          return (
            <div key={req.skill} className="skill-requirement-item">
              <div className="skill-info">
                <strong>{skillInfo.label}</strong>
                <small>{skillInfo.description}</small>
              </div>
              <div className="skill-controls">
                <input
                  type="number"
                  value={req.count}
                  onChange={(e) => handleSkillCountChange(req.skill, parseInt(e.target.value) || 0)}
                  min="1"
                  max={formData.totalVolunteers}
                  className="skill-count-input"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSkillRequirement(req.skill)}
                  className="remove-skill-btn"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {availableSkills.length > 0 && (
        <div className="add-skill-container">
          <div className="skill-dropdown-container">
            <select 
              className="skill-dropdown"
              onChange={(e) => {
                if (e.target.value) {
                  handleAddSkillRequirement(e.target.value);
                  e.target.value = ''; // Reset dropdown after selection
                }
              }}
              value=""
            >
              <option value="" disabled>Select a skill to add...</option>
              {availableSkills.map(skill => (
                <option key={skill.value} value={skill.value}>
                  {skill.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {validSkillRequirements.length === 0 && (
        <div className="no-skills-message">
          No skills added yet. Use the dropdown above to add specific skills needed for this event.
        </div>
      )}
    </div>
  );
};

  // Add a component to display skill requirements on the event card
  const renderSkillRequirementsBadges = (requirements: SkillRequirement[]) => {
    if (!requirements || requirements.length === 0) return null;
    
    return (
      <div className="skill-requirements-badges">
        <h6>Skills Needed:</h6>
        <div className="badges-container">
          {requirements.map(req => {
            const skillInfo = skillOptions.find(opt => opt.value === req.skill);
            return (
              <span key={req.skill} className="skill-requirement-badge" title={skillInfo?.description}>
                {skillInfo?.label}: {req.count}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

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
              const scholarsNeeded = event.totalScholars - event.currentScholars;
              const volunteerProgress = (event.currentVolunteers / event.totalVolunteers) * 100;
              const scholarProgress = (event.currentScholars / event.totalScholars) * 100;

              return (
                <div key={event.id} id={`event-${event.id}`} className="event-card admin">
                  <img 
                    src={resolveImageUrl(event.image)} 
                    alt={event.title} 
                    className="event-image"
                    onError={(e) => {
                      console.error('Failed to load image:', event.image);
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/default-event.png';
                      target.onerror = null; // Prevent infinite loop
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
                  
                  {/* Volunteer progress section */}
                  <div className="progress-section">
                    <h5>Volunteer Progress</h5>
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
                    <p className="volunteers-needed">
                      {volunteersNeeded > 0
                        ? `${volunteersNeeded} more volunteers needed`
                        : "No more volunteers needed"}
                    </p>
                  </div>
                  
                  {/* Scholar progress section */}
                  <div className="progress-section">
                    <h5>Scholar Progress</h5>
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
                    <p className="scholars-needed">
                      {scholarsNeeded > 0
                        ? `${scholarsNeeded} more scholars needed`
                        : "No more scholars needed"}
                    </p>
                  </div>
                  
                  {/* Add skill requirements badges before status */}
                  {event.skillRequirements && event.skillRequirements.length > 0 && 
                    renderSkillRequirementsBadges(event.skillRequirements)
                  }
                  
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
                        src={resolveImageUrl(event.image)} 
                        alt={event.title} 
                        className="event-image"
                        onError={(e) => {
                          console.error('Failed to load image:', event.image);
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/default-event.png';
                          target.onerror = null; // Prevent infinite loop
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
          
          {/* Add the requirements field */}
          <div className="form-group">
            <label className="form-label">
              Event Requirements
              <span className="field-help">(List any specific requirements for volunteers)</span>
            </label>
            <textarea
              rows={4}
              className="form-control"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
            />
            {!formData.requirements && (
              <div className="requirements-example">
                <small className="text-muted">
                  Suggested format:
                  <ul className="mt-1">
                    <li>Must be 18 years or older</li>
                    <li>Comfortable working outdoors</li>
                    <li>CPR certification (if relevant)</li>
                    <li>Specific skills needed</li>
                  </ul>
                </small>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Total Volunteers</label>
            <input
              type="number"
              className={`form-control ${validationErrors.totalVolunteers ? 'is-invalid' : ''}`}
              value={formData.totalVolunteers}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFormData({ ...formData, totalVolunteers: value });
                validateVolunteers(value, formData.currentVolunteers, formData.totalScholars, formData.currentScholars);
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

          {/* Add the skill requirements section after total volunteers */}
          {renderSkillRequirements()}

          <div className="form-group">
            <label className="form-label">Current Volunteers</label>
            <input
              type="number"
              className={`form-control ${validationErrors.currentVolunteers ? 'is-invalid' : ''}`}
              value={formData.currentVolunteers}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFormData({ ...formData, currentVolunteers: value });
                validateVolunteers(formData.totalVolunteers, value, formData.totalScholars, formData.currentScholars);
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
            <label className="form-label">Total Scholars</label>
            <input
              type="number"
              className={`form-control ${validationErrors.totalScholars ? 'is-invalid' : ''}`}
              value={formData.totalScholars}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFormData({ ...formData, totalScholars: value });
                validateVolunteers(formData.totalVolunteers, formData.currentVolunteers, value, formData.currentScholars);
              }}
              min="0"
              required
            />
            {validationErrors.totalScholars && (
              <div className="invalid-feedback">
                {validationErrors.totalScholars}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Current Scholars</label>
            <input
              type="number"
              className={`form-control ${validationErrors.currentScholars ? 'is-invalid' : ''}`}
              value={formData.currentScholars}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFormData({ ...formData, currentScholars: value });
                validateVolunteers(formData.totalVolunteers, formData.currentVolunteers, formData.totalScholars, value);
              }}
              min="0"
              max={formData.totalScholars}
              required
            />
            {validationErrors.currentScholars && (
              <div className="invalid-feedback">
                {validationErrors.currentScholars}
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
        <LocationMapPicker          onLocationSelect={handleLocationSelect}          initialPosition={selectedLocation || undefined}          onClose={() => setShowLocationPicker(false)}        />
      )}
      {/* Add the bulk remove confirmation modal */}
      {showBulkRemoveConfirm && renderBulkRemoveConfirmation()}
      {showRejectionModal && renderRejectionModal()}
      </div>  );};

export default AdminEvents;

