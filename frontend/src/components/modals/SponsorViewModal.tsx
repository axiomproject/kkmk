import React from 'react';
import '../../styles/admin/Modals.css';

interface SponsorViewModalProps {
  sponsor: any;
  onClose: () => void;
}

const SponsorViewModal = ({ sponsor, onClose }: SponsorViewModalProps) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatLastLogin = (dateString: string) => {
    if (!dateString) return 'Never logged in';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-contents" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Sponsor Details</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="detail-row">
            <label>Full Name:</label>
            <span>{sponsor.name}</span>
          </div>
          <div className="detail-row">
            <label>Email:</label>
            <span>{sponsor.email}</span>
          </div>
          <div className="detail-row">
            <label>Username:</label>
            <span>{sponsor.username}</span>
          </div>
          <div className="detail-row">
            <label>Phone:</label>
            <span>{sponsor.phone || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <label>Date of Birth:</label>
            <span>{formatDate(sponsor.date_of_birth)}</span>
          </div>
          <div className="detail-row">
            <label>Status:</label>
            <span>{sponsor.status}</span>
          </div>
          <div className="detail-row">
            <label>Verified:</label>
            <span>{sponsor.is_verified ? 'Yes' : 'No'}</span>
          </div>
          <div className="detail-row">
            <label>Created At:</label>
            <span>{formatDate(sponsor.created_at)}</span>
          </div>
          <div className="detail-row">
            <label>Last Login:</label>
            <span>{formatLastLogin(sponsor.last_login)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SponsorViewModal;
