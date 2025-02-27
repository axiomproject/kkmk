import React, { useState, useEffect } from 'react';
import api from '../../../config/axios';
import { AxiosError } from 'axios';
import '../../../styles/ScholarLocation.css';
import { FiMapPin, FiCheck, FiX, FiMap, FiMessageSquare, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

interface Scholar {
  id: number;
  name: string;
  latitude: string; // Change to string since it comes from DB
  longitude: string; // Change to string since it comes from DB
  location_verified: boolean;
  profile_photo?: string;
  location_updated_at: string;
  email: string;
  phone?: string;
  address?: string;
  location_remark?: string;
  scheduled_visit?: string;
  remark_added_at?: string;
}

const ScholarsLocation: React.FC = () => {
  const [pendingScholars, setPendingScholars] = useState<Scholar[]>([]);
  const [verifiedScholars, setVerifiedScholars] = useState<Scholar[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [selectedScholar, setSelectedScholar] = useState<Scholar | null>(null);
  const [remark, setRemark] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchScholars();
  }, []);

  const fetchScholars = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch both pending and verified scholars
      const [pendingResponse, verifiedResponse] = await Promise.all([
        api.get('/scholars/pending-locations', { headers }),
        api.get('/scholars/verified-locations', { headers })
      ]);

      setPendingScholars(pendingResponse.data);
      setVerifiedScholars(verifiedResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching scholars:', error);
      setLoading(false);
    }
  };

  const handleVerifyLocation = async (scholarId: number, isVerified: boolean) => {
    try {
      // First, get the scholar details
      const scholar = pendingScholars.find(s => s.id === scholarId);
      if (!scholar) {
        throw new Error('Scholar not found');
      }

      const lat = scholar.latitude;
      const lng = scholar.longitude;
      
      let address = '';
      try {
        // Use our backend API as a proxy to OpenStreetMap
        const token = localStorage.getItem('token');
        const response = await api.get(
          `/geocode/reverse?lat=${lat}&lon=${lng}`,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        
        // Get the address from our backend response
        address = response.data.address;
      } catch (error) {
        console.error('Error getting address:', error);
        address = 'Address lookup failed';
      }

      const token = localStorage.getItem('token');
      const response = await api.put(
        `/scholars/verify-location/${scholarId}`, 
        { 
          verified: isVerified,
          address: address
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data.success) {
        setPendingScholars(current => 
          current.filter(s => s.id !== scholarId)
        );
        setVerifiedScholars(current => [...current, {
          ...scholar,
          location_verified: true,
          location_updated_at: response.data.verifiedAt,
          address: response.data.address
        }]);
        
        alert(`Location verified successfully.\nAddress: ${response.data.address}`);
      }

      // After successful verification, send notification
      await api.post(
        '/notifications/send',
        {
          userId: scholarId,
          type: 'location_verification',
          content: 'Your location has been verified successfully! 📍✅',
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );

    } catch (error) {
      console.error('Error verifying location:', error);
      alert('Failed to verify location: ' + ((error as AxiosError<{error?: string}>).response?.data?.error || (error as Error).message));
    }
  };

  const handleRejectLocation = async (scholarId: number) => {
    if (!window.confirm('Are you sure you want to reject this location?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await api.post(
        `/scholars/location-remarks/${scholarId}/reject`,
        {
          location_remark: 'Location verification rejected. Please update your location.'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Remove the scholar from the pending list immediately
        setPendingScholars(current => 
          current.filter(scholar => scholar.id !== scholarId)
        );
        alert('Location has been rejected. Scholar will need to set their location again.');
      }
    } catch (error) {
      console.error('Error rejecting location:', error);
      alert('Failed to reject location');
    }
  };

  const handleAddRemark = async (scholarId: number) => {
    const scholar = pendingScholars.find(s => s.id === scholarId);
    setSelectedScholar(scholar || null);
    setIsRemarkModalOpen(true);
  };

  const handleSubmitRemark = async () => {
    if (!selectedScholar || !remark || !visitDate) return;

    try {
      const token = localStorage.getItem('token');
      
      // First save the remark
      await api.post(
        `/scholars/location-remark/${selectedScholar.id}`,
        { remark, visitDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Then send notification
      await api.post(
        '/notifications/send',
        {
          userId: selectedScholar.id,
          type: 'location_remark',
          content: `Scheduled visit: ${new Date(visitDate).toLocaleDateString()} 📅`,
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      // Refresh the scholars list
      await fetchScholars();
      setIsRemarkModalOpen(false);
      setRemark('');
      setVisitDate('');
      setSelectedScholar(null);
      alert('Remark added successfully');
    } catch (error) {
      console.error('Error adding remark:', error);
      alert('Failed to add remark');
    }
  };

  const viewOnMap = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const viewOnAdminMap = () => {
    navigate('/Maps?filter=scholars');
  };

  const handleDeleteVerification = async (scholarId: number) => {
    if (!window.confirm('Are you sure you want to delete this verification? The scholar will need to set their location again.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const resetResponse = await api.put(
        `/scholars/reset-location/${scholarId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (resetResponse.data.success) {
        // Remove from verified list and refresh both lists
        setVerifiedScholars(current => 
          current.filter(scholar => scholar.id !== scholarId)
        );
        // Refresh the scholars lists to ensure everything is up to date
        await fetchScholars();
        alert('Verification has been removed successfully.');
      }
    } catch (error) {
      console.error('Error deleting verification:', error);
      alert('Failed to delete verification');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="scholar-location-container">
      <div className="header-section">
        <h1>Scholar Location Management</h1>
        <button className="view-map-button" onClick={viewOnAdminMap}>
          <FiMap /> View All on Map
        </button>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Verification ({pendingScholars.length})
        </button>
        <button 
          className={`tab ${activeTab === 'verified' ? 'active' : ''}`}
          onClick={() => setActiveTab('verified')}
        >
          Verified Locations ({verifiedScholars.length})
        </button>
      </div>

      <div className="scholars-list">
        {activeTab === 'pending' ? (
          pendingScholars.length === 0 ? (
            <div className="no-scholars">No pending location verifications</div>
          ) : (
            pendingScholars.map(scholar => renderScholarCard(scholar, handleVerifyLocation, handleRejectLocation, handleAddRemark, viewOnMap, 'pending'))
          )
        ) : (
          verifiedScholars.length === 0 ? (
            <div className="no-scholars">No verified locations yet</div>
          ) : (
            verifiedScholars.map(scholar => renderScholarCard(scholar, handleVerifyLocation, handleRejectLocation, handleAddRemark, viewOnMap, 'verified', handleDeleteVerification))
          )
        )}
      </div>

      {isRemarkModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add Visit Remark</h2>
            <h3>Scholar: {selectedScholar?.name}</h3>
            
            <div className="form-group">
              <label>Visit Date:</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="form-group">
              <label>Remark:</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Enter your remark about the scheduled visit..."
                required
              />
            </div>

            <div className="modal-actions">
              <button onClick={handleSubmitRemark} className="submit-buttonss">
                Submit Remark
              </button>
              <button 
                onClick={() => {
                  setIsRemarkModalOpen(false);
                  setRemark('');
                  setVisitDate('');
                  setSelectedScholar(null);
                }} 
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const renderScholarCard = (
  scholar: Scholar,
  handleVerifyLocation: (id: number, isVerified: boolean) => void,
  handleRejectLocation: (id: number) => void,
  handleAddRemark: (id: number) => void,
  viewOnMap: (lat: number, lng: number) => void,
  type: 'pending' | 'verified' = 'pending', // Add this parameter
  handleDeleteVerification?: (id: number) => void
) => (
  <div key={scholar.id} className="scholar-card">
    <div className="scholar-info">
      <img 
        src={scholar.profile_photo || 'images/default-avatar.jpg'} 
        alt={scholar.name} 
        className="scholar-photo"
      />
      <div className="scholar-details">
        <h3>{scholar.name}</h3>
        <p className="email"><strong>Email:</strong> {scholar.email}</p>
        {scholar.phone && (
          <p className="phone"><strong>Phone:</strong> {scholar.phone}</p>
        )}
        <p className="location">
          <FiMapPin /> 
          <strong>Coordinates:</strong> {parseFloat(scholar.latitude).toFixed(6)}, {parseFloat(scholar.longitude).toFixed(6)}
        </p>
        {scholar.address && (
          <p className="address">
            <strong>Address:</strong> {scholar.address}
          </p>
        )}
        <p className="timestamp">
          <strong>Location set on:</strong> {new Date(scholar.location_updated_at).toLocaleString()}
        </p>
      </div>
    </div>
    
    <div className="action-buttons">
      <button 
        className="map-button"
        onClick={() => viewOnMap(parseFloat(scholar.latitude), parseFloat(scholar.longitude))}
      >
        View on Map
      </button>
      {type === 'pending' ? (
        <>
          <button 
            className="verify-button"
            onClick={() => handleVerifyLocation(scholar.id, true)}
          >
            <FiCheck /> Verify
          </button>
          <button 
            className="reject-button"
            onClick={() => handleRejectLocation(scholar.id)}
          >
            <FiX /> Reject
          </button>
          <button 
            className="remark-button"
            onClick={() => handleAddRemark(scholar.id)}
          >
            <FiMessageSquare /> Add Remark
          </button>
        </>
      ) : (
        <button 
          className="delete-button"
          onClick={() => handleDeleteVerification?.(scholar.id)}
        >
          <FiTrash2 /> Delete
        </button>
      )}
    </div>
  </div>
);

export default ScholarsLocation;
