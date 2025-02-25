import { useEffect, useState } from 'react';
import '../../styles/Layout.css';
import { User, UserDetailsUpdateResponse } from '../../types/auth';
import axios from 'axios';
import phFlag from '../../img/phflag.png'

interface ValidationErrors {
  name?: string;
  email?: string;
  username?: string;
  phone?: string;
  dateOfBirth?: string;
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const VolunteerSettings = () => {
  const [userData, setUserData] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    dateOfBirth: ''
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [initialFormData, setInitialFormData] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    dateOfBirth: ''
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      console.log('Raw user data:', user);
      
      // Properly format the date from any possible source
      let formattedDate = '';
      if (user.dateOfBirth) {
        formattedDate = user.dateOfBirth.split('T')[0];
      }
      
      console.log('Formatted date for display:', formattedDate);
      
      const formattedInitialData = {
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        phone: user.phone || '',
        dateOfBirth: formattedDate
      };
      
      setInitialFormData(formattedInitialData);
      setFormData(formattedInitialData);
    }
  }, []);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Check if it starts with 0 or 63 or +63
    let final = cleaned;
    if (cleaned.startsWith('0')) {
      final = `+63${cleaned.substring(1)}`;
    } else if (cleaned.startsWith('63')) {
      final = `+${cleaned}`;
    } else if (!cleaned.startsWith('+')) {
      final = `+63${cleaned}`;
    }

    // Format as: +63 9XX XXX XXXX
    if (final.length >= 12) {
      return `${final.slice(0, 3)} ${final.slice(3, 6)} ${final.slice(6, 9)} ${final.slice(9, 13)}`;
    }
    return final;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      setFormData(prev => ({
        ...prev,
        [name]: formatPhoneNumber(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2 || formData.name.length > 50) {
      newErrors.name = 'Name must be between 2 and 50 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3 || formData.username.length > 20) {
      newErrors.username = 'Username must be between 3 and 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Philippine phone number validation
    if (formData.phone) {
      const phoneRegex = /^\+63 9\d{2} \d{3} \d{4}$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid Philippine phone number (+63 9XX XXX XXXX)';
      }
    }

    // Date of Birth validation
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of Birth is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!passwordForm.oldPassword) {
      newErrors.oldPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase and numbers';
    }

    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = async () => {
    if (!validateForm()) {
      alert('Please correct the errors before saving.');
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      // Advance the date by one day
      const date = new Date(formData.dateOfBirth);
      date.setDate(date.getDate() + 1);
      const dateToSend = date.toISOString();

      console.log('Sending date to backend:', dateToSend);

      const { data } = await axios.put<UserDetailsUpdateResponse>(
        'http://localhost:5175/api/user/details',
        {
          userId: user.id,
          name: formData.name,
          email: formData.email,
          username: formData.username,
          dateOfBirth: dateToSend,
          phone: formData.phone,
          intro: user.intro,        // Preserve intro
          knownAs: user.knownAs    // Preserve knownAs
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (data.user) {
        // Format the date for storage and preserve existing fields
        const updatedUser = {
          ...user,                // Keep all existing user data
          ...data.user,          // Merge with new data
          dateOfBirth: data.user.dateOfBirth ? 
            data.user.dateOfBirth.split('T')[0] : '',
          intro: user.intro || data.user.intro,          // Preserve intro
          knownAs: user.knownAs || data.user.knownAs    // Preserve knownAs
        };

        console.log('Saving updated user to localStorage:', updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Update the initial form data
        setInitialFormData({
          ...formData,
          dateOfBirth: updatedUser.dateOfBirth
        });
        
        alert('Changes saved successfully!');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handlePasswordSubmit = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      await axios.put(
        'http://localhost:5175/api/user/password',
        {
          userId: user.id,
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      alert('Password changed successfully!');
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});  // Clear any existing errors
    } catch (error: any) {
      console.error('Password update error:', error.response?.data || error);
      const errorMessage = error.response?.data?.error || 'Failed to change password. Please try again.';
      if (errorMessage === 'Current password is incorrect') {
        setErrors(prev => ({ ...prev, oldPassword: 'Current password is incorrect' }));
      } else {
        alert(errorMessage);
      }
    }
  };

  const isPasswordFormValid = (): boolean => {
    // Check if all fields are filled and passwords match
    return (
      passwordForm.oldPassword.length > 0 &&
      passwordForm.newPassword.length >= 6 &&
      passwordForm.confirmPassword === passwordForm.newPassword &&
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)
    );
  };

  const isFormChanged = (): boolean => {
    return (
      formData.name !== initialFormData.name ||
      formData.email !== initialFormData.email ||
      formData.username !== initialFormData.username ||
      formData.phone !== initialFormData.phone ||
      formData.dateOfBirth !== initialFormData.dateOfBirth
    );
  };

  const isPersonalInfoValid = (): boolean => {
    // Check all validations without setting error states
    const hasValidName = formData.name.trim().length >= 2 && formData.name.length <= 50;
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    const hasValidUsername = formData.username.length >= 3 && 
                           formData.username.length <= 20 && 
                           /^[a-zA-Z0-9_]+$/.test(formData.username);
    const hasValidPhone = !formData.phone || /^\+63 9\d{2} \d{3} \d{4}$/.test(formData.phone);
    const hasValidDate = !!formData.dateOfBirth;

    return hasValidName && hasValidEmail && hasValidUsername && hasValidPhone && hasValidDate;
  };

  const handleArchiveAccount = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to archive your account?\n\n" +
      "Your account will be deactivated and you won't be able to access it.\n" +
      "To reactivate your account in the future, please contact the administrator.\n\n" +
      "Do you wish to proceed?"
    );

    if (isConfirmed) {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('token');

        await axios.put(
          'http://localhost:5175/api/user/archive',
          { userId: user.id },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        // Clear local storage and redirect to login
        localStorage.clear();
        window.location.href = '/login';
      } catch (error) {
        console.error('Error archiving account:', error);
        alert('Failed to archive account. Please try again.');
      }
    }
  };

  return (
    <div className="account-settings">
      <h2>Account Settings</h2>
      <form className="personal-information">
        <h3>Personal Information</h3>
        <label>
          Name
          <input 
            type="text" 
            name="name"
            placeholder="Name" 
            value={formData.name}
            onChange={handleInputChange}
            className={errors.name ? 'error-input' : ''}
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </label>
        <label>
          Email
          <input 
            type="email" 
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleInputChange}
            className={errors.email ? 'error-input' : ''}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </label>
        <label>
          Username
          <input 
            type="text" 
            name="username"
            placeholder="@Username"
            value={formData.username}
            onChange={handleInputChange}
            className={errors.username ? 'error-input' : ''}
          />
          {errors.username && <span className="error-text">{errors.username}</span>}
        </label>
        <label>
          Phone Number
          <div className="phone-input">
          <img src={phFlag} alt="PH" className="country-flag" />
            <input 
              type="text" 
              name="phone"
              placeholder="+63 912 3247 182" 
              value={formData.phone}
              onChange={handleInputChange}
              className={errors.phone ? 'error-input' : ''}
            />
          </div>
          {errors.phone && <span className="error-text">{errors.phone}</span>}
        </label>
        <label>
          Date of Birth
          <input 
            type="date" 
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            className={errors.dateOfBirth ? 'error-input' : ''}
          />
          {errors.dateOfBirth && <span className="error-text">{errors.dateOfBirth}</span>}
        </label>
        <button 
          type="button" 
          className={`save-changes ${isFormChanged() && isPersonalInfoValid() ? 'validated' : ''}`}
          onClick={handleSaveChanges}
          disabled={!isFormChanged() || !isPersonalInfoValid()}
        >
          Save changes
        </button>
      </form>

      <form className="change-password">
        <h3>Change Password</h3>
        <label>
          Current password
          <input
            type="password"
            name="oldPassword"
            placeholder="Old password"
            value={passwordForm.oldPassword}
            onChange={handlePasswordChange}
            className={errors.oldPassword ? 'error-input' : ''}
          />
          {errors.oldPassword && <span className="error-text">{errors.oldPassword}</span>}
        </label>
        <label>
          New password
          <input
            type="password"
            name="newPassword"
            placeholder="New password"
            value={passwordForm.newPassword}
            onChange={handlePasswordChange}
            className={errors.newPassword ? 'error-input' : ''}
          />
          {errors.newPassword && <span className="error-text">{errors.newPassword}</span>}
        </label>
        <label>
          Confirm password
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm new password"
            value={passwordForm.confirmPassword}
            onChange={handlePasswordChange}
            className={errors.confirmPassword ? 'error-input' : ''}
          />
          {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
        </label>
        <div className="buttons">
          <button 
            type="button" 
            className={`save-changes ${isPasswordFormValid() ? 'validated' : ''}`}
            onClick={handlePasswordSubmit}
          >
            Change Password
          </button>
        </div>
      </form>

      <div className="notification-settings">
        <h3>Notification Settings</h3>
        <label>
          <input type="checkbox" />
          Email notifications for incoming messages
        </label>
        <button type="button" className="save-changes">Save changes</button>
      </div>
      <button type="button" className="setup-facial-id">Setup Facial ID</button>
      <button 
        type="button" 
        className="delete-account" 
        onClick={handleArchiveAccount}
      >
        Archive account
      </button>
    </div>
  );
};

export default VolunteerSettings;