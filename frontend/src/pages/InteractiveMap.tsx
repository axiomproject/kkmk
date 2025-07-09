import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Icon } from 'leaflet';
import api from '../config/axios'; // Replace axios import
import { useNavigate } from 'react-router-dom';
import '../styles/InteractiveMap.css';
import Control from 'react-leaflet-custom-control';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import 'leaflet/dist/leaflet.css';

interface LocationMarker {
  id: number;
  lat: number;
  lng: number;
  name: string;
  type: 'event' | 'office';
  details: {
    image?: string;  // Add optional property marker
    address?: string;
    description?: string;
    date?: string;
    [key: string]: any;  // Allow other properties
  };
}

type LocationFilterType = 'ALL' | 'EVENTS' | 'OFFICE';

const LOCATION_FILTERS = {
  ALL: 'ALL',
  EVENTS: 'EVENTS',
  OFFICE: 'OFFICE'
} as const;

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

// Remove static eventIcon since we'll create dynamic ones per event
// We'll keep this as a fallback for when images fail to load
const defaultEventIcon = new Icon({
  iconUrl: '/images/default-event.jpg',
  iconSize: [35, 35],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17],
  className: 'event-marker'
});

// Add heatmap constants
const DISTRIBUTION_COLORS = {
  VERY_HIGH: '#991b1b',
  HIGH: '#dc2626',
  MEDIUM: '#ef4444',
  LOW: '#f87171',
  VERY_LOW: '#fca5a5'
};

interface HeatmapData {
  id: number;
  name: string;
  coordinates: [number, number][];
  totalPopulation: number;
  totalDistributions: number;
}

interface SectorData {
  id: number;
  name: string;
  type: 'LUPANG_PANGAKO' | 'PAYATAS' | 'COMMONWEALTH';
  barangay: string;
  phase: string;
  block: string;
  coordinates: [number, number][];
  population: number;
  totalDistributions: number;
  scholarCount: number;
  color: string;
  percentageComplete?: number;
}

interface SectorCategory {
  type: 'LUPANG_PANGAKO' | 'PAYATAS' | 'COMMONWEALTH';
  name: string;
  totalPopulation: number;
  totalDistributions: number;
  scholarCount: number;
  percentageComplete: number;
  sectors: SectorData[];
}

const SECTOR_COLORS = {
  LUPANG_PANGAKO: '#ef4444', // red
  PAYATAS: '#f97316',        // orange
  COMMONWEALTH: '#06b6d4'    // cyan
};

const SECTOR_TYPE_NAMES = {
  LUPANG_PANGAKO: 'Lupang Pangako',
  PAYATAS: 'Payatas',
  COMMONWEALTH: 'Commonwealth'
};

const DistributionProgress: React.FC<{ sectors: SectorData[] }> = ({ sectors }) => {
  const total = {
    population: sectors.reduce((sum, s) => sum + s.population, 0),
    distributions: sectors.reduce((sum, s) => sum + s.totalDistributions, 0)
  };

  const segments = [
    { min: 80, color: DISTRIBUTION_COLORS.VERY_HIGH, label: '80-100%' },
    { min: 60, color: DISTRIBUTION_COLORS.HIGH, label: '60-79%' },
    { min: 40, color: DISTRIBUTION_COLORS.MEDIUM, label: '40-59%' },
    { min: 20, color: DISTRIBUTION_COLORS.LOW, label: '20-39%' },
    { min: 0, color: DISTRIBUTION_COLORS.VERY_LOW, label: '0-19%' }
  ];

  const getSegmentWidth = (min: number, nextMin = 101) => {
    const sectorsInRange = sectors.filter(s => 
      (s.percentageComplete ?? 0) >= min && (s.percentageComplete ?? 0) < nextMin
    );
    const rangeDistributions = sectorsInRange.reduce((sum, s) => sum + s.totalDistributions, 0);
    return (rangeDistributions / total.distributions) * 100;
  };

  return (
    <div className="sector-progress-container">
      <h4>Distribution Progress</h4>
      <div className="sector-progress-bar">
        <div className="progress-segments">
          {segments.map((segment, i) => (
            <div
              key={segment.label}
              className="progress-segment"
              style={{
                width: `${getSegmentWidth(segment.min, segments[i-1]?.min)}%`,
                backgroundColor: segment.color
              }}
            />
          ))}
        </div>
        <div className="progress-labels">
          {segments.map(segment => {
            const sectorsInRange = sectors.filter(s => 
              (s.percentageComplete ?? 0) >= segment.min && 
              (s.percentageComplete ?? 0) < (segments[segments.indexOf(segment)-1]?.min || 101)
            );
            const rangeDistributions = sectorsInRange.reduce((sum, s) => sum + s.totalDistributions, 0);
            const percentage = ((rangeDistributions / total.distributions) * 100).toFixed(1);
            
            return (
              <div key={segment.label} className="progress-label">
                <span className="color-dot" style={{ backgroundColor: segment.color }} />
                <span>{segment.label}</span>
                <span className="distribution-count">
                  ({rangeDistributions.toLocaleString()} distributions)
                </span>
                <span className="percentage-value">{percentage}%</span>
              </div>
            );
          })}
        </div>
        <div className="total-progress">
          Total Progress: {((total.distributions / total.population) * 100).toFixed(1)}%
          <br />
          ({total.distributions.toLocaleString()} / {total.population.toLocaleString()})
        </div>
      </div>
    </div>
  );
};

interface ScholarLocation {
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  sectorId: number;
}

interface ScholarDistribution {
  scholarId: number;
  scholarName: string;
  latitude: number;
  longitude: number;
  distributions: {
    id: number;
    itemName: string;
    quantity: number;
    category: string;
    distributedAt: string;
    itemType: string;
  }[];
}

interface SectorStats {
  type: 'LUPANG_PANGAKO' | 'PAYATAS' | 'COMMONWEALTH';
  name: string;
  totalPopulation: number;
  totalDistributions: number;
  percentageComplete: number;
  sectors: SectorData[];
}

type SectorKey = 'NORTH' | 'CENTRAL' | 'SOUTH';

const SectorStatsCard: React.FC<{ stats: SectorStats }> = ({ stats }) => (
  <div 
    className="sector-stat-card-public"
    style={{ borderLeftColor: SECTOR_COLORS[stats.type] }}
  >
    <h4>{stats.name}</h4>
    <div className="stat-details-public">
      <p>
        <span>Total Population:</span>
        <strong>{stats.totalPopulation.toLocaleString()}</strong>
      </p>
      <p>
        <span>Total Distributions:</span>
        <strong>{stats.totalDistributions.toLocaleString()}</strong>
      </p>
      <p>
        <span>Coverage:</span>
        <strong>{stats.percentageComplete.toFixed(1)}%</strong>
      </p>
    </div>
  </div>
);

const PAYATAS_SECTORS: Record<string, { coordinates: [number, number][]; color: string; name: string }> = {
  NORTH: {
    coordinates: [
      [14.7297784, 121.1183808] as [number, number],
      [14.7264579, 121.1215136],
      [14.7247147, 121.1214278],
      [14.7189038, 121.1200116],
      [14.7213527, 121.1105702],
      [14.7220583, 121.1085103],
      [14.7223488, 121.1069653],
      [14.7230545, 121.1058495],
      [14.7231375, 121.1052487],
      [14.7226809, 121.1036179],
      [14.7297784, 121.1183808]
    ],
    color: '#4A90E2',
    name: 'North Sector'
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
      [14.7226809, 121.1036179]
    ],
    color: '#50C878',
    name: 'Central Sector'
  },
  SOUTH: {
    coordinates: [
      [14.7141304, 121.0919879],
      [14.7135078, 121.0899708],
      [14.7091909, 121.0854647],
      [14.7048325, 121.0889409],
      [14.7032966, 121.0891554],
      [14.7027985, 121.0937045],
      [14.7023003, 121.1022017],
      [14.7027985, 121.1059353],
      [14.7052475, 121.1108706],
      [14.7067419, 121.1139176],
      [14.7087343, 121.1146901],
      [14.7141304, 121.0919879]
    ],
    color: '#FFD700',
    name: 'South Sector'
  }
};

const HeatmapLayer: React.FC<{ sectorData: any }> = ({ sectorData }) => {
  const map = useMap();
  const layersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    if (!map || !sectorData) return;

    const layers: L.Layer[] = [];

    // Clear existing layers
    layersRef.current.forEach(layer => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    // Create sector polygons with distribution-based opacity
    Object.entries(PAYATAS_SECTORS).forEach(([sectorName, sector]) => {
      const stats = sectorData[sectorName] || { total: 0, distributionPercentage: 0 };
      const opacity = 0.2 + (stats.distributionPercentage / 100 * 0.6);

      const sectorPolygon = L.polygon(sector.coordinates as L.LatLngTuple[], {
        color: sector.color,
        weight: 2,
        fillOpacity: opacity,
        fillColor: sector.color
      });

      const bounds = sectorPolygon.getBounds();
      const center = bounds.getCenter();
      
      const label = L.divIcon({
        className: 'sector-percentage-label',
        html: `<div class="percentage-label-content">
          ${stats.distributionPercentage.toFixed(1)}%<br/>
          <small>${stats.total.toLocaleString()} items</small>
        </div>`,
        iconSize: [100, 40]
      });

      const labelMarker = L.marker(center, { icon: label, interactive: false });

      sectorPolygon.addTo(map);
      labelMarker.addTo(map);
      
      layers.push(sectorPolygon, labelMarker);
    });

    layersRef.current = layers;

    // Cleanup function
    return () => {
      layers.forEach(layer => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
    };
  }, [map, sectorData]);

  return null;
};

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

