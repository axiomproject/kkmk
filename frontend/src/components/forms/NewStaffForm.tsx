import React, { useState } from 'react';
import { StaffFormData } from '../../types/staff';
import '../../styles/admin/Forms.css';

interface Props {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const NewStaffForm: React.FC<Props> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<StaffFormData>({
    name: '',
    email: '',
    password: '',
    department: '',
    phone: '',
    status: 'active'
  });

  return (
    <div className="modal-overlay">
      <form className="staff-form-content" onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}>
        <h2>New Staff Member</h2>
        
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter full name"
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            placeholder="staff.name@kkmk.com"
            required
          />
          <small className="form-note">Email must be in format: staff.name@kkmk.com</small>
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter password"
            required
          />
        </div>

        <div className="form-group">
          <label>Department</label>
          <input
            type="text"
            value={formData.department}
            onChange={e => setFormData({ ...formData, department: e.target.value })}
            placeholder="Enter department name"
          />
        </div>

        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter phone number"
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value })}
            required
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="staff-form-actions">
          <button type="submit" className="submit-btn">Create Staff</button>
          <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default NewStaffForm;
