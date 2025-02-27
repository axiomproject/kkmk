import React, { useState } from 'react';
import '../../styles/admin/Forms.css';

interface ScholarEditFormProps {
  scholar: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const ScholarEditForm = ({ scholar, onSubmit, onCancel }: ScholarEditFormProps) => {
  interface FormData {
      name: string;
      email: string;
      username: string;
      phone: string;
      date_of_birth: string;
      status: string;
      is_verified: boolean;
      password?: string; // Optional property
  }
  
  const [formData, setFormData] = useState<FormData>({
      name: scholar.name || '',
      email: scholar.email || '',
      username: scholar.username || '',
      phone: scholar.phone || '',
      date_of_birth: scholar.date_of_birth ? 
        new Date(scholar.date_of_birth).toISOString().split('T')[0] : '',
      status: scholar.status || 'active',
      is_verified: scholar.is_verified || false,
      password: '' // Optional for updates
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a new object with all form data except password
    const submitData = { ...formData };
    
    // Only include password if it was actually entered (not empty)
    if (!submitData.password) {
      delete submitData.password;
    }
    
    onSubmit(submitData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-contents">
        <div className="modal-header">
          <h2>Edit Scholar</h2>
          <button className="close-button" onClick={onCancel}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-group">
            <label>Full Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter full name"
            />
          </div>

          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter email address"
            />
          </div>

          <div className="form-group">
            <label>Password: (Leave empty to keep current)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter new password"
            />
          </div>

          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter username"
            />
          </div>

          <div className="form-group">
            <label>Phone:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
          </div>

          <div className="form-group">
            <label>Date of Birth:</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Status:</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="form-group checkboxes">
            <label>
              <input
                type="checkbox"
                name="is_verified"
                checked={formData.is_verified}
                onChange={handleChange}
              />
              Verified
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">Save Changes</button>
            <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScholarEditForm;