interface ScholarDistributionData {
  id: number;
  quantity: number;
  distributedAt: string;
  itemType: string;
  itemName: string;
  category: string;
  latitude: number;
  longitude: number;
}

// Remove the MapContent component and create a MapController component instead

// Add new map resize component
const MapResizer: React.FC = () => {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [map]);
  
  return null;
};

const InteractiveMap: React.FC = () => {
  const [markers, setMarkers] = useState<LocationMarker[]>([OFFICE_MARKER]);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<SectorData[]>([]);
  const [scholarFilter, setScholarFilter] = useState(false);
  const [activeFilter, setActiveFilter] = useState<LocationFilterType>('ALL');
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [sectorStats, setSectorStats] = useState<SectorCategory[]>([]);
  const [sectorCategories, setSectorCategories] = useState<SectorCategory[]>([]);
  const [payatasBoundary, setPayatasBoundary] = useState<any>(null);
  const [sectorDistributionData, setSectorDistributionData] = useState<Record<string, any>>({
    NORTH: { distributions: 0, total: 0, distributionPercentage: 0 },
    CENTRAL: { distributions: 0, total: 0, distributionPercentage: 0 },
    SOUTH: { distributions: 0, total: 0, distributionPercentage: 0 }
  });
  const [scholarDistributions, setScholarDistributions] = useState<ScholarDistributionData[]>([]);
  const navigate = useNavigate();
  const PAYATAS_COORDINATES: [number, number] = [14.7164, 121.1194];
  const [map, setMap] = useState<any>(null);  // Change to use any like Contact.tsx
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${import.meta.env.VITE_API_URL}${path}`;
  };

  // Add new state for scholar distributions
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await api.get('/events'); // Changed from /admin/events
        console.log('Raw response:', response.data);

        const currentDate = new Date();
        const futureEvents = response.data
          .filter((event: { date: string }) => {
            const eventDate = new Date(event.date);
            return eventDate >= currentDate;
          })
          .map((event: any) => {
            // Safely handle the event.image property
            const imageUrl = event.image 
              ? (event.image.startsWith('http') 
                ? event.image 
                : getImageUrl(event.image))
              : '/images/default-event.jpg';  // Fallback image
                
            // Create proper marker object
            return {
              id: event.id,
              lat: parseFloat(event.latitude) || 0,
              lng: parseFloat(event.longitude) || 0,
              name: event.title || 'Unnamed Event',
              type: 'event',
              details: {
                image: imageUrl,
                address: event.location || 'Unknown Location',
                description: event.description || 'No description available',
                date: event.date || 'Date not specified'
              }
            };
          });

        console.log('Processed events:', futureEvents);
        setMarkers([OFFICE_MARKER, ...futureEvents]);
      } catch (error) {
        console.error('Failed to fetch events:', error);
        // Still keep the office marker if there's an error
        setMarkers([OFFICE_MARKER]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Add heatmap data fetching
  useEffect(() => {
    const fetchMapData = async () => {
      if (showHeatmap) {
        try {
          setLoading(true);
          // Use the exact same endpoints as admin
          const [sectorsRes, distributionsRes, scholarDistributionsRes] = await Promise.all([
            api.get('/admin/sectors/all'),                   // Get all sectors with coordinates
            api.get('/admin/distributions/stats'),           // Get distribution stats
            api.get('/admin/scholar-distributions/stats')    // Get scholar stats
          ]);

          const processedSectors = sectorsRes.data.map((sector: any) => {
            const distributions = distributionsRes.data.find(
              (d: any) => d.sector_id === sector.id
            )?.total_distributions || 0;

            const scholarCount = scholarDistributionsRes.data.find(
              (s: any) => s.sector_id === sector.id
            )?.count || 0;

            return {
              id: sector.id,
              name: sector.name,
              type: sector.type,
              barangay: sector.barangay,
              phase: sector.phase,
              block: sector.block,
              coordinates: JSON.parse(sector.coordinates),
              population: parseInt(sector.population),
              totalDistributions: distributions,
              scholarCount: scholarCount,
              color: SECTOR_COLORS[sector.type as keyof typeof SECTOR_COLORS],
              percentageComplete: (distributions / parseInt(sector.population)) * 100
            };
          });

          // Calculate sector type stats
          const typeStats = Object.keys(SECTOR_TYPE_NAMES).map(type => {
            const sectorsOfType = processedSectors.filter((s: SectorData) => s.type === type);
            return {
              type: type as keyof typeof SECTOR_TYPE_NAMES,
              name: SECTOR_TYPE_NAMES[type as keyof typeof SECTOR_TYPE_NAMES],
              totalPopulation: sectorsOfType.reduce((sum: number, s: SectorData) => sum + s.population, 0),
              totalDistributions: sectorsOfType.reduce((sum: number, s: SectorData) => sum + s.totalDistributions, 0),
              scholarCount: sectorsOfType.reduce((sum: number, s: SectorData) => sum + s.scholarCount, 0),
              percentageComplete: sectorsOfType.reduce((sum: number, s: SectorData) => sum + (s.percentageComplete || 0), 0) / sectorsOfType.length,
              sectors: sectorsOfType
            };
          });

          setSectorData(processedSectors);
          setSectorStats(typeStats);
          setHeatmapData(processedSectors);
        } catch (error) {
          console.error('Failed to fetch heatmap data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMapData();
  }, [showHeatmap]);

  useEffect(() => {
    const fetchData = async () => {
      if (showHeatmap) {
        try {
          const [sectorsRes, distributionsRes, scholarsRes, boundaryRes] = await Promise.all([
            api.get('/sectors'),
            api.get('/distributions'),
            api.get('/scholars'),
            api.get('/sectors/payatas-boundary')
          ]);

          const processedSectors = sectorsRes.data.map((sector: any) => ({
            ...sector,
            coordinates: JSON.parse(sector.coordinates),
            color: SECTOR_COLORS[sector.type as keyof typeof SECTOR_COLORS],
            totalDistributions: 0,
            scholarCount: 0
          }));

          // Add distribution data
          distributionsRes.data.forEach((dist: { sectorId: number; count: number }) => {
            const sector = processedSectors.find((s: SectorData) => s.id === dist.sectorId);
            if (sector) {
              sector.totalDistributions = dist.count;
            }
          });

          // Add scholar data
          scholarsRes.data.forEach((scholar: ScholarLocation) => {
            const sector = processedSectors.find((s: SectorData) => s.id === scholar.sectorId);
            if (sector) {
              sector.scholarCount = (sector.scholarCount || 0) + 1;
            }
          });

          // Process sector categories
          const categories = ['LUPANG_PANGAKO', 'PAYATAS', 'COMMONWEALTH'].map(type => {
            const sectorsOfType = processedSectors.filter((s: SectorData) => s.type === type);
            const totalPopulation = sectorsOfType.reduce((sum: number, s: SectorData) => sum + s.population, 0);
            const totalDistributions = sectorsOfType.reduce((sum: number, s: SectorData) => sum + s.totalDistributions, 0);
            return {
              type: type as 'LUPANG_PANGAKO' | 'PAYATAS' | 'COMMONWEALTH',
              name: type.replace('_', ' ').toLowerCase(),
              totalPopulation,
              totalDistributions,
              scholarCount: sectorsOfType.reduce((sum: number, s: SectorData) => sum + (s.scholarCount || 0), 0),
              percentageComplete: totalPopulation > 0 ? (totalDistributions / totalPopulation) * 100 : 0,
              sectors: sectorsOfType
            };
          });

          setPayatasBoundary({
            ...boundaryRes.data,
            coordinates: JSON.parse(boundaryRes.data.coordinates)
          });
          setSectorData(processedSectors);
          setSectorCategories(categories);
        } catch (error) {
          console.error('Error fetching map data:', error);
        }
      }
    };

    fetchData();
  }, [showHeatmap]);

  useEffect(() => {
    const fetchSectorData = async () => {
      if (showHeatmap) {
        try {
          const [sectorsRes, distributionsRes] = await Promise.all([
            api.get('/admin/sectors/all'),
            api.get('/admin/distributions/stats')
          ]);

          // Process data for each sector
          const processedSectors = Object.keys(PAYATAS_SECTORS).map(sectorName => {
            const sectorDistributions = distributionsRes.data
              .filter((d: any) => {
                const sector = sectorsRes.data.find((s: any) => s.id === d.sector_id);
                return sector && sector.type === sectorName;
              })
              .reduce((sum: number, d: any) => sum + d.total_distributions, 0);

            const total = sectorsRes.data
              .filter((s: any) => s.type === sectorName)
              .reduce((sum: number, s: any) => sum + parseInt(s.population), 0);

            return {
              id: parseInt(sectorName),
              name: PAYATAS_SECTORS[sectorName as keyof typeof PAYATAS_SECTORS].name,
              type: sectorName as 'LUPANG_PANGAKO' | 'PAYATAS' | 'COMMONWEALTH',
              coordinates: PAYATAS_SECTORS[sectorName as keyof typeof PAYATAS_SECTORS].coordinates as [number, number][],
              population: total,
              totalDistributions: sectorDistributions,
              barangay: '',
              phase: '',
              block: '',
              color: SECTOR_COLORS[sectorName as keyof typeof SECTOR_COLORS],
              percentageComplete: 0,
              scholarCount: 0
            };
          });

          // Calculate percentages
          const totalDistributions = processedSectors.reduce((sum, sector) => sum + sector.totalDistributions, 0);
          processedSectors.forEach(sector => {
            sector.percentageComplete = (sector.totalDistributions / totalDistributions) * 100;
          });

          setSectorData(processedSectors);
        } catch (error) {
          console.error('Failed to fetch sector data:', error);
        }
      }
    };

    fetchSectorData();
  }, [showHeatmap]);

  // Add helper function to determine sector
  const getSectorForCoordinate = (lat: number, lng: number): SectorKey | null => {
    for (const [sectorName, sector] of Object.entries(PAYATAS_SECTORS)) {
      const isInside = isPointInPolygon([lat, lng], sector.coordinates as [number, number][]);
      if (isInside) {
        return sectorName as SectorKey;
      }
    }
    return null;
  };

  useEffect(() => {
    const fetchScholarDistributions = async () => {
      if (showHeatmap) {
        try {
          const response = await api.get('/inventory/scholar-distributions');
          setScholarDistributions(response.data);

          // Update sector distribution data
          const sectorStats = { ...sectorDistributionData };
          response.data.forEach((scholar: ScholarDistribution) => {
            const sector = getSectorForCoordinate(scholar.latitude, scholar.longitude);
            if (sector) {
              const totalItems = scholar.distributions.reduce((sum, dist) => sum + dist.quantity, 0);
              sectorStats[sector].total += totalItems;
            }
          });

          // Calculate percentages
          const totalDistributions = Object.values(sectorStats)
            .reduce((sum, data) => sum + data.total, 0);
          
          Object.keys(sectorStats).forEach(sector => {
            sectorStats[sector].distributionPercentage = 
              (sectorStats[sector].total / totalDistributions) * 100;
          });

          setSectorDistributionData(sectorStats);
        } catch (error) {
          console.error('Error fetching scholar distributions:', error);
        }
      }
    };

    fetchScholarDistributions();
  }, [showHeatmap]);

  const getVisibleMarkers = () => {
    return markers.filter(marker => {
      if (activeFilter === LOCATION_FILTERS.ALL) return true;
      if (activeFilter === LOCATION_FILTERS.EVENTS) return marker.type === 'event';
      if (activeFilter === LOCATION_FILTERS.OFFICE) return marker.type === 'office';
      return false;
    });
  };
  const getMarkerIcon = (marker: LocationMarker) => {
    if (marker.type === 'office') return officeIcon;
    
    // For events, create a custom icon using the event's image
    if (marker.details.image) {
      return new Icon({
        iconUrl: marker.details.image,
        iconSize: [35, 35],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17],
        className: 'event-marker'
      });
    }
    
    // Fallback to default event icon if no image is available
    return defaultEventIcon;
  };

  const renderPopupContent = (marker: LocationMarker) => (
    <div className="marker-popup">
      {marker.details.image && (
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
      )}
      <h3>{marker.name}</h3>
      <p><strong>Date:</strong> {marker.details.date || 'Not specified'}</p>
      <p><strong>Location:</strong> {marker.details.address || 'Not specified'}</p>
      <p><strong>Description:</strong> {marker.details.description || 'No description available'}</p>
      {marker.id > 0 && (
        <button 
          className="view-details-btn"
          onClick={() => navigate(`/event/${marker.id}`)}
        >
          View Event Details
        </button>
      )}
    </div>
  );

  // Add Heatmap Legend component
  const HeatmapLegend = () => (
    <div className="heatmap-legend">
      <h4>Distribution Coverage</h4>
      <div className="legend-items">
        <div className="legend-item">
          <span className="color-box" style={{ backgroundColor: DISTRIBUTION_COLORS.VERY_HIGH }}></span>
          <span>80-100%</span>
        </div>
        <div className="legend-item">
          <span className="color-box" style={{ backgroundColor: DISTRIBUTION_COLORS.HIGH }}></span>
          <span>60-79%</span>
        </div>
        <div className="legend-item">
          <span className="color-box" style={{ backgroundColor: DISTRIBUTION_COLORS.MEDIUM }}></span>
          <span>40-59%</span>
        </div>
        <div className="legend-item">
          <span className="color-box" style={{ backgroundColor: DISTRIBUTION_COLORS.LOW }}></span>
          <span>20-39%</span>
        </div>
        <div className="legend-item">
          <span className="color-box" style={{ backgroundColor: DISTRIBUTION_COLORS.VERY_LOW }}></span>
          <span>0-19%</span>
        </div>
      </div>
    </div>
  );

  // Add scholar marker icon
  const scholarIcon = new Icon({
    iconUrl: '/images/scholar-marker.png', // Make sure to add this image
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17]
  });

  // Add SectorStatsLegend component
  const SectorStatsLegend = () => (
    <div className="info legend stats-legend">
      <h4>Sector Statistics</h4>
      {sectorStats.map((stat) => (
        <div key={stat.type} className="sector-legend-item">
          <div className="sector-legend-header">
            <span className="sector-name">{stat.name}</span>
          </div>
          <div className="sector-legend-stats">
            <div className="stat-item">
              <span>Population:</span>
              <span>{stat.totalPopulation.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span>Distributions:</span>
              <span>{stat.totalDistributions.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span>Coverage:</span>
              <span>{stat.percentageComplete.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Update the map header to include scholar filter
  const renderMapControls = () => (
    <div className="map-controls">
      {showHeatmap ? (
        <button 
          className="map-type-btn"
          onClick={() => setShowHeatmap(false)}
        >
          Back to Standard Map
        </button>
      ) : (
        <>
          {/* <button 
            className="map-type-btn"
            onClick={() => setShowHeatmap(true)}
          >
            Show Heatmap
          </button> */}
          <div className="map-filters">
            <select 
              value={activeFilter} 
              onChange={(e) => setActiveFilter(e.target.value as LocationFilterType)}
              className="location-filter"
            >
              <option value="ALL">All Locations</option>
              <option value="EVENTS">Events Only</option>
              <option value="OFFICE">Main Office</option>
            </select>
          </div>
        </>
      )}
    </div>
  );

  const renderSectorPolygons = () => (
    <>
      {payatasBoundary && (
        <Polygon
          positions={payatasBoundary.coordinates}
          pathOptions={{
            color: payatasBoundary.color,
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 10'
          }}
        >
          <Popup>
            <div className="boundary-popup">
              <h4>Payatas Boundary</h4>
            </div>
          </Popup>
        </Polygon>
      )}
      {sectorData.map((sector: SectorData) => (
        <Polygon
          key={sector.id}
          positions={sector.coordinates as [number, number][]}
          pathOptions={{
            color: sector.color,
            fillColor: sector.color,
            fillOpacity: sector.totalDistributions > 0 ? 0.2 + (sector.totalDistributions / sector.population * 0.6) : 0.2,
            weight: 2
          }}
        >
          <Popup>
            <div>
              <h4>{sector.name}</h4>
              <p><strong>Type:</strong> {SECTOR_TYPE_NAMES[sector.type as keyof typeof SECTOR_TYPE_NAMES]}</p>
              <p><strong>Barangay:</strong> {sector.barangay}</p>
              {sector.phase && <p><strong>Phase:</strong> {sector.phase}</p>}
              {sector.block && <p><strong>Block:</strong> {sector.block}</p>}
              <p><strong>Population:</strong> {sector.population.toLocaleString()}</p>
              <p><strong>Distributions:</strong> {sector.totalDistributions.toLocaleString()}</p>
              <p><strong>Scholars:</strong> {(sector.scholarCount || 0).toLocaleString()}</p>
              <p><strong>Coverage:</strong> {(sector.percentageComplete ?? 0).toFixed(1)}%</p>
            </div>
          </Popup>
        </Polygon>
      ))}
    </>
  );

  const getSectorColor = (type: string) => {
    switch (type) {
      case 'LUPANG_PANGAKO': return '#ef4444';
      case 'PAYATAS': return '#f97316';
      case 'COMMONWEALTH': return '#06b6d4';
      default: return '#94a3b8';
    }
  };

  // Add helper function for percentage calculation
  const calculatePercentage = (distributions: number, sectors: SectorData[]) => {
    const totalPopulation = sectors.reduce((sum, s) => sum + s.population, 0);
    return totalPopulation > 0 ? (distributions / totalPopulation) * 100 : 0;
  };
  
  type SectorKey = 'NORTH' | 'CENTRAL' | 'SOUTH';
  
  // Add helper function to check if point is in polygon
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

  // Update renderHeatmap function
  const renderHeatmap = () => (
    <>
      <Polygon
        positions={PAYATAS_POLYGON as L.LatLngExpression[]}
        pathOptions={{
          color: '#374151',
          fillColor: 'transparent',
          weight: 2,
          dashArray: '5, 10'
        }}
      />
      {Object.entries(PAYATAS_SECTORS).map(([key, sector]) => {
        const stats = sectorDistributionData[key];
        const opacity = 0.2 + (stats.distributionPercentage / 100 * 0.6);
        
        return (
          <Polygon
            key={key}
            positions={sector.coordinates as L.LatLngExpression[]}
            pathOptions={{
              color: sector.color,
              fillColor: sector.color,
              fillOpacity: opacity,
              weight: 2
            }}
          >
            <Popup>
              <div className="sector-popup">
                <h4>{sector.name}</h4>
                <p><strong>Total Items Distributed:</strong> {stats.total.toLocaleString()}</p>
                <p><strong>Distribution Share:</strong> {stats.distributionPercentage.toFixed(1)}%</p>
                {stats.distributions?.length > 0 && (
                  <div className="recent-distributions">
                    <h5>Recent Distributions</h5>
                    <ul>
                      {stats.distributions.slice(0, 5).map((dist: any, index: number) => (
                        <li key={index}>
                          {dist.quantity} {dist.itemName} ({dist.category})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );

  // Update the heatmap data fetching
  useEffect(() => {
    let isSubscribed = true;
    
    const fetchData = async () => {
      if (showHeatmap) {
        try {
          setLoading(true);
          const response = await api.get('/inventory/distributions-by-sector');
          
          if (!isSubscribed) return;

          // Process the received data by sector
          interface Distribution {
            category: string;
            itemName: string;
            quantity: number;
          }

          interface SectorStats {
            distributions: Distribution[];
            total: number;
            distributionPercentage: number;
          }

          const heatmapStats: Record<SectorKey, SectorStats> = {
            NORTH: { distributions: [], total: 0, distributionPercentage: 0 },
            CENTRAL: { distributions: [], total: 0, distributionPercentage: 0 },
            SOUTH: { distributions: [], total: 0, distributionPercentage: 0 }
          };

          response.data.forEach((item: any) => {
            const sector = getSectorForCoordinate(item.latitude, item.longitude);
            if (sector) {
              heatmapStats[sector].distributions.push({
                category: item.category,
                itemName: item.itemName,
                quantity: item.quantity
              });
              heatmapStats[sector].total += item.quantity;
            }
          });

          // Calculate total distributions for percentage calculation
          const totalDistributions: number = Object.values(heatmapStats)
            .reduce((sum, data: SectorStats) => sum + data.total, 0);

          // Calculate percentages
          Object.keys(heatmapStats).forEach((sector: string) => {
            const sectorKey = sector as SectorKey;
            heatmapStats[sectorKey].distributionPercentage = 
              totalDistributions > 0 ? (heatmapStats[sectorKey].total / totalDistributions) * 100 : 0;
          });

          setSectorDistributionData(heatmapStats);
        } catch (error) {
          console.error('Failed to fetch heatmap data:', error);
        } finally {
          if (isSubscribed) {
            setLoading(false);
          }
        }
      }
    };

    fetchData();

    return () => {
      isSubscribed = false;
    };
  }, [showHeatmap]);

  // Update MapContainer render with key prop
  const mapKey = `map-${showHeatmap ? 'heatmap' : 'standard'}-${Date.now()}`;

  useEffect(() => {
    const fetchDistributionData = async () => {
      if (showHeatmap) {
        try {
          setLoading(true);
          const response = await api.get('/admin/distributions-by-sector');
          
          // Initialize sector data with base population
          const sectorData: SectorData[] = [
            { 
              id: 1, 
              name: 'North Sector', 
              type: 'PAYATAS',
              barangay: 'Payatas',
              phase: 'North',
              block: 'N/A',
              coordinates: PAYATAS_SECTORS.NORTH.coordinates,
              population: 1000, 
              totalDistributions: 0, 
              percentageComplete: 0,
              scholarCount: 0,
              color: PAYATAS_SECTORS.NORTH.color
            },
            { 
              id: 2, 
              name: 'Central Sector', 
              type: 'PAYATAS',
              barangay: 'Payatas',
              phase: 'Central',
              block: 'N/A',
              coordinates: PAYATAS_SECTORS.CENTRAL.coordinates,
              population: 1500, 
              totalDistributions: 0, 
              percentageComplete: 0,
              scholarCount: 0,
              color: PAYATAS_SECTORS.CENTRAL.color
            },
            { 
              id: 3, 
              name: 'South Sector', 
              type: 'PAYATAS',
              barangay: 'Payatas',
              phase: 'South',
              block: 'N/A',
              coordinates: PAYATAS_SECTORS.SOUTH.coordinates,
              population: 1200, 
              totalDistributions: 0, 
              percentageComplete: 0,
              scholarCount: 0,
              color: PAYATAS_SECTORS.SOUTH.color
            }
          ];

          // Process distributions by sector
          response.data.forEach((dist: any) => {
            const sector = getSectorForCoordinate(dist.latitude, dist.longitude);
            if (sector === 'NORTH') {
              sectorData[0].totalDistributions += dist.quantity;
            } else if (sector === 'CENTRAL') {
              sectorData[1].totalDistributions += dist.quantity;
            } else if (sector === 'SOUTH') {
              sectorData[2].totalDistributions += dist.quantity;
            }
          });

          // Calculate percentage complete for each sector
          sectorData.forEach(sector => {
            sector.percentageComplete = (sector.totalDistributions / sector.population) * 100;
          });

          // Update both states
          setSectorData(sectorData);
          
          // Update distribution data for heatmap
          const heatmapStats = {
            NORTH: { total: sectorData[0].totalDistributions, distributionPercentage: sectorData[0].percentageComplete },
            CENTRAL: { total: sectorData[1].totalDistributions, distributionPercentage: sectorData[1].percentageComplete },
            SOUTH: { total: sectorData[2].totalDistributions, distributionPercentage: sectorData[2].percentageComplete }
          };
          
          setSectorDistributionData(heatmapStats);
          
        } catch (error) {
          console.error('Failed to fetch distribution data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDistributionData();
  }, [showHeatmap]);

  // Update the renderMapContent function
  const renderMapContent = () => (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      
      {!showHeatmap ? (
        <>
          <Polygon
            positions={PAYATAS_POLYGON}
            pathOptions={{
              color: '#374151',
              fillColor: 'transparent',
              weight: 2,
              dashArray: '5, 10'
            }}
          >
            <Popup>
              <h4>Payatas Boundary</h4>
            </Popup>
          </Polygon>
          
          {getVisibleMarkers().map(marker => (
            <Marker
              key={`${marker.type}-${marker.id}`}
              position={[marker.lat, marker.lng]}
              icon={getMarkerIcon(marker)}
            >
              <Popup>{renderPopupContent(marker)}</Popup>
            </Marker>
          ))}
        </>
      ) : (
        <>
          {renderHeatmap()}
          <Control position="topright">
            {sectorCategories.map((stat: SectorCategory) => (
              <SectorStatsCard 
                key={stat.type} 
                stats={{
                  type: stat.type,
                  name: stat.name,
                  totalPopulation: stat.totalPopulation,
                  totalDistributions: stat.totalDistributions,
                  percentageComplete: stat.percentageComplete,
                  sectors: stat.sectors
                }} 
              />
            ))}
          </Control>
          <Control position="bottomright">
            <HeatmapLegend />
          </Control>
          <Control position="bottomleft">
            <DistributionProgress sectors={sectorData} />
          </Control>
        </>
      )}
    </>
  );

  // Initialize map when component mounts
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || map) return;

    // Initialize Leaflet default icon
    const DefaultIcon = L.icon({
      iconUrl: icon,
      iconRetinaUrl: iconRetina,
      shadowUrl: iconShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    const mapInstance = L.map(mapRef.current).setView(PAYATAS_COORDINATES, 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);

    setMap(mapInstance);
    setMapReady(true);

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  // Separate effect for handling markers
  useEffect(() => {
    if (!map || !mapReady) return;

    // Clear existing markers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add markers only when map is ready
    getVisibleMarkers().forEach(marker => {
      const markerInstance = L.marker([marker.lat, marker.lng], { 
        icon: getMarkerIcon(marker) 
      }).addTo(map);

      // Add popup after marker is added to map
      markerInstance.bindPopup(renderPopupContent(marker));
    });
  }, [map, mapReady, markers, activeFilter]);

  return (
    <div className="interactive-map-container">
      <div className="map-header">
        <h1>Interactive Map</h1>
        {renderMapControls()}
      </div>
      <div ref={mapRef} className="interactive-map"></div>
    </div>
  );
};

export default InteractiveMap;
