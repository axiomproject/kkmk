import React from 'react';
import { StaffMember } from '../../types/staff';
import '../../styles/admin/Modals.css';

interface Props {
  staff: StaffMember;
  onClose: () => void;
}

const StaffViewModal: React.FC<Props> = ({ staff, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Staff Details</h2>
        <div className="modal-body">
          <p><strong>Name:</strong> {staff.name}</p>
          <p><strong>Email:</strong> {staff.email}</p>
          <p><strong>Department:</strong> {staff.department || 'N/A'}</p>
          <p><strong>Phone:</strong> {staff.phone || 'N/A'}</p>
          <p><strong>Status:</strong> {staff.status}</p>
          <p><strong>Created At:</strong> {new Date(staff.created_at).toLocaleDateString()}</p>
          <p><strong>Last Login:</strong> {staff.last_login ? new Date(staff.last_login).toLocaleDateString() : 'Never'}</p>
        </div>
        <button className="modal-close" onClick={onClose}>x</button>
      </div>
    </div>
  );
};

export default StaffViewModal;
