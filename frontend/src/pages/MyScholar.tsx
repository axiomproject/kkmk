import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/StudentProfile.css';
import api from '../config/axios'; // Replace axios import

interface ScholarDonation {
  id: number;
  scholar_id: number;
  scholar_first_name: string;
  scholar_last_name: string;
  scholar_image: string;
  amount: number;
  created_at: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  current_amount: number;
  amount_needed: number;
  image_url?: string;
}

interface SponsoredScholar {
  scholarId: number;
  name: string;
  image: string;
  totalDonated: number;
  lastDonation: string;
  donations: ScholarDonation[];
  currentAmount: number;
  amountNeeded: number;
  image_url?: string;
}

interface Fundraiser {
  id: number;
  title: string;
  amountRaised: string;
  progressPercentage: number;
  imageUrl: string;
}

const formatAmount = (amount: number) => {
  return Math.round(amount).toLocaleString(); // Rounds to nearest integer and adds commas
};

const ProgressBar: React.FC<{ currentAmount: number; amountNeeded: number }> = ({ currentAmount, amountNeeded }) => {
  const percentage = Math.min((currentAmount / amountNeeded) * 100, 100);
  
  return (
    <div className="scholar-progress-container">
      <div className="scholar-progress-bar">
        <div 
          className="scholar-progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="scholar-progress-text">
        <span>₱{formatAmount(currentAmount)}</span>
        <span>₱{formatAmount(amountNeeded)}</span>
      </div>
    </div>
  );
};

const MyScholars: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sponsoredScholars, setSponsoredScholars] = useState<SponsoredScholar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getImageUrl = (scholar: SponsoredScholar) => {
    // Prioritize image_url from scholars table
    if (scholar.image_url) {
      if (scholar.image_url.startsWith('data:') || scholar.image_url.startsWith('http')) {
        return scholar.image_url;
      }
      return `${import.meta.env.VITE_API_URL}${scholar.image_url}`;
    }
    
    // Fallback to image field if available
    if (scholar.image) {
      if (scholar.image.startsWith('data:') || scholar.image.startsWith('http')) {
        return scholar.image;
      }
      return `${import.meta.env.VITE_API_URL}${scholar.image}`;
    }
    
    // Default placeholder - make sure this file exists in your public folder
    return '/images/default-avatar.jpg';
  };

  useEffect(() => {
    const fetchSponsorDonations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user ID from localStorage if not available in context
        const userId = user?.id || JSON.parse(localStorage.getItem('user') || '{}').id;
        
        if (!userId) {
          setLoading(false);
          return;
        }
        
        console.log('Fetching donations for sponsor ID:', userId);
        
        // Use the correct endpoint name (should match backend route)
        const response = await api.get(`/scholardonations/sponsor/${userId}`);
        console.log('Response data:', response.data);
        
        if (!response.data || !Array.isArray(response.data)) {
          console.error('Invalid response format:', response.data);
          setError('Received invalid data from server');
          setLoading(false);
          return;
        }
        
        const donations: ScholarDonation[] = response.data;
        
        // Group donations by scholar
        const scholarMap = new Map<number, SponsoredScholar>();
        
        donations.forEach(donation => {
          if (!scholarMap.has(donation.scholar_id)) {
            scholarMap.set(donation.scholar_id, {
              scholarId: donation.scholar_id,
              name: `${donation.scholar_first_name} ${donation.scholar_last_name}`,
              image: donation.scholar_image || '',
              image_url: donation.image_url || '',
              totalDonated: 0,
              lastDonation: donation.created_at,
              donations: [],
              currentAmount: donation.current_amount || 0,
              amountNeeded: donation.amount_needed || 10000 // Default if not available
            });
          }
          
          const scholar = scholarMap.get(donation.scholar_id)!;
          if (donation.verification_status === 'verified') {
            scholar.totalDonated += parseFloat(donation.amount as any) || 0;
          }
          scholar.donations.push(donation);
        });
        
        const scholars = Array.from(scholarMap.values());
        console.log('Processed scholars:', scholars);
        setSponsoredScholars(scholars);
        
      } catch (error) {
        console.error('Error fetching sponsor donations:', error);
        setError('Failed to load sponsored scholars. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSponsorDonations();
  }, [user?.id]);

  if (loading) return (
    <div className="loading-container" style={{ 
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center',
      height: '50vh'
    }}>
      <div className="loading-spinner"></div>
      <p>Loading sponsored scholars...</p>
    </div>
  );

  return (
    <div className="student-profile-container">
      <div className="student-profile-sidebar">
        <button className="student-profile-btn active">My Scholars</button>
        <button className="student-profile-btn" onClick={() => navigate('/StudentProfile')}>
          Back to Students
        </button>
      </div>
      
      <div className="student-profile-main">
        <h1 className="student-profile-title">My Scholars</h1>
        
        {error && (
          <div className="error-message" style={{
            color: 'red',
            padding: '10px',
            margin: '10px 0',
            backgroundColor: '#ffeeee',
            borderRadius: '5px'
          }}>
            {error}
          </div>
        )}
        
        {!user && !localStorage.getItem('user') ? (
          <div className="no-scholars-message">
            <p>Please log in to view your sponsored scholars.</p>
            <button 
              className="browse-scholars-btn"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
          </div>
        ) : (
          <>
            <p className="student-profile-desc">
              View and track your donations to scholars.
            </p>

            <div className="student-profile-grid">
              {sponsoredScholars.map((scholar) => (
                <div 
                  className="student-profile-card" 
                  key={scholar.scholarId}
                >
                  <img
                    src={getImageUrl(scholar)}
                    alt={scholar.name}
                    className="student-profile-image"
                    onClick={() => navigate(`/StudentProfile/${scholar.scholarId}`)}
                    onError={(e) => {
                      console.log(`Image failed to load for scholar ${scholar.scholarId}`);
                      // Ensure the default image path is correct for your project structure
                      (e.target as HTMLImageElement).src = '/images/default-avatar.jpg';
                    }}
                  />
                  <h3 className="student-profile-name">{scholar.name}</h3>
                  <ProgressBar 
                    currentAmount={scholar.currentAmount} 
                    amountNeeded={scholar.amountNeeded}
                  />
                  <div className="donation-info">
                    <p className="total-donated">
                      Total Donated: ₱{formatAmount(scholar.totalDonated)}
                    </p>
                    <p className="last-donation">
                      Last Donation: {new Date(scholar.lastDonation).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="donation-history">
                    <h4>Recent Donations</h4>
                    {scholar.donations.length > 0 ? (
                      scholar.donations.slice(0, 3).map((donation) => (
                        <div key={donation.id} className="donation-item">
                          <span className="donation-amount">
                            ₱{formatAmount(parseFloat(donation.amount as any) || 0)}
                          </span>
                          <span className={`donation-status ${donation.verification_status}`}>
                            {donation.verification_status}
                          </span>
                          <span className="donation-date">
                            {new Date(donation.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p>No recent donations</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {sponsoredScholars.length === 0 && !error && (
              <div className="no-scholars-message">
                <p>You haven't made any donations yet.</p>
                <button 
                  className="browse-scholars-btn"
                  onClick={() => navigate('/StudentProfile')}
                >
                  Browse Scholars
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyScholars;