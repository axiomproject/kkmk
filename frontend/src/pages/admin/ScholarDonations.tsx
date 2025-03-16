import React, { useState, useEffect } from 'react';
import api from '../../config/axios'; // Replace axios import
import { FaCheck, FaTimes, FaEye } from 'react-icons/fa';
import '../../styles/ScholarDonations.css';


interface ScholarDonation {
  id: number;
  scholar_id: number;
  donor_name: string;
  donor_email: string;
  donor_phone: string;
  amount: number;
  payment_method: string;
  proof_image?: string;
  message?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  verified_at?: string;
  verified_by?: string;
  rejected_at?: string; // Make sure this field is defined
  rejected_by?: string; // Make sure this field is defined
  rejection_reason?: string;
  frequency?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'; // Add frequency field
  
  // Add the scholar_name field that is coming from the API
  scholar_name?: string;
  scholar_first_name?: string;
  scholar_last_name?: string;
  scholar?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

// Helper function to format frequency for display
const formatFrequency = (frequency?: string): string => {
  if (!frequency) return 'One-time';
  
  switch(frequency) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'semi_annual':
      return 'Semi-Annual';
    case 'annual':
      return 'Annual';
    default:
      return frequency.charAt(0).toUpperCase() + frequency.slice(1).replace('_', '-');
  }
};

const ScholarDonations: React.FC = () => {
  const [donations, setDonations] = useState<ScholarDonation[]>([]);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [selectedDonation, setSelectedDonation] = useState<ScholarDonation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isImageEnlarged, setIsImageEnlarged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // Add this state for action processing
  const [actionMessage, setActionMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null); // Add this for message display

  useEffect(() => {
    fetchDonations();
    const interval = setInterval(fetchDonations, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add a timestamp to avoid caching
      const timestamp = new Date().getTime();
      const response = await api.get(`/scholardonations/all?timestamp=${timestamp}`);
      console.log('Response from API:', response);
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      console.log('Fetched scholar donations:', response.data);
      
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid data format received from server');
      }
      
      // Process donations to handle any missing fields
      const processedDonations = response.data.map(donation => {
        // Debug the donation data to see exact structure and field names
        console.log('Processing donation:', donation);
        console.log('Scholar name field:', donation.scholar_name);
        console.log('Scholar_id:', donation.scholar_id);
        
        // Check for common naming variations of scholar_name
        const possibleScholarNameFields = [
          'scholar_name', 
          'scholarName', 
          'scholar_fullname', 
          'scholar.name', 
          'scholarFullName'
        ];
        
        let scholarName = null;
        for (const field of possibleScholarNameFields) {
          const value = field.includes('.') 
            ? field.split('.').reduce((obj, key) => obj && obj[key], donation)
            : donation[field];
            
          if (value) {
            console.log(`Found scholar name in field: ${field} = ${value}`);
            scholarName = value;
            break;
          }
        }
        
        return {
          ...donation,
          donor_name: donation.donor_name || 'Anonymous',
          // Use found scholar name or check all possible properties
          scholar_name: scholarName || donation.scholar_name,
          scholar_first_name: donation.scholar_first_name || (donation.scholar ? donation.scholar.first_name : ''),
          scholar_last_name: donation.scholar_last_name || (donation.scholar ? donation.scholar.last_name : ''),
          proof_image: donation.proof_of_payment || donation.proof_image
        };
      });
      
      console.log('Processed donations:', processedDonations);
      setDonations(processedDonations);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching donations:', error);
      setError('Failed to load scholar donations data');
      setLoading(false);
    }
  };

  const handleVerify = async (id: number) => {
    if (!window.confirm('Verify this donation?')) return;
    
    try {
      setIsProcessing(true);
      // Update to use the correct endpoint
      await api.post(`/scholardonations/verify/${id}`);
      await fetchDonations();
      
      // Show success message
      setActionMessage({
        text: 'Donation verified successfully!',
        type: 'success'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setActionMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error verifying donation:', error);
      setActionMessage({
        text: 'Failed to verify donation. Please try again.',
        type: 'error'
      });
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setActionMessage(null);
      }, 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: number) => {
    // Change prompt to clearly indicate reason is optional
    const reason = window.prompt('Please enter reason for rejection (optional):');
    
    // Continue with the rejection process even if the user clicks "Cancel" (null)
    // or submits an empty string
    try {
      setIsProcessing(true);
      
      // Pass the reason if provided, otherwise pass an empty string
      await api.post(`/scholardonations/reject/${id}`, { reason: reason || '' });
      await fetchDonations();
      
      // Show success message
      setActionMessage({
        text: 'Donation rejected successfully.',
        type: 'success'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setActionMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error rejecting donation:', error);
      setActionMessage({
        text: 'Failed to reject donation. Please try again.',
        type: 'error'
      });
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setActionMessage(null);
      }, 5000);
    } finally {
      setIsProcessing(false);
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

  // Update the formatDate function to handle potentially null dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    
    try {
      return new Date(dateString).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  if (loading) {
    return <div className="loading-container">Loading scholar donations...</div>;
  }

  if (error) {
    return <div className="error-container">Error: {error}</div>;
  }

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

      {/* Add message alert banner */}
      {actionMessage && (
        <div 
          className={`action-message ${actionMessage.type}`}
          style={{
            padding: '10px 20px',
            borderRadius: '4px',
            margin: '10px 0',
            backgroundColor: actionMessage.type === 'success' ? '#d4edda' : '#f8d7da',
            color: actionMessage.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${actionMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            textAlign: 'center',
            position: 'relative',
            fontWeight: '500'
          }}
        >
          {actionMessage.text}
          <span 
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              fontSize: '18px'
            }}
            onClick={() => setActionMessage(null)}
          >
            &times;
          </span>
        </div>
      )}

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

      {/* Show loading indicator when processing an action */}
      {isProcessing && (
        <div 
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '8px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <div className="loading-spinner"></div>
          <p>Processing request...</p>
        </div>
      )}

      {filteredDonations.length === 0 ? (
        <div className="no-data-message">
          No {activeTab} donations found.
        </div>
      ) : (
        <div className="donation-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Scholar</th>
                <th>Amount</th>
                <th>Donor</th>
                <th>Method</th>
                <th>Frequency</th> {/* Add frequency column header */}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDonations.map((donation) => {
                console.log('Rendering donation row:', donation);
                
                // Determine scholar name to display
                let scholarDisplayName = 'Unknown Scholar (ID: ' + donation.scholar_id + ')';
                
                if (donation.scholar_name) {
                  scholarDisplayName = donation.scholar_name;
                } else if (donation.scholar_first_name) {
                  // Use just first name if it's available and last name is empty
                  scholarDisplayName = donation.scholar_first_name + 
                    (donation.scholar_last_name ? ' ' + donation.scholar_last_name : '');
                } else if (donation.scholar && donation.scholar.first_name) {
                  scholarDisplayName = donation.scholar.first_name + 
                    (donation.scholar.last_name ? ' ' + donation.scholar.last_name : '');
                }
                
                console.log('Scholar name display value:', scholarDisplayName);
                
                return (
                <tr key={donation.id}>
                  <td>{formatDate(donation.created_at)}</td>
                  <td>{scholarDisplayName}</td>
                  <td>₱{Number(donation.amount).toLocaleString()}</td>
                  <td>{donation.donor_name || 'Anonymous'}</td>
                  <td>{donation.payment_method}</td>
                  <td>{formatFrequency(donation.frequency)}</td> {/* Add frequency column */}
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
                            disabled={isProcessing}
                          >
                            {isProcessing ? 'Processing...' : 'Verify'}
                          </button>
                          <button
                            className="reject-button"
                            onClick={() => handleReject(donation.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? 'Processing...' : 'Reject'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

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
                <p>
                  {selectedDonation.scholar_name ? selectedDonation.scholar_name :
                    selectedDonation.scholar_first_name ? 
                      selectedDonation.scholar_first_name + (selectedDonation.scholar_last_name ? ' ' + selectedDonation.scholar_last_name : '') :
                      selectedDonation.scholar ? 
                        selectedDonation.scholar.first_name + (selectedDonation.scholar.last_name ? ' ' + selectedDonation.scholar.last_name : '') :
                        `Unknown Scholar (ID: ${selectedDonation.scholar_id})`}
                </p>
              </div>
              <div className="detail-group">
                <label>Donor Name:</label>
                <p>{selectedDonation.donor_name || 'Anonymous'}</p>
              </div>
              <div className="detail-group">
                <label>Email:</label>
                <p>{selectedDonation.donor_email || 'Not provided'}</p>
              </div>
              <div className="detail-group">
                <label>Contact Number:</label>
                <p>{selectedDonation.donor_phone || 'Not provided'}</p>
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
                <label>Frequency:</label>
                <p>{formatFrequency(selectedDonation.frequency)}</p>
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
              {selectedDonation.proof_image && (
                <div className="detail-group">
                  <label>Proof of Payment:</label>
                  <div className="proof-preview">
                    <img 
                      src={selectedDonation.proof_image} 
                      alt="Proof of Payment"
                      className="proof-thumbnail"
                      onClick={() => handleProofClick(selectedDonation.proof_image!)}
                    />
                  </div>
                </div>
              )}
              {/* Add verification and rejection details if available */}
              {selectedDonation.verification_status === 'verified' && (
                <>
                  <div className="detail-group">
                    <label>Verified At:</label>
                    <p>{selectedDonation.verified_at ? formatDate(selectedDonation.verified_at) : 'N/A'}</p>
                  </div>
                  <div className="detail-group">
                    <label>Verified By:</label>
                    <p>{selectedDonation.verified_by || 'N/A'}</p>
                  </div>
                </>
              )}
              {selectedDonation.verification_status === 'rejected' && (
                <>
                  <div className="detail-group">
                    <label>Rejected At:</label>
                    <p>{formatDate(selectedDonation.rejected_at)}</p>
                  </div>
                  <div className="detail-group">
                    <label>Rejected By:</label>
                    <p>{selectedDonation.rejected_by || 'N/A'}</p>
                  </div>
                  <div className="detail-group">
                    <label>Rejection Reason:</label>
                    <p>{selectedDonation.rejection_reason || 'No reason provided'}</p>
                  </div>
                </>
              )}
            </div>
            {selectedDonation.verification_status === 'pending' && (
              <div className="modal-footer">
                <button 
                  className="verify-button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleVerify(selectedDonation.id);
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Verify Donation'}
                </button>
                <button 
                  className="reject-button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleReject(selectedDonation.id);
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Reject Donation'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarDonations;
