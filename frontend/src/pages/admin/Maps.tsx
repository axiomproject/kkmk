import React, { useState, useEffect, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon,
  useMap,
  useMapEvents  // Add this import
} from 'react-leaflet';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import api from '../../config/axios'; // Replace axios import
import L from 'leaflet';
import { Icon, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import '../../styles/AdminMap.css';
import { useNavigate } from 'react-router-dom';

// Add this constant for directions URL
const GOOGLE_MAPS_DIRECTIONS_URL = "https://www.google.com/maps/dir/?api=1";

// Import marker icons directly
import markerIcon2x from '../../img/Emil.jpg';
import markerIcon from '../../img/hya.jpg';
import markerShadow from '../../img/jason.jpg';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

// Create a default marker icon
const defaultIcon = new Icon({
  iconUrl: '../../img/Emil.jpg',
  iconRetinaUrl: '../../img/hya.jpg',
  shadowUrl: '../../img/jason.jpg',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const KKMK_OFFICE_COORDINATES: [number, number] = [14.717955, 121.107932];

interface LocationMarker {
  id: number;
  lat: number;
  lng: number;
  name: string;
  type: 'church' | 'event' | 'scholar' | 'office';  // Add 'office' type
  details: any;  // Store any additional type-specific data
  intensity?: number;  // Add this for heatmap
}

// Update the interface for events with coordinates
interface DBEvent {
  id: number;
  title: string;
  date: string;
  description: string;
  location: string;
  latitude: string;  // Changed to string since it comes from API
  longitude: string; // Changed to string since it comes from API
  status: 'OPEN' | 'CLOSED';
  image?: string;
}

interface Church {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
}

interface Event {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  date: string;
  description: string;
}

interface Scholar {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  profile_photo?: string;
}

// Add this new component before AdminMap
const PersistentPopup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const map = useMapEvents({
    popupclose: (e) => {
      e.popup.openOn(map);
    }
  });
  return null;
};

enum MapType {
  STANDARD = 'standard',
  HEATMAP = 'heatmap'
}

enum LocationType {
  ALL = 'all',
  EVENTS = 'events',
  CHURCHES = 'churches',
  SCHOLARS = 'scholars',
  OFFICE = 'office'  // Add this line
}

interface SectorData {
  scholars: LocationMarker[];
  events: LocationMarker[];
  total: number;
  distributions: number;
  distributionPercentage: number;
}

// Define the polygon coordinates outside components
const PAYATAS_POLYGON: [number, number][] = [
  [14.7297784, 121.1183808],
  [14.7284917, 121.1174367],
  // ... (keep all the other coordinates)
  [14.7297784, 121.1183808]
];

// Define the three sectors of Payatas
interface Sector {
  coordinates: [number, number][];
  color: string;
  name: string;
}

const PAYATAS_SECTORS: Record<string, Sector> = {
  NORTH: {
    coordinates: [
      [14.7297784, 121.1183808], // Start from northernmost point
      [14.7264579, 121.1215136],
      [14.7247147, 121.1214278],
      [14.7189038, 121.1200116],
      [14.7213527, 121.1105702],
      [14.7220583, 121.1085103],
      [14.7223488, 121.1069653],
      [14.7230545, 121.1058495],
      [14.7231375, 121.1052487],
      [14.7226809, 121.1036179],
      [14.7297784, 121.1183808]  // Close the polygon
    ] as [number, number][],
    color: '#4A90E2', // More professional blue
    name: 'Payatas C'
  },
  CENTRAL: {
    coordinates: [
      [14.7226809, 121.1036179],
      [14.7220583, 121.1032746],
      [14.7209791, 121.101558],
      [14.7186547, 121.1005709],
      [14.717119, 121.100528],
      [14.7164134, 121.099541],
      [14.7149606, 121.0977385],
      [14.7141304, 121.0919879],
      [14.7087343, 121.1146901],
      [14.7133003, 121.1162779],
      [14.7189038, 121.1200116],
      [14.7213527, 121.1105702],
      [14.7220583, 121.1085103],
      [14.7226809, 121.1036179]  // Close the polygon
    ] as [number, number][],
    color: '#50C878', // Professional green
    name: 'Payatas B'
  },
  SOUTH: {
    coordinates: [
      [14.7141304, 121.0919879],
      [14.7135078, 121.0899708],
      [14.7091909, 121.0854647],
      [14.7048325, 121.0889409],
      [14.7032966, 121.0891554],
      [14.7027985, 121.0891554],
      [14.7027985, 121.0937045],
      [14.7023003, 121.1022017],
      [14.7027985, 121.1059353],
      [14.7052475, 121.1108706],
      [14.7067419, 121.1139176],
      [14.7087343, 121.1146901],
      [14.7141304, 121.0919879]  // Close the polygon
    ] as [number, number][],
    color: '#FFD700', // Professional gold
    name: 'Payatas A'
  }
};

// Add helper function to check if a point is inside a polygon
const isPointInPolygon = (point: [number, number], polygon: [number, number][]) => {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Add new interfaces for sector statistics
interface SectorStats {
  scholars: number;
  events: number;
  total: number;
}

interface SectorStatistics {
  NORTH: SectorStats;
  CENTRAL: SectorStats;
  SOUTH: SectorStats;
}

// Update the HeatmapLayer component to prevent duplicate legends
const HeatmapLayer: React.FC<{ points: LocationMarker[], polygon: [number, number][], sectorData: Record<string, SectorData> }> = ({ polygon, sectorData }) => {
  const map = useMap();
  const layersRef = useRef<any[]>([]);
  const legendRef = useRef<any>(null);
  const statsLegendRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    try {
      // Clear existing layers
      if (layersRef.current) {
        layersRef.current.forEach(layer => {
          if (layer) map.removeLayer(layer);
        });
        layersRef.current = [];
      }
      
      // Remove existing legends
      if (legendRef.current) {
        legendRef.current.remove();
        legendRef.current = null;
      }
      
      if (statsLegendRef.current) {
        statsLegendRef.current.remove();
        statsLegendRef.current = null;
      }

      // Remove any existing legends with the same class names that might be left over
      const existingLegends = document.querySelectorAll('.sector-progress-container, .stats-legend');
      existingLegends.forEach(element => {
        element.parentNode?.removeChild(element);
      });

      // Calculate total scholars and events for percentages
      const totalScholars = Object.values(sectorData).reduce((sum, data) => 
        sum + data.scholars.length, 0);
      const totalEvents = Object.values(sectorData).reduce((sum, data) => 
        sum + data.events.length, 0);

      // Create sector polygons with updated labels
      Object.entries(PAYATAS_SECTORS).forEach(([sectorName, sector]) => {
        const stats = sectorData[sectorName];
        const scholarCount = stats.scholars.length;
        const eventCount = stats.events.length;
        const scholarPercentage = totalScholars > 0 ? (scholarCount / totalScholars * 100) : 0;
        const eventPercentage = totalEvents > 0 ? (eventCount / totalEvents * 100) : 0;
        
        // Base opacity on combined percentage
        const opacity = 0.2 + ((scholarCount + eventCount) / (totalScholars + totalEvents) * 0.6);

        const sectorPolygon = L.polygon(sector.coordinates, {
          color: sector.color,
          weight: 2,
          fillOpacity: opacity,
          fillColor: sector.color
        }).addTo(map);

        const bounds = sectorPolygon.getBounds();
        const center = bounds.getCenter();
        
        // Enhanced label with both scholar and event stats
        const label = L.divIcon({
          className: 'sector-percentage-label',
          html: `
           
          `,
          iconSize: [140, 100]
        });

        const labelMarker = L.marker(center, {
          icon: label,
          interactive: false
        }).addTo(map);

        layersRef.current.push(sectorPolygon, labelMarker);

        // Add click handler to show popup
        sectorPolygon.on('click', () => {
          const stats = sectorData[sectorName];
          const totalScholars = Object.values(sectorData).reduce((sum, data) => 
            sum + data.scholars.length, 0);
          const totalEvents = Object.values(sectorData).reduce((sum, data) => 
            sum + data.events.length, 0);
          const totalDistributions = Object.values(sectorData).reduce((sum, data) => 
            sum + data.distributions, 0);
        
          const scholarPercentage = totalScholars > 0 ? 
            (stats.scholars.length / totalScholars * 100).toFixed(1) : 0;
          const eventPercentage = totalEvents > 0 ? 
            (stats.events.length / totalEvents * 100).toFixed(1) : 0;
          const distributionPercentage = stats.distributionPercentage.toFixed(1);
          
          const total = stats.scholars.length + stats.events.length;
          const grandTotal = totalScholars + totalEvents;
          const totalPercentage = ((total / grandTotal) * 100).toFixed(1);
        
          const popupContent = L.DomUtil.create('div', 'sector-click-popup');
          popupContent.innerHTML = `
            <h3>${PAYATAS_SECTORS[sectorName].name} Statistics</h3>
            <div class="sector-stats-list">
              <div class="sector-stat-row">
                <span>Scholars</span>
                <span class="stat-percentage">${scholarPercentage}%</span>
              </div>
              <div class="sector-stat-row">
                <span>Events</span>
                <span class="stat-percentage">${eventPercentage}%</span>
              </div>
                 <div class="sector-stat-row">
                 <div class="sector-events-list">
                <h6>Events in this Area</h4>
                <ul>
                  ${stats.events.map(eventMarker => `
                    <li>${eventMarker.name}</li>
                  `).join('')}
                </ul>
              </div>
              </div>
              <div class="sector-stat-row">
                <span>Items Distributed</span>
                <span class="stat-percentage">${distributionPercentage}%</span>
              </div>
              <div class="sector-stat-row total-row">
                <span>Total Coverage</span>
                <span class="stat-percentage">${totalPercentage}%</span>
              </div>
            </div>
            
            ${stats.events.length > 0 ? `
             
            ` : ''}
          `;
        
          const bounds = sectorPolygon.getBounds();
          const popupLocation = bounds.getCenter();
          
          L.popup({
            className: 'sector-click-popup-wrapper',
            offset: [0, -10]
          })
            .setLatLng(popupLocation)
            .setContent(popupContent)
            .openOn(map);
        });
      });

      // Calculate total distributions at a higher scope so it's available throughout the component
      const totalDistributions = Object.values(sectorData).reduce((sum, data) => sum + data.distributions, 0);

      // Create and add the progress bar control
      const ProgressBar = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd: function() {
          const div = L.DomUtil.create('div', 'sector-progress-container');
          
          div.innerHTML = `
            <h4>Distribution Progress by Area</h4>
            <div class="sector-progress-bar">
              <div class="progress-segments">
                ${Object.entries(sectorData)
                  .sort((a, b) => b[1].distributionPercentage - a[1].distributionPercentage)
                  .map(([name, stats]) => `
                    <div class="progress-segment" 
                         style="width: ${stats.distributionPercentage}%; 
                                background-color: ${PAYATAS_SECTORS[name].color};">
                    </div>
                  `).join('')}
              </div>
              <div class="progress-labels">
                ${Object.entries(sectorData)
                  .sort((a, b) => b[1].distributionPercentage - a[1].distributionPercentage)
                  .map(([name, stats]) => `
                    <div class="progress-label">
                      <span class="color-dot" style="background-color: ${PAYATAS_SECTORS[name].color}"></span>
                      <span class="sector-name">${PAYATAS_SECTORS[name].name}</span>
                      <span class="distribution-count">${stats.distributions} items</span>
                      <span class="percentage-value">${stats.distributionPercentage.toFixed(1)}%</span>
                    </div>
                  `).join('')}
              </div>
              <div class="total-progress">
                Total Distributions: <strong>${totalDistributions}</strong>
              </div>
            </div>
          `;
          return div;
        }
      });

      legendRef.current = new ProgressBar().addTo(map);

      // Update legend content to include both scholar and event volumes
      const Legend = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function() {
          const div = L.DomUtil.create('div', 'info legend stats-legend');
          const totalScholars = Object.values(sectorData).reduce((sum, data) => 
            sum + data.scholars.length, 0);
          const totalEvents = Object.values(sectorData).reduce((sum, data) => 
            sum + data.events.length, 0);
          
          div.innerHTML = `
            <h4>Distribution by Sector</h4>
            <div class="sector-summary">
              ${Object.entries(sectorData).map(([name, data]) => `
                <div class="sector-legend-item">
                  <div class="sector-legend-header">
                    <span class="color-box" style="background-color: ${PAYATAS_SECTORS[name].color}"></span>
                    <span class="sector-name">${PAYATAS_SECTORS[name].name}</span>
                  </div>
                  <div class="sector-legend-stats">
                    <div class="stat-item">
                      <span>Scholars:</span>
                      <strong>${data.scholars.length}</strong>
                      <span>(${(data.scholars.length / totalScholars * 100).toFixed(1)}%)</span>
                    </div>
                    <div class="stat-item">
                      <span>Events:</span>
                      <strong>${data.events.length}</strong>
                      <span>(${(data.events.length / totalEvents * 100).toFixed(1)}%)</span>
                    </div>
                    <div class="stat-item">
                      <span>Distributions:</span>
                      <strong>${data.distributions}</strong>
                      <span>(${data.distributionPercentage.toFixed(1)}%)</span>
                    </div>
                    <div class="stat-item total">
                      <span>Total:</span>
                      <strong>${data.total}</strong>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="legend-totals">
              <div class="total-item">
                <span>Total Scholars:</span>
                <strong>${totalScholars}</strong>
              </div>
              <div class="total-item">
                <span>Total Events:</span>
                <strong>${totalEvents}</strong>
              </div>
              <div class="total-item">
                <span>Total Distributions:</span>
                <strong>${totalDistributions}</strong>
              </div>
              <div class="total-item grand-total">
                <span>Total Locations:</span>
                <strong>${totalScholars + totalEvents}</strong>
              </div>
            </div>
          `;
          return div;
        }
      });

      // Add legend to map
      statsLegendRef.current = new Legend().addTo(map);
      
      // Store the legends in the layers ref to track them
      layersRef.current.push(legendRef.current, statsLegendRef.current);

    } catch (error) {
      console.error('Error setting up sector visualization:', error);
    }

    return () => {
      // Proper cleanup on component unmount or update
      if (layersRef.current) {
        layersRef.current.forEach(layer => {
          if (layer) map.removeLayer(layer);
        });
      }
      
      if (legendRef.current) {
        legendRef.current.remove();
      }
      
      if (statsLegendRef.current) {
        statsLegendRef.current.remove();
      }
    };
  }, [map, polygon, sectorData]);

  return null;
};

// Add Payatas coordinates constant at the top level
const PAYATAS_COORDINATES: [number, number] = [14.7147, 121.1037];

// Update this component to allow free navigation
const MapReset: React.FC<{ mapType: MapType }> = ({ mapType }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const bounds = L.latLngBounds(PAYATAS_POLYGON);
    
    const fitMapToBounds = () => {
      // Initial view centered on Payatas polygon
      map.fitBounds(bounds, {
        padding: [35, 35],
        maxZoom: 13.5,
        animate: true,
        duration: 1
      });
      
      // Remove restrictions for both map types
      map.setMinZoom(3); // Allow zooming out to see the world
      map.setMaxZoom(18); // Allow zooming in for details
      map.setMaxBounds(undefined); // Remove bounds restriction completely
    };

    // Initial fit
    fitMapToBounds();

    // Add resize handler
    const resizeObserver = new ResizeObserver(() => {
      // Don't refit bounds on resize to allow free navigation
      // Just ensure the map fills the container
      map.invalidateSize();
    });

    resizeObserver.observe(map.getContainer());

    return () => {
      resizeObserver.disconnect();
    };
  }, [map, mapType]);

  return null;
};

interface Distribution {
  id: number;
  itemName: string;
  quantity: number;
  category: string;
  distributedAt: string;
}

interface InventoryStats {
  id: number;
  item: string;
  category: string;
  quantity: number;
  unit: string;
  source: 'regular' | 'inkind';
  threshold?: number;
  distributions: {
    scholar_name: string;
    quantity: number;
    distributed_at: string;
  }[];
  distributionCount: number;
  totalDistributed: number;
  lastDistributed?: string;
}

interface DistributionHotspot {
  id: number;
  location: [number, number];
  count: number;
  items: string[];
  lastDistribution: string;
}

const officeIcon = new Icon({
  iconUrl: '/images/kkmk-logo.png', // Make sure to add this image to your public folder
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
  className: 'office-marker'
});

// First, create a constant for the office marker outside the component:
const OFFICE_MARKER: LocationMarker = {
  id: -1,
  lat: KKMK_OFFICE_COORDINATES[0],
  lng: KKMK_OFFICE_COORDINATES[1],
  name: 'KapatidKita MahalKita Main Office',
  type: 'office',
  details: {
    address: 'Payatas, Quezon City',
    description: 'KKMK Main Office Location'
  }
};

// Add new interface for scholar distribution data
interface ScholarDistributionItem {
  name: string;
  value: number;
  color: string;
}

// Add this constant for the base URL of uploads
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';

const AdminMap: React.FC = () => {
  const navigate = useNavigate();
  const [markers, setMarkers] = useState<LocationMarker[]>([OFFICE_MARKER]);
  const [loading, setLoading] = useState(true);
  const [activeMarkers, setActiveMarkers] = useState<number>(0);
  const [dbEvents, setDbEvents] = useState<DBEvent[]>([]);
  const [heatmapData, setHeatmapData] = useState<Array<{lat: number; lng: number; intensity: number}>>([]);
  const [mapType, setMapType] = useState<MapType>(MapType.STANDARD);
  const [locationType, setLocationType] = useState<LocationType>(LocationType.ALL);
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [verifiedScholars, setVerifiedScholars] = useState<Scholar[]>([]);
  const [scholarDistributions, setScholarDistributions] = useState<{[key: number]: Distribution[]}>({});
  const [scholarDistributionData, setScholarDistributionData] = useState<ScholarDistributionItem[]>([]);

  // Add Payatas, Quezon City coordinates
  const PAYATAS_COORDINATES: [number, number] = [14.7164, 121.1194];
  const DEFAULT_ZOOM = 14; // Closer zoom level for better area visibility

  // Swap longitude and latitude in the coordinates array
  const PAYATAS_POLYGON: [number, number][] = [
    [14.7297784, 121.1183808],
    [14.7284917, 121.1174367],
    [14.7276201, 121.1167929],
    [14.7269975, 121.1153767],
    [14.726541, 121.1143897],
    [14.7258354, 121.1134455],
    [14.7238016, 121.1128876],
    [14.7225979, 121.1130164],
    [14.7218923, 121.1128447],
    [14.7213942, 121.1117718],
    [14.7213527, 121.1105702],
    [14.7220583, 121.1085103],
    [14.7223488, 121.1069653],
    [14.7230545, 121.1058495],
    [14.7231375, 121.1052487],
    [14.7226809, 121.1036179],
    [14.7220583, 121.1032746],
    [14.7209791, 121.101558],
    [14.720232, 121.1005709],
    [14.7186547, 121.1005709],
    [14.717119, 121.100528],
    [14.7164134, 121.099541],
    [14.7149606, 121.0977385],
    [14.7147115, 121.0966656],
    [14.7143795, 121.0956357],
    [14.7137154, 121.0949061],
    [14.7140889, 121.0932324],
    [14.7141304, 121.0919879],
    [14.7141304, 121.0905287],
    [14.7135078, 121.0899708],
    [14.7127192, 121.0901854],
    [14.7120135, 121.0900567],
    [14.7114739, 121.0884688],
    [14.7091909, 121.0854647],
    [14.7048325, 121.0889409],
    [14.7032966, 121.0891554],
    [14.7029645, 121.0900567],
    [14.70284, 121.0924599],
    [14.7027985, 121.0937045],
    [14.702757, 121.0955498],
    [14.703006, 121.0976956],
    [14.7027985, 121.0998843],
    [14.7023003, 121.1022017],
    [14.7020513, 121.1036608],
    [14.7022173, 121.1050341],
    [14.7027985, 121.1059353],
    [14.7040853, 121.1068366],
    [14.704957, 121.1078665],
    [14.7056626, 121.1092827],
    [14.7052475, 121.1108706],
    [14.7051645, 121.1125872],
    [14.705206, 121.1131451],
    [14.7067419, 121.1139176],
    [14.7087343, 121.1146901],
    [14.7133003, 121.1162779],
    [14.7179491, 121.1194537],
    [14.7189038, 121.1200116],
    [14.7247147, 121.1214278],
    [14.7253788, 121.1215136],
    [14.7258354, 121.1212561],
    [14.7264579, 121.1215136],
    [14.7297784, 121.1183808]
  ];

  // Add church coordinates
  const CHURCH_LOCATION: [number, number] = [14.715425, 121.104446]; // Ascension of Our Lord Parish coordinates

  // Create custom church icon
  const churchIcon = new Icon({
    iconUrl: '/images/jason.jpg', // Add a church icon image to your public folder
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  // Add new scholar icon
  const scholarIcon = new Icon({
    iconUrl: '/images/default-avatar.jpg',
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
    className: 'scholar-marker'
  });

  // Add new state for sector stats
  const [sectorMarkers, setSectorMarkers] = useState<{
    [key: string]: {
      scholars: LocationMarker[];
      events: LocationMarker[];
    }
  }>({
    NORTH: { scholars: [], events: [] },
    CENTRAL: { scholars: [], events: [] },
    SOUTH: { scholars: [] as LocationMarker[], events: [] as LocationMarker[] }
  });

  // Add function to determine sector
  const getSectorForMarker = (marker: LocationMarker): string | null => {
    for (const [sectorName, sector] of Object.entries(PAYATAS_SECTORS)) {
      if (isPointInPolygon([marker.lat, marker.lng], sector.coordinates)) {
        return sectorName;
      }
    }
    return null;
  };

  // Add effect to categorize markers by sector
  useEffect(() => {
    const newSectorMarkers = {
      NORTH: { scholars: [] as LocationMarker[], events: [] as LocationMarker[] },
      CENTRAL: { scholars: [] as LocationMarker[], events: [] as LocationMarker[] },
      SOUTH: { scholars: [] as LocationMarker[], events: [] as LocationMarker[] }
    };

    markers.forEach(marker => {
      const sector = getSectorForMarker(marker) as keyof typeof newSectorMarkers;
      if (sector && sector in newSectorMarkers) {
        if (marker.type === 'scholar') {
          newSectorMarkers[sector].scholars.push(marker);
        } else if (marker.type === 'event') {
          newSectorMarkers[sector].events.push(marker);
        }
      }
    });

    setSectorMarkers(newSectorMarkers);
  }, [markers]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const [churchesRes, eventsRes] = await Promise.all([
          api.get('/churches'),
          api.get('/events/locations')
        ]);

        const churches = churchesRes.data;
        const events = eventsRes.data;

        // Filter out events that don't have coordinates
        const validEvents = events.filter((e: any) => e.lat && e.lng);

        const allMarkers: LocationMarker[] = [
          OFFICE_MARKER,
          ...churches.map((c: any) => ({
            id: c.id,
            lat: c.lat,
            lng: c.lng,
            name: c.name,
            type: 'church' as const,
            details: c
          })),
          ...validEvents.map((e: any) => ({
            id: e.id,
            lat: e.lat,
            lng: e.lng,
            name: e.name || e.title,
            type: 'event' as const,
            details: e
          }))
        ];

        setMarkers(allMarkers);
        setActiveMarkers(allMarkers.length); // Update active markers count
        setLoading(false);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Add scholar fetching effect
  useEffect(() => {
    const fetchScholars = async () => {
      try {
        const response = await api.get('/scholars');
        const scholarsWithLocation = response.data.filter(
          (scholar: Scholar) => scholar.latitude && scholar.longitude
        );

        const scholarMarkers = scholarsWithLocation.map((scholar: Scholar) => ({
          id: scholar.id,
          lat: scholar.latitude,
          lng: scholar.longitude,
          name: scholar.name,
          type: 'scholar' as const,
          details: scholar
        }));

        setMarkers(prevMarkers => {
          // Keep office marker and other non-scholar markers
          const nonScholarMarkers = prevMarkers.filter(m => m.type === 'office' || m.type === 'event');
          return [...nonScholarMarkers, ...scholarMarkers];
        });

        setScholars(scholarsWithLocation);
      } catch (error) {
        console.error('Error fetching scholars:', error);
      }
    };

    fetchScholars();
  }, []);

  // Update the fetchEvents effect
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get('/events');
        
        const eventsWithCoordinates = response.data.filter((event: DBEvent) => {
          // Filter out events that don't have coordinates or are past due
          const eventDate = new Date(event.date);
          const now = new Date();
          now.setHours(0, 0, 0, 0); // Reset time part to compare dates only
          
          return event.latitude !== null && 
                 event.longitude !== null && 
                 event.status === 'OPEN' &&
                 eventDate >= now;
        });

        const eventMarkers = eventsWithCoordinates.map((event: DBEvent) => {
          // Debug log
          console.log('Processing event:', {
            id: event.id,
            title: event.title,
            rawImage: event.image,
            rawResponse: event
          });

          // Construct image URL with proper base URL for uploads
          let imageUrl = '/images/default-event.jpg';
          
          if (event.image) {
            // Check if the image path starts with http(s)
            if (event.image.startsWith('http')) {
              imageUrl = event.image;
            }
            // Check if it's a relative path starting with /uploads/
            else if (event.image.startsWith('/uploads/')) {
              imageUrl = `${API_BASE_URL}${event.image}`;
            } 
            // Handle data URLs (base64)
            else if (event.image.startsWith('data:image')) {
              imageUrl = event.image;
            }
            // Fall back to default image if path is invalid
            else {
              console.warn(`Invalid image path for event ${event.id}: ${event.image}`);
              imageUrl = '/images/default-event.jpg';
            }
          }

          console.log(`Event ${event.id} using image URL: ${imageUrl}`);

          return {
            id: event.id,
            lat: parseFloat(event.latitude),
            lng: parseFloat(event.longitude),
            name: event.title,
            type: 'event' as const,
            details: {
              ...event,
              date: new Date(event.date).toLocaleDateString(),
              address: event.location,
              image: imageUrl,
              rawImagePath: event.image // Store original path for debugging
            }
          };
        });

        console.log('Created event markers:', eventMarkers);
        
        setMarkers(prevMarkers => {
          // Keep office marker and non-event markers
          const nonEventMarkers = prevMarkers.filter(m => m.type === 'office' || m.type === 'scholar');
          return [...nonEventMarkers, ...eventMarkers];
        });

        setDbEvents(response.data);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (mapType === MapType.HEATMAP) {
      // Convert markers to heatmap data
      const heatData = markers.map(marker => ({
        lat: marker.lat,
        lng: marker.lng,
        intensity: marker.type === 'church' ? 1.0 : 0.5
      }));
      setHeatmapData(heatData);
    }
  }, [markers, mapType]);

  useEffect(() => {
    const filteredMarkers = markers.filter(marker => {
      if (locationType === LocationType.ALL) return true;
      if (locationType === LocationType.CHURCHES) return marker.type === 'church';
      if (locationType === LocationType.EVENTS) return marker.type === 'event';
      if (locationType === LocationType.SCHOLARS) return marker.type === 'scholar';
      if (locationType === LocationType.OFFICE) return marker.type === 'office';
      return false;
    });
    setActiveMarkers(filteredMarkers.length);
  }, [markers, locationType]);

  // Add this effect to fetch verified scholar locations
  useEffect(() => {
    const fetchVerifiedScholars = async () => {
      try {
        const response = await api.get('/scholars/verified-locations');
        
        console.log('Received scholar data:', response.data); // Debug log

        const scholarMarkers = response.data.map((scholar: any) => ({
          id: scholar.id,
          lat: parseFloat(scholar.latitude),
          lng: parseFloat(scholar.longitude),
          name: scholar.name,
          type: 'scholar' as const,
          details: {
            ...scholar,
            // Use the profile_photo directly as it's already properly formatted
            profile_photo: scholar.profile_photo || '/images/default-avatar.jpg'
          }
        }));

        console.log('Created scholar markers:', scholarMarkers); // Debug log

        setMarkers(prev => {
          const nonScholarMarkers = prev.filter(m => m.type === 'office' || m.type === 'event');
          return [...nonScholarMarkers, ...scholarMarkers];
        });
        setVerifiedScholars(response.data);
      } catch (error) {
        console.error('Error fetching verified scholars:', error);
      }
    };

    if (locationType === LocationType.SCHOLARS || locationType === LocationType.ALL) {
      fetchVerifiedScholars();
    }
  }, [locationType]);

  // Add new effect to fetch scholar distributions
  useEffect(() => {
    const fetchScholarDistributions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get(
          '/inventory/distributions-with-location',
          { headers: { Authorization: `Bearer ${token}` }}
        );

        // Group distributions by scholar ID
        const distributionsByScholar = response.data.reduce((acc: {[key: number]: Distribution[]}, curr: any) => {
          if (curr.recipientId) {
            if (!acc[curr.recipientId]) {
              acc[curr.recipientId] = [];
            }
            acc[curr.recipientId].push({
              id: curr.id,
              itemName: curr.itemName,
              quantity: curr.quantity,
              category: curr.category,
              distributedAt: curr.distributedAt
            });
          }
          return acc;
        }, {});

        setScholarDistributions(distributionsByScholar);
      } catch (error) {
        console.error('Error fetching scholar distributions:', error);
      }
    };

    if (locationType === LocationType.SCHOLARS || locationType === LocationType.ALL) {
      fetchScholarDistributions();
    }
  }, [locationType]);

  // Add this new effect to handle URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get('filter');
    if (filter === 'scholars') {
      setLocationType(LocationType.SCHOLARS);
    }
  }, []);

  // Add effect to process scholar distribution data
  useEffect(() => {
    if (!scholarDistributions) return;

    // Count items by name
    const itemCounts: { [key: string]: number } = {};
    Object.values(scholarDistributions).forEach(distributions => {
      distributions.forEach(dist => {
        itemCounts[dist.itemName] = (itemCounts[dist.itemName] || 0) + dist.quantity;
      });
    });

    // Convert to pie chart data format
    const colors = ['#FF8042', '#0088FE', '#00C49F', '#FFBB28', '#8884d8', '#82ca9d'];
    const chartData = Object.entries(itemCounts).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));

    setScholarDistributionData(chartData);
  }, [scholarDistributions]);

  const formatAmount = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStandardMap = () => (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Polygon
        positions={PAYATAS_POLYGON}
        pathOptions={{
          color: '#FF0000',
          fillColor: '#2c5282',
          fillOpacity: 0.1,
          weight: 2
        }}
      />
    </>
  );

  const renderHeatmap = () => {
    // Filter markers to only include scholars and events
    const filteredMarkers = markers.filter(marker => 
      marker.type === 'scholar' || marker.type === 'event'
    );
    
    return (
      <>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Polygon
          positions={PAYATAS_POLYGON}
          pathOptions={{
            color: '#FF0000',
            fillColor: 'transparent',
            weight: 2
          }}
        />
        <HeatmapLayer 
          points={filteredMarkers}
          polygon={PAYATAS_POLYGON}
          sectorData={sectorData}
        />
      </>
    );
  };

  const renderScholarPopup = (marker: LocationMarker) => {
    const scholarDist = scholarDistributions[marker.id] || [];
    const recentDistributions = scholarDist
      .sort((a, b) => new Date(b.distributedAt).getTime() - new Date(a.distributedAt).getTime())
      .slice(0, 3); // Show only last 3 distributions

    // Improved profile photo handling with BASE_URL
    let profilePhotoUrl = '/images/default-avatar.jpg';
    const photo = marker.details.profile_photo;

    if (photo) {
      if (photo.startsWith('data:image')) {
        profilePhotoUrl = photo; // Use base64 data directly
      } else if (photo.startsWith('http')) {
        profilePhotoUrl = photo; // Use full URL
      } else if (photo.startsWith('/uploads/')) {
        profilePhotoUrl = `${API_BASE_URL}${photo}`; // Add server URL to path
      }
    }

    console.log('Using profile photo:', {
      original: marker.details.profile_photo,
      processed: profilePhotoUrl
    });

    // Add function to handle directions
    const handleGetDirections = () => {
      const origin = `${KKMK_OFFICE_COORDINATES[0]},${KKMK_OFFICE_COORDINATES[1]}`;
      const destination = `${marker.lat},${marker.lng}`;
      const url = `${GOOGLE_MAPS_DIRECTIONS_URL}&origin=${origin}&destination=${destination}`;
      window.open(url, '_blank');
    };

    const sector = getSectorForMarker(marker);

    // Navigate to the specific scholar profile - Update to use the correct path
    const handleViewScholarProfile = () => {
      navigate(`/Scholars/Profile`);
    };
    
    return (
      <div className="scholar-popup-content">
        <div className="profile-section">
          <div className="scholar-image">
            <img
              src={profilePhotoUrl}
              alt={marker.name}
              onError={(e) => {
                console.error('Failed to load image:', profilePhotoUrl);
                const target = e.target as HTMLImageElement;
                target.src = '/images/default-avatar.jpg';
                target.onerror = null;
              }}
            />
          </div>
          <div className="scholar-info">
            <h3>{marker.name}</h3>
            <p className="address">
              <strong>Address:</strong><br />
              {marker.details.address || 'No address specified'}
            </p>
            {sector && (
              <div className="sector-info">
                <p><strong>Sector:</strong> {sector}</p>
              </div>
            )}
          </div>
        </div>

        {recentDistributions.length > 0 && (
          <div className="recent-distributions">
            <h4>Recent Distributions</h4>
            {recentDistributions.map((dist, index) => (
              <div key={dist.id} className="distribution-item">
                <div className="distribution-header">
                  <span className="category-tag">{dist.category}</span>
                  <span className="date">{new Date(dist.distributedAt).toLocaleDateString()}</span>
                </div>
                <p className="item-details">
                  {dist.quantity}x {dist.itemName}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="popup-buttons">
          <button 
            className="view-details-btn"
            onClick={handleViewScholarProfile}
          >
            View Scholar Profile
          </button>
          <button 
            className="directions-btn"
            onClick={handleGetDirections}
          >
            Get Directions
          </button>
        </div>
      </div>
    );
  };

  const renderMapContent = () => {
    // Don't render markers in heatmap mode
    if (mapType === MapType.HEATMAP) {
      return null;
    }

    const visibleMarkers = markers.filter(marker => {
      if (locationType === LocationType.ALL) return true;
      if (locationType === LocationType.CHURCHES) return marker.type === 'church';
      if (locationType === LocationType.EVENTS) return marker.type === 'event';
      if (locationType === LocationType.SCHOLARS) return marker.type === 'scholar';
      if (locationType === LocationType.OFFICE) return marker.type === 'office';
      return false;
    });

    return visibleMarkers.map(marker => {
      const lat = Number(marker.lat);
      const lng = Number(marker.lng);

      if (isNaN(lat) || isNaN(lng)) {
        console.warn('Invalid coordinates for marker:', marker);
        return null;
      }

      // Create custom icon for events using their image
      const getCustomIcon = () => {
        if (marker.type === 'office') {
          return officeIcon;
        }
        if (marker.type === 'event') {
          const imageUrl = marker.details.image;
          console.log('Using image URL for marker:', imageUrl);
          
          return new Icon({
            iconUrl: imageUrl,
            iconSize: [45, 45],
            iconAnchor: [22, 22],
            popupAnchor: [0, -22],
            className: 'custom-event-marker',
            tooltipAnchor: [16, -28]
          });
        }
        
        if (marker.type === 'scholar') {
          // Create custom scholar icon using their profile photo with BASE_URL
          let iconUrl = '/images/default-avatar.jpg';
          const photo = marker.details.profile_photo;

          if (photo) {
            if (photo.startsWith('data:image')) {
              iconUrl = photo;
            } else if (photo.startsWith('http')) {
              iconUrl = photo;
            } else if (photo.startsWith('/uploads/')) {
              iconUrl = `${API_BASE_URL}${photo}`;
            }
          }

          return new Icon({
            iconUrl: iconUrl,
            iconSize: [35, 35],
            iconAnchor: [17, 17],
            popupAnchor: [0, -17],
            className: 'scholar-marker',
          });
        }
        
        return marker.type === 'church' ? churchIcon : defaultIcon;
      };

      return (
        <Marker
          key={`${marker.type}-${marker.id}`}
          position={[lat, lng]}
          icon={getCustomIcon()}
        >
          <Popup
            // Add these popup options for scholar type
            {...(marker.type === 'scholar' ? {
              minWidth: 280,
              maxWidth: 280,
              className: 'scholar-popup-wrapper',
              closeButton: true,
            } : {
              className: ''
            })}
          >
            <div className={`marker-popup ${marker.type} ${marker.type === 'scholar' ? 'scholar-popup' : ''}`}>
              {marker.type === 'scholar' ? (
                renderScholarPopup(marker)
              ) : (
                // ... existing popup content for other types ...
                <>
                  {marker.type === 'event' && (
                    <div className="marker-image-container">
                      <img
                        src={marker.details.image}
                        alt={marker.name}
                        className="marker-event-image"
                        onError={(e) => {
                          console.error('Failed to load event image:', marker.details.rawImagePath);
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/default-event.jpg';
                          target.onerror = null; // Prevent infinite error loops
                        }}
                      />
                    </div>
                  )}
                  <h3>{marker.name}</h3>
                  {marker.type === 'event' && (
                    <>
                      <p><strong>Date:</strong> {marker.details.date}</p>
                      <p><strong>Location:</strong> {marker.details.address}</p>
                      <p><strong>Description:</strong> {marker.details.description}</p>
                      <button 
                        className="view-details-btn"
                        onClick={() => handleViewEventDetails(marker.details)}
                      >
                        Edit Event Details
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </Popup>
        </Marker>
      );
    }).filter(Boolean); // Remove null values
  };

  // Update the MapContainer settings
  const mapSettings = {
    center: PAYATAS_COORDINATES,
    zoom: 15,
    className: `admin-map ${mapType === MapType.HEATMAP ? 'heatmap-mode' : ''}`,
    zoomControl: true,
    scrollWheelZoom: true,
    dragging: true,
    maxBoundsViscosity: 0.0, // Change to 0 to remove bounds stickiness
    doubleClickZoom: true, // Enable double click zoom
    bounceAtZoomLimits: false, // Disable bounce at zoom limits
    wheelDebounceTime: 100,
    wheelPxPerZoomLevel: 100,
    zoomDelta: 0.5,
    zoomSnap: 0.5,
    preferCanvas: true // Add this for better performance
  };

  // Update the handleViewEventDetails function
  const handleViewEventDetails = (eventDetails: any) => {
    try {
      // Store the full event details in localStorage
      localStorage.setItem('eventToEdit', JSON.stringify({
        id: eventDetails.id,
        title: eventDetails.title || eventDetails.name,
        date: eventDetails.date,
        location: eventDetails.address || eventDetails.location,
        description: eventDetails.description,
        status: eventDetails.status || 'OPEN',
        latitude: eventDetails.lat || eventDetails.latitude,
        longitude: eventDetails.lng || eventDetails.longitude
      }));

      // Navigate to the admin events page instead of the regular events page
      navigate('/Event');
    } catch (error) {
      console.error('Error navigating to event:', error);
    }
  };

  // Update the sector markers state with the new interface
  const [sectorData, setSectorData] = useState<Record<string, SectorData>>({
    NORTH: { scholars: [], events: [], total: 0, distributions: 0, distributionPercentage: 0 },
    CENTRAL: { scholars: [], events: [], total: 0, distributions: 0, distributionPercentage: 0 },
    SOUTH: { scholars: [], events: [], total: 0, distributions: 0, distributionPercentage: 0 }
  });

  // Add function to categorize markers by sector
  const categorizeBySector = (markers: LocationMarker[], distributions: {[key: number]: Distribution[]}) => {
    const sectorStats: Record<string, SectorData> = {
      NORTH: { scholars: [], events: [], total: 0, distributions: 0, distributionPercentage: 0 },
      CENTRAL: { scholars: [], events: [], total: 0, distributions: 0, distributionPercentage: 0 },
      SOUTH: { scholars: [], events: [], total: 0, distributions: 0, distributionPercentage: 0 }
    };

    // Count both scholars and events by sector
    markers.forEach(marker => {
      const sector = getSectorForMarker(marker);
      if (sector && sector in sectorStats) {
        if (marker.type === 'scholar') {
          sectorStats[sector].scholars.push(marker);
          // Add distributions for this scholar
          const scholarDist = distributions[marker.id] || [];
          sectorStats[sector].distributions += scholarDist.reduce((sum, dist) => sum + dist.quantity, 0);
        } else if (marker.type === 'event') {
          sectorStats[sector].events.push(marker);
        }
      }
    });

    // Calculate totals and percentages
    Object.values(sectorStats).forEach(stats => {
      stats.total = stats.scholars.length + stats.events.length;
    });

    const totalDistributions = Object.values(sectorStats).reduce((sum, data) => sum + data.distributions, 0);
    Object.values(sectorStats).forEach(sector => {
      sector.distributionPercentage = totalDistributions > 0 ? (sector.distributions / totalDistributions) * 100 : 0;
    });

    return sectorStats;
  };

  // Add effect to update sector statistics when markers change
  useEffect(() => {
    const stats = categorizeBySector(markers, scholarDistributions);
    setSectorData(stats);
  }, [markers, scholarDistributions]);

  // Define the inventory filter interface
  interface InventoryFilter {
    category: string;
    timeRange: string;
  }
  
  // Add new state variables inside AdminMap component
  const [inventoryStats, setInventoryStats] = useState<InventoryStats[]>([]);
  const [distributionHotspots, setDistributionHotspots] = useState<DistributionHotspot[]>([]);
  const [showInventoryPanel, setShowInventoryPanel] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>({
    category: 'all',
    timeRange: 'all'
  });

  // Add new useEffect for fetching inventory stats
  useEffect(() => {
    const fetchInventoryStats = async () => {
      try {
        const { category, timeRange } = inventoryFilter;
        const queryParams = new URLSearchParams();
        
        if (category !== 'all') queryParams.append('category', category);
        if (timeRange !== 'all') queryParams.append('timeRange', timeRange);
        
        const url = `/inventory/distribution-stats?${queryParams.toString()}`;
        const response = await api.get(url);
        
        console.log('Inventory stats fetched:', response.data);
        setInventoryStats(response.data);
      } catch (error) {
        console.error('Error fetching inventory stats:', error);
      }
    };

    if (showInventoryPanel) {
      fetchInventoryStats();
    }
  }, [showInventoryPanel, inventoryFilter]);

  // Add category options
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'Food & Nutrition', label: 'Food & Nutrition' },
    { value: 'Clothing & Footwear', label: 'Clothing & Footwear' },
    { value: 'School Supplies', label: 'School Supplies' },
    { value: 'Medical Supplies', label: 'Medical Supplies' },
    { value: 'Hygiene Supplies', label: 'Hygiene Supplies' }
  ];

  // Add time range options
  const timeRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
  ];

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Update renderFilterControls to include inventory filter
  const renderFilterControls = () => (
    mapType === MapType.HEATMAP && (
      <div className="map-advanced-filters">
        <select 
          value={inventoryFilter.category} 
          onChange={(e) => setInventoryFilter({...inventoryFilter, category: e.target.value})}
          className="category-filter"
        >
          {categoryOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select 
          value={inventoryFilter.timeRange} 
          onChange={(e) => setInventoryFilter({...inventoryFilter, timeRange: e.target.value})}
          className="time-filter"
        >
          {timeRangeOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <button 
          className={`inventory-panel-toggle ${showInventoryPanel ? 'active' : ''}`}
          onClick={() => setShowInventoryPanel(!showInventoryPanel)}
        >
          {showInventoryPanel ? 'Hide Inventory' : 'Show Inventory'}
        </button>
      </div>
    )
  );

  // Add inventory panel rendering function
  const renderInventoryPanel = () => {
    if (!showInventoryPanel) return null;

    // Calculate total distributions for pie chart
    const totalDistributions = inventoryStats.reduce((sum, item) => sum + item.totalDistributed, 0);
    
    // Prepare data for pie chart
    const pieChartData = inventoryStats.map(item => ({
      name: item.item,
      value: item.totalDistributed,
      category: item.category
    }));

    // Colors for pie chart segments
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
      <div className="inventory-panel">
        <h3>Distributed Inventory Items</h3>
        
        {inventoryStats.length === 0 ? (
          <p className="no-data">No inventory data available for the selected filters.</p>
        ) : (
          <>
            <div className="inventory-chart-container">
              <h4>Distribution Breakdown</h4>
              <div className="pie-chart-wrapper">
                <PieChart width={280} height={280}>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} items`, 'Distributed']}
                    labelFormatter={(index) => pieChartData[index].name}
                  />
                  <Legend />
                </PieChart>
              </div>
              <div className="distribution-summary">
                <p>Total Items Distributed: <strong>{totalDistributions}</strong></p>
              </div>
            </div>

            <div className="inventory-items-list">
              {inventoryStats.map(item => (
                <div key={item.id} className="inventory-item">
                  <div className="inventory-item-header">
                    <h4>{item.item}</h4>
                    <span className="category-tag">{item.category}</span>
                  </div>
                  
                  <div className="inventory-item-stats">
                    <div className="stat">
                      <span className="stat-label">Current Stock:</span>
                      <span className="stat-value">{item.quantity} {item.unit}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Total Distributed:</span>
                      <span className="stat-value">{item.totalDistributed}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Last Distributed:</span>
                      <span className="stat-value">{formatDate(item.lastDistributed || '')}</span>
                    </div>
                  </div>
                  
                  {item.distributions && item.distributions.length > 0 && (
                    <div className="recent-distributions">
                      <h5>Recent Distributions</h5>
                      <ul>
                        {item.distributions.map((dist, idx) => (
                          <li key={idx}>
                            <span className="recipient">{dist.scholar_name}</span> received
                            <span className="quantity"> {dist.quantity} {item.unit}</span> on
                            <span className="date"> {formatDate(dist.distributed_at)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <button 
                    className="distribute-btn"
                    onClick={(e) => {
                      e.preventDefault(); // Prevent any default behavior
                      console.log("Distribute button clicked for item:", item);
                      handleDistribute(item.id);
                    }}
                  >
                    Distribute Item
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // Add new component for scholar distribution chart
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const renderScholarDistributionPanel = () => {
    if (!scholarDistributionData.length) return null;
  
    const totalItems = scholarDistributionData.reduce((sum, item) => sum + item.value, 0);
  
    return (
      <div className="scholar-distribution-panel">
        <div className="scholar-distribution-header">
          <h3>Scholar Item Distribution</h3>
          <div style={{ position: 'relative' }}>
            <button 
              className={`distribution-dropdown-btn ${dropdownOpen ? 'open' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              List
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            <div className={`distribution-list-dropdown ${dropdownOpen ? 'open' : ''}`}>
              {scholarDistributionData.map((item, index) => (
                <div key={index} className="distribution-list-item">
                  <span className="item-name">{item.name}</span>
                  <span className="item-count">{item.value}</span>
                </div>
              ))}
              <div className="distribution-list-item" style={{fontWeight: 'bold'}}>
                <span className="item-name">Total</span>
                <span className="item-count">{totalItems}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Rest of the existing chart and content */}
        <div className="scholar-chart-wrapper">
          <PieChart width={250} height={250}>
            <Pie
              data={scholarDistributionData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {scholarDistributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} items (${((value/totalItems)*100).toFixed(1)}%)`, 'Distributed']}
            />
          </PieChart>
        </div>
      </div>
    );
  };

  // Update the distribute button click handler to properly navigate with correct parameters
const handleDistribute = (itemId: number) => {
  console.log("Distributing item with ID:", itemId); // Debug log
  
  // Extract useful information from the item
  const item = inventoryStats.find(item => item.id === itemId);
  console.log("Found item:", item);
  
  // Store the data in localStorage for retrieval in Inventory page
  localStorage.setItem('distributeItemData', JSON.stringify({
    itemId: itemId.toString(),
    itemName: item?.item || '',
    category: item?.category || inventoryFilter.category,
    openDistributeDialog: true,
    fromMap: true,
    timestamp: new Date().getTime() // Add timestamp to prevent stale data
  }));
  
  // Use the correct path - /Inventory instead of /admin/Inventory
  window.location.href = '/Inventory';
}

  return (
    <div className={`admin-map-container ${mapType === MapType.HEATMAP ? 'heatmap-mode' : ''}`}>
      <div className="map-header">
        <h1 className='location-h1'>Location Map Overview</h1>
        <div className="map-type-selector">
          <button 
            className={`map-type-btn ${mapType === MapType.STANDARD ? 'active' : ''}`}
            onClick={() => {
              setMapType(MapType.STANDARD);
            }}
          >
            Standard Map
          </button>
          <button 
            className={`map-type-btn ${mapType === MapType.HEATMAP ? 'active' : ''}`}
            onClick={() => setMapType(MapType.HEATMAP)}
          >
            Heatmap View
          </button>
        </div>
      <div className="map-filters">
          <select 
            value={locationType}
            onChange={(e) => setLocationType(e.target.value as LocationType)}
            className="location-filter"
          >
            <option value={LocationType.ALL}>All Locations</option>
            <option value={LocationType.EVENTS}>Events</option>
            <option value={LocationType.SCHOLARS}>Scholars</option>
            <option value={LocationType.OFFICE}>Main Office</option>
          </select>
        </div>
        {renderFilterControls()}
      </div>

      {loading ? (
        <div className="loading">Loading map data...</div>
      ) : (
        <>
          <div className="map-content">
            <MapContainer {...mapSettings}>
              <MapReset mapType={mapType} />
              {mapType === MapType.STANDARD ? (
                <>
                  {renderStandardMap()}
                  {renderMapContent()}
                </>
              ) : (
                <>
                  {renderHeatmap()}
                </>
              )}
            </MapContainer>
            
            {/* Sector stats panel */}
            <div className="sector-stats-panel">
              <h3>Area Statistics</h3>
              {Object.entries(sectorData).map(([name, data]) => (
                <div key={name} className="sector-stat-block">
                  <div className="sector-stat-header">
                    <span className="color-dot" style={{ backgroundColor: PAYATAS_SECTORS[name].color }}></span>
                    <h4>{PAYATAS_SECTORS[name].name}</h4>
                  </div>
                  <div className="sector-stat-content">
                    <div className="stat-row">
                      <span>Scholars</span>
                      <strong>{data.scholars.length}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Events</span>
                      <strong>{data.events.length}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Distributions</span>
                      <strong>{data.distributions}</strong>
                    </div>
                    <div className="distribution-percentage">
                      {data.distributionPercentage.toFixed(1)}% of total distributions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Render inventory panel */}
          {renderInventoryPanel()}

          {/* Add the scholar distribution panel */}
          {renderScholarDistributionPanel()}
        </>
      )}
    </div>
  );
};

export default AdminMap;
