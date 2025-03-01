import { useEffect, useState } from 'react';
import '../../styles/Layout.css';
import { User, UserDetailsUpdateResponse } from '../../types/auth';
import api from '../../config/axios'; // Replace axios import
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
  const [userRole, setUserRole] = useState<string>('');

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
      
      // Format the phone number consistently
      const formattedPhone = user.phone ? formatPhoneNumber(user.phone) : '';
      
      const formattedInitialData = {
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        phone: formattedPhone,
        dateOfBirth: formattedDate
      };
      
      setInitialFormData(formattedInitialData);
      setFormData(formattedInitialData);
      setUserRole(user.role || '');
    }
  }, []);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format the phone number to always start with +639
    let formatted = cleaned;

    // If the number starts with 0, replace it with +639
    if (cleaned.startsWith('0')) {
      formatted = `639${cleaned.substring(1)}`;
    } 
    // If the number starts with 9 directly, add +63 prefix
    else if (cleaned.startsWith('9')) {
      formatted = `639${cleaned}`;
    } 
    // If the number starts with 63, normalize it
    else if (cleaned.startsWith('63')) {
      formatted = cleaned;
    } 
    // For any other format, try to extract and normalize to +639 format
    else {
      // Remove any leading digits that might not be part of the phone number
      // and ensure it starts with 639
      const match = cleaned.match(/9\d+$/);
      if (match) {
        formatted = `639${match[0]}`;
      } else {
        formatted = cleaned;
      }
    }

    // Ensure it starts with + for display
    if (!formatted.startsWith('+')) {
      formatted = `+${formatted}`;
    }

    // Format for better readability: +63 9XX XXX XXXX
    if (formatted.length >= 12) {
      // Extract the parts
      const countryCode = formatted.slice(0, 3); // +63
      const prefix = formatted.slice(3, 4);      // 9
      const firstPart = formatted.slice(4, 7);   // XXX
      const secondPart = formatted.slice(7, 10); // XXX
      const lastPart = formatted.slice(10, 14);  // XXXX
      
      return `${countryCode} ${prefix}${firstPart} ${secondPart} ${lastPart}`;
    }
    
    return formatted;
  };

  // Update handleInputChange to log changes for debugging
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      const formattedValue = formatPhoneNumber(value);
      console.log('Phone change:', { 
        raw: value, 
        formatted: formattedValue, 
        initial: initialFormData.phone 
      });
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
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

    // Email validation - only if not a scholar
    if (userRole !== 'scholar') {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3 || formData.username.length > 20) {
      newErrors.username = 'Username must be between 3 and 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Philippine phone number validation - more flexible pattern
    if (formData.phone) {
      // Remove all spaces and special characters for validation
      const cleanedPhone = formData.phone.replace(/\s+/g, '');
      
      // Check if it starts with +63 followed by a 9 and 9 more digits (total 13 chars including +)
      if (!/^\+639\d{9}$/.test(cleanedPhone)) {
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

      // Normalize phone format for database
      const normalizedPhone = formData.phone.replace(/\s+/g, '');

      console.log('Sending date to backend:', dateToSend);

      const { data } = await api.put('/user/details', {
        userId: user.id,
        name: formData.name,
        email: userRole === 'scholar' ? '' : formData.email, // Don't send email for scholars
        username: formData.username,
        dateOfBirth: dateToSend,
        phone: normalizedPhone,
        intro: user.intro,
        knownAs: user.knownAs
      });

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
        
        // Format phone for display and update initial data
        const formattedPhone = updatedUser.phone ? formatPhoneNumber(updatedUser.phone) : '';
        
        // Update the initial form data
        setInitialFormData({
          name: updatedUser.name || '',
          email: updatedUser.email || '',
          username: updatedUser.username || '',
          phone: formattedPhone,
          dateOfBirth: updatedUser.dateOfBirth || ''
        });
        
        // Also update current form data to match the formatted data
        setFormData(prev => ({
          ...prev,
          phone: formattedPhone
        }));
        
        // Dispatch custom event to notify Header component of user info change
        const userInfoUpdateEvent = new CustomEvent('userInfoUpdated', { 
          detail: { 
            name: formData.name,
            email: formData.email
          }
        });
        window.dispatchEvent(userInfoUpdateEvent);
        
        alert('Changes saved successfully!');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handlePasswordSubmit = async () => {
    if (!validatePasswordForm()) return;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      await api.put('/user/password', {
        userId: user.id,
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });

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
    // Normalize phone formats for comparison by removing ALL non-digit characters
    const normalizePhone = (phone: string) => {
      return phone ? phone.replace(/\D/g, '') : '';
    };
    
    const phoneChanged = normalizePhone(formData.phone) !== normalizePhone(initialFormData.phone);
    
    // Debug what's happening with phone comparison
    console.log('Form change check:', {
      currentPhone: formData.phone,
      initialPhone: initialFormData.phone,
      normalizedCurrent: normalizePhone(formData.phone),
      normalizedInitial: normalizePhone(initialFormData.phone),
      phoneChanged: phoneChanged
    });
    
    return (
      formData.name !== initialFormData.name ||
      formData.email !== initialFormData.email ||
      formData.username !== initialFormData.username ||
      phoneChanged ||
      formData.dateOfBirth !== initialFormData.dateOfBirth
    );
  };

  const isPersonalInfoValid = (): boolean => {
    // Check all validations without setting error states
    const hasValidName = formData.name.trim().length >= 2 && formData.name.length <= 50;
    
    // Email validation only applies to non-scholar users
    const hasValidEmail = userRole === 'scholar' ? true : 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    
    const hasValidUsername = formData.username.length >= 3 && 
                           formData.username.length <= 20 && 
                           /^[a-zA-Z0-9_]+$/.test(formData.username);
    
    // More flexible phone validation - as long as it's +63 9 followed by 9 digits
    const phoneValue = formData.phone.trim();
    const cleanedPhone = phoneValue.replace(/\s+/g, '');
    const hasValidPhone = !phoneValue || /^\+639\d{9}$/.test(cleanedPhone);
    
    const hasValidDate = !!formData.dateOfBirth;

    const isValid = hasValidName && hasValidEmail && hasValidUsername && hasValidPhone && hasValidDate;
    
    // Debug validation results
    console.log('Form validation:', {
      name: hasValidName,
      email: hasValidEmail,
      username: hasValidUsername,
      phone: {
        value: phoneValue,
        cleaned: cleanedPhone,
        valid: hasValidPhone
      },
      date: hasValidDate,
      overall: isValid
    });

    return isValid;
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
        await api.put('/user/archive', { userId: user.id });

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
        
        {/* Only show email field for non-scholar users */}
        {userRole !== 'scholar' && (
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
        )}
        
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
          data-changed={isFormChanged()}
          data-valid={isPersonalInfoValid()}
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