import React from 'react';
import '../../styles/admin/Modals.css';

interface VolunteerViewModalProps {
  volunteer: any;
  onClose: () => void;
}

const VolunteerViewModal = ({ volunteer, onClose }: VolunteerViewModalProps) => {
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

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
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
          <h2>Volunteer Details</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="detail-row">
            <label>Full Name:</label>
            <span>{volunteer.name}</span>
          </div>
          <div className="detail-row">
            <label>Email:</label>
            <span>{volunteer.email}</span>
          </div>
          <div className="detail-row">
            <label>Username:</label>
            <span>{volunteer.username}</span>
          </div>
          <div className="detail-row">
            <label>Phone:</label>
            <span>{volunteer.phone || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <label>Date of Birth:</label>
            <span>{formatDate(volunteer.date_of_birth)}</span>
          </div>
          <div className="detail-row">
            <label>Status:</label>
            <span>{volunteer.status}</span>
          </div>
          <div className="detail-row">
            <label>Verified:</label>
            <span>{volunteer.is_verified ? 'Yes' : 'No'}</span>
          </div>
          <div className="detail-row">
            <label>Created At:</label>
            <span>{formatDateTime(volunteer.created_at)}</span>
          </div>
          <div className="detail-row">
            <label>Last Login:</label>
            <span>{formatLastLogin(volunteer.last_login)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolunteerViewModal;
