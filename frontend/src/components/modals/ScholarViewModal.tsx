import React from 'react';
import '../../styles/admin/Modals.css';

interface ScholarViewModalProps {
  scholar: any;
  onClose: () => void;
}

const ScholarViewModal = ({ scholar, onClose }: ScholarViewModalProps) => {
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
          <h2>Scholar Details</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="detail-row">
            <label>Full Name:</label>
            <span>{scholar.name}</span>
          </div>
          <div className="detail-row">
            <label>Email:</label>
            <span>{scholar.email}</span>
          </div>
          <div className="detail-row">
            <label>Username:</label>
            <span>{scholar.username}</span>
          </div>
          <div className="detail-row">
            <label>Phone:</label>
            <span>{scholar.phone || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <label>Date of Birth:</label>
            <span>{formatDate(scholar.date_of_birth)}</span>
          </div>
          <div className="detail-row">
            <label>Status:</label>
            <span>{scholar.status}</span>
          </div>
          <div className="detail-row">
            <label>Verified:</label>
            <span>{scholar.is_verified ? 'Yes' : 'No'}</span>
          </div>
          <div className="detail-row">
            <label>Created At:</label>
            <span>{formatDate(scholar.created_at)}</span>
          </div>
          <div className="detail-row">
            <label>Last Login:</label>
            <span>{formatLastLogin(scholar.last_login)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScholarViewModal;
