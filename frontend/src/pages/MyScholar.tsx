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

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${import.meta.env.VITE_API_URL}${path}`;
  };

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    const fetchSponsorDonations = async () => {
      try {
        const response = await api.get(`/scholardonations/sponsor/${user.id}`);
        const donations: ScholarDonation[] = response.data;
        
        // Group donations by scholar
        const scholarMap = new Map<number, SponsoredScholar>();
        
        donations.forEach(donation => {
          if (!scholarMap.has(donation.scholar_id)) {
            scholarMap.set(donation.scholar_id, {
              scholarId: donation.scholar_id,
              name: `${donation.scholar_first_name} ${donation.scholar_last_name}`,
              image: donation.scholar_image,
              totalDonated: 0,
              lastDonation: donation.created_at,
              donations: [],
              currentAmount: donation.current_amount,
              amountNeeded: donation.amount_needed
            });
          }
          
          const scholar = scholarMap.get(donation.scholar_id)!;
          if (donation.verification_status === 'verified') {
            scholar.totalDonated += donation.amount;
          }
          scholar.donations.push(donation);
        });
        
        setSponsoredScholars(Array.from(scholarMap.values()));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching sponsor donations:', error);
        setLoading(false);
      }
    };

    fetchSponsorDonations();
  }, [user?.id]);

  if (loading) return <div>Loading...</div>;

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
        {!user ? (
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
                    src={getImageUrl(scholar.image)}
                    alt={scholar.name}
                    className="student-profile-image"
                    onClick={() => navigate(`/StudentProfile/${scholar.scholarId}`)}
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
                    {scholar.donations.slice(0, 3).map((donation) => (
                      <div key={donation.id} className="donation-item">
                        <span className="donation-amount">
                          ₱{formatAmount(donation.amount)}
                        </span>
                        <span className={`donation-status ${donation.verification_status}`}>
                          {donation.verification_status}
                        </span>
                        <span className="donation-date">
                          {new Date(donation.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {sponsoredScholars.length === 0 && (
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