import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaEye } from 'react-icons/fa';
import '../../styles/ScholarDonations.css';


interface ScholarDonation {
  id: number;
  scholar_id: number;
  scholar_first_name: string;
  scholar_last_name: string;
  amount: number;
  donor_name: string;
  donor_email: string;
  donor_phone: string;
  message?: string;
  proof_of_payment?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at?: string;
  verified_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
  payment_method: string;
  created_at: string;
}

const ScholarDonations: React.FC = () => {
  const [donations, setDonations] = useState<ScholarDonation[]>([]);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [selectedDonation, setSelectedDonation] = useState<ScholarDonation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isImageEnlarged, setIsImageEnlarged] = useState(false);

  useEffect(() => {
    fetchDonations();
    const interval = setInterval(fetchDonations, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDonations = async () => {
    try {
      const response = await fetch('http://localhost:5175/api/scholardonations/all', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch donations');
      const data = await response.json();
      setDonations(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  };

  const handleVerify = async (id: number) => {
    if (!window.confirm('Are you sure you want to verify this donation?')) return;
    
    try {
      const response = await fetch(`http://localhost:5175/api/scholardonations/verify/${id}`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to verify donation');
      
      await fetchDonations();
    } catch (error) {
      console.error('Error verifying donation:', error);
      alert('Failed to verify donation');
    }
  };

  const handleReject = async (id: number) => {
    const reason = window.prompt('Please enter reason for rejection:');
    if (!reason) return;

    try {
      const response = await fetch(`http://localhost:5175/api/scholardonations/reject/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason })
      });

      if (!response.ok) throw new Error('Failed to reject donation');
      
      await fetchDonations();
    } catch (error) {
      console.error('Error rejecting donation:', error);
      alert('Failed to reject donation');
    }
  };

  const handleProofClick = (proofUrl: string) => {
    setSelectedProof(proofUrl);
    setShowProofModal(true);
  };

  const filteredDonations = donations.filter(
    donation => donation.verification_status === activeTab
  );

  const calculateTotal = (status: 'pending' | 'verified' | 'rejected') => {
    return donations
      .filter(d => d.verification_status === status)
      .reduce((sum, d) => sum + Number(d.amount), 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bank-container">
      <div className="bank-header">
        <h1 className="bank-title">Scholar Donations Management</h1>
        <div className="bank-actions">
          <div className="bank-tab-buttons">
            {['pending', 'verified', 'rejected'].map((tab) => (
              <button
                key={tab}
                className={`bank-tab-buttons ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab as 'pending' | 'verified' | 'rejected')}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card total">
          <h3 className="stat-title">Pending Donations</h3>
          <p className="stat-value">₱{calculateTotal('pending').toLocaleString()}</p>
        </div>
        <div className="stat-card monthly">
          <h3 className="stat-title">Verified Donations</h3>
          <p className="stat-value">₱{calculateTotal('verified').toLocaleString()}</p>
        </div>
        <div className="stat-card pending">
          <h3 className="stat-title">Rejected Donations</h3>
          <p className="stat-value">₱{calculateTotal('rejected').toLocaleString()}</p>
        </div>
      </div>

      <div className="donation-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Scholar</th>
              <th>Amount</th>
              <th>Donor</th>
              <th>Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDonations.map((donation) => (
              <tr key={donation.id}>
                <td>{formatDate(donation.created_at)}</td>
                <td>{`${donation.scholar_first_name} ${donation.scholar_last_name}`}</td>
                <td>₱{Number(donation.amount).toLocaleString()}</td>
                <td>{donation.donor_name}</td>
                <td>{donation.payment_method}</td>
                <td>
                  <span className={`status-badge ${donation.verification_status}`}>
                    {donation.verification_status}
                  </span>
                </td>
                <td>
                  <div className="action-button-bank">
                    <button
                      className="verify-button"
                      onClick={() => {
                        setSelectedDonation(donation);
                        setShowDetailsModal(true);
                      }}
                    >
                      View
                    </button>
                    {donation.verification_status === 'pending' && (
                      <>
                        <button
                          className="verify-button"
                          onClick={() => handleVerify(donation.id)}
                        >
                          Verify
                        </button>
                        <button
                          className="reject-button"
                          onClick={() => handleReject(donation.id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Proof Modal */}
      {showProofModal && selectedProof && (
        <div className="modal-overlay proof-overlay" onClick={() => setShowProofModal(false)}>
          <div 
            className={`modal-content proof-modal ${isImageEnlarged ? 'enlarged' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Proof of Payment</h2>
              <button className="close-button" onClick={() => setShowProofModal(false)}>×</button>
            </div>
            <div className="modal-body proof-modal-body">
              <img 
                src={selectedProof}
                alt="Proof of Payment" 
                className="proof-modal-image"
                onClick={() => setIsImageEnlarged(!isImageEnlarged)}
                style={{ cursor: 'zoom-in' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedDonation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Donation Details</h2>
              <button className="close-button" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-group">
                <label>Scholar Name:</label>
                <p>{selectedDonation.scholar_first_name} {selectedDonation.scholar_last_name}</p>
              </div>
              <div className="detail-group">
                <label>Donor Name:</label>
                <p>{selectedDonation.donor_name}</p>
              </div>
              <div className="detail-group">
                <label>Email:</label>
                <p>{selectedDonation.donor_email}</p>
              </div>
              <div className="detail-group">
                <label>Contact Number:</label>
                <p>{selectedDonation.donor_phone}</p>
              </div>
              <div className="detail-group">
                <label>Amount:</label>
                <p>₱{Number(selectedDonation.amount).toLocaleString()}</p>
              </div>
              <div className="detail-group">
                <label>Payment Method:</label>
                <p>{selectedDonation.payment_method}</p>
              </div>
              <div className="detail-group">
                <label>Date:</label>
                <p>{formatDate(selectedDonation.created_at)}</p>
              </div>
              {selectedDonation.message && (
                <div className="detail-group">
                  <label>Message:</label>
                  <p>{selectedDonation.message}</p>
                </div>
              )}
              {selectedDonation.proof_of_payment && (
                <div className="detail-group">
                  <label>Proof of Payment:</label>
                  <div className="proof-preview">
                    <img 
                      src={selectedDonation.proof_of_payment} 
                      alt="Proof of Payment"
                      className="proof-thumbnail"
                      onClick={() => handleProofClick(selectedDonation.proof_of_payment!)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarDonations;
