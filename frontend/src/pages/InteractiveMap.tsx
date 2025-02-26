import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { Icon } from 'leaflet';
import api from '../config/axios'; // Replace axios import
import { useNavigate } from 'react-router-dom';
import '../styles/InteractiveMap.css';

interface LocationMarker {
  id: number;
  lat: number;
  lng: number;
  name: string;
  type: 'event' | 'office';
  details: any;
}

interface LocationFilter {
  ALL: 'all';
  EVENTS: 'events';
  OFFICE: 'office';
}

const LOCATION_FILTERS: LocationFilter = {
  ALL: 'all',
  EVENTS: 'events',
  OFFICE: 'office'
};

const KKMK_OFFICE_COORDINATES: [number, number] = [14.717955, 121.107932];

// Create office marker constant
const OFFICE_MARKER: LocationMarker = {
  id: -1,
  lat: KKMK_OFFICE_COORDINATES[0],
  lng: KKMK_OFFICE_COORDINATES[1],
  name: 'KapatidKita MahalKita Main Office',
  type: 'office',
  details: {
    address: 'Phase 3 Block 2, Lupang Pangako, Quezon City',
    description: 'KKMK Main Office Location'
  }
};

// Create icons
const officeIcon = new Icon({
  iconUrl: '/images/kkmk-logo.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
  className: 'office-marker'
});

const eventIcon = new Icon({
  iconUrl: '/images/default-event.jpg',
  iconSize: [35, 35],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17],
  className: 'event-marker'
});

const InteractiveMap: React.FC = () => {
  const [markers, setMarkers] = useState<LocationMarker[]>([OFFICE_MARKER]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<keyof LocationFilter>('ALL');
  const navigate = useNavigate();
  const PAYATAS_COORDINATES: [number, number] = [14.7164, 121.1194];

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${import.meta.env.VITE_API_URL}${path}`;
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/events');
        console.log('Raw response:', response.data);

        const currentDate = new Date();
        const futureEvents = response.data.filter((event: { date: string }) => {
          const eventDate = new Date(event.date);
          return eventDate >= currentDate;
        }).map((event: { image: string }) => ({
          ...event,
          image: event.image.startsWith('http') 
            ? event.image 
            : getImageUrl(event.image),
          // ...rest of mapping...
        }));

        setMarkers([OFFICE_MARKER, ...futureEvents]);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getVisibleMarkers = () => {
    return markers.filter(marker => {
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'EVENTS') return marker.type === 'event';
      if (activeFilter === 'OFFICE') return marker.type === 'office';
      return false;
    });
  };

  const renderPopupContent = (marker: LocationMarker) => {
    if (marker.type === 'office') {
      return (
        <div className="marker-popup office">
          <h3>{marker.name}</h3>
          <p><strong>Address:</strong> {marker.details.address}</p>
          <p>{marker.details.description}</p>
        </div>
      );
    }

    return (
      <div className="marker-popup event">
        <div className="marker-image-container">
          <img
            src={marker.details.image}
            alt={marker.name}
            className="marker-event-image"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/default-event.jpg';
            }}
          />
        </div>
        <h3>{marker.name}</h3>
        <p><strong>Date:</strong> {marker.details.date}</p>
        <p><strong>Location:</strong> {marker.details.address}</p>
        <p><strong>Description:</strong> {marker.details.description}</p>
        <button 
          className="view-details-btn"
          onClick={() => navigate(`/event/${marker.id}`)}
        >
          View Event Details
        </button>
      </div>
    );
  };

  return (
    <div className="interactive-map-container">
      <div className="map-header">
        <h1>Interactive Map</h1>
        <div className="map-filters">
          <select 
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as keyof LocationFilter)}
            className="location-filter"
          >
            <option value="ALL">All Locations</option>
            <option value="EVENTS">Events Only</option>
            <option value="OFFICE">Main Office</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading map...</div>
      ) : (
        <MapContainer
          center={PAYATAS_COORDINATES}
          zoom={15}
          scrollWheelZoom={true}
          className="interactive-map"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          {getVisibleMarkers().map(marker => (
            <Marker
              key={`${marker.type}-${marker.id}`}
              position={[marker.lat, marker.lng]}
              icon={marker.type === 'office' ? officeIcon : 
                new Icon({
                  iconUrl: marker.details.image,
                  iconSize: [45, 45],
                  iconAnchor: [22, 22],
                  popupAnchor: [0, -22],
                  className: 'custom-event-marker'
                })
              }
            >
              <Popup>
                {renderPopupContent(marker)}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
};

export default InteractiveMap;
