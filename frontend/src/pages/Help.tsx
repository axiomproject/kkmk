import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import "../styles/Layout.css";
import bannerImage from "../img/coverphoto.png"
import donatepicture from "../img/donatepicture.png"
import volunteerpicture from "../img/volunteer.svg"
import partnerwithus from '../img/partnerwithus.svg';
import Ellipse from '../img/Ellipse.png';
import KMKK from '../img/KKMK.svg';
import KMKK2 from '../img/KKMK2.svg';
import api from '../config/axios'; // Replace axios import
import { useAuth } from "../contexts/AuthContext"; // Add this import

interface CartItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  category: string;
  type: 'regular' | 'in-kind';
  frequency?: 'monthly' | 'quarterly' | 'annually';
  expirationDate?: string;
}

interface DonorInfo {
  fullName: string;
  email: string;
  contactNumber: string;
}

interface CountryCode {
  country: string;
  code: string;
  format: string;
  regex: string;
  placeholder: string;
}

const QUANTITY_UNITS = [
  { value: 'Piece', label: 'Piece(s)' },
  { value: 'Pack', label: 'Pack(s)' },
  { value: 'Box', label: 'Box(es)' },
  { value: 'Kilogram', label: 'Kilogram(s)' },
  { value: 'Liter', label: 'Liter(s)' },
  { value: 'Dozen', label: 'Dozen(s)' },
  { value: 'Set', label: 'Set(s)' }
] as const;

type QuantityUnit = typeof QUANTITY_UNITS[number]['value'];

const CATEGORIES_WITH_EXPIRATION = [
  'Food & Nutrition',
  'Medical Supplies & Medicines'
];

const COUNTRY_CODES: CountryCode[] = [
  {
    country: 'Philippines',
    code: '+63',
    format: '+63 XXX XXX XXXX',
    regex: '^(\\+?63|0)[0-9]{10}$',
    placeholder: '9XX XXX XXXX'
  },
  {
    country: 'United States',
    code: '+1',
    format: '+1 (XXX) XXX-XXXX',
    regex: '^\\+?1\\s?\\(?\\d{3}\\)?[-\\s]?\\d{3}[-\\s]?\\d{4}$',
    placeholder: '(XXX) XXX-XXXX'
  },
  {
    country: 'United Kingdom',
    code: '+44',
    format: '+44 XXXX XXXXXX',
    regex: '^\\+?44[0-9]{10}$',
    placeholder: 'XXXX XXXXXX'
  },
  {
    country: 'Australia',
    code: '+61',
    format: '+61 XXX XXX XXX',
    regex: '^\\+?61[0-9]{9}$',
    placeholder: 'XXX XXX XXX'
  },
  {
    country: 'Singapore',
    code: '+65',
    format: '+65 XXXX XXXX',
    regex: '^\\+?65[0-9]{8}$',
    placeholder: 'XXXX XXXX'
  }
];

const Help: React.FC = () => {
  const { user } = useAuth(); // Get the logged-in user from auth context
  const [SearchParams, setSearchParams] = useSearchParams();
  const initialTab = SearchParams.get("tab") || "partner";
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [animationClass, setAnimationClass] = useState<string>("fade-in");
  const [donationType, setDonationType] = useState<string>("one-time"); // Set default value
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>("gcash"); // Add payment method state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<QuantityUnit>('Piece');
  const [donorInfo, setDonorInfo] = useState<DonorInfo | null>(null);
  interface FormDataInterface {
    category?: string;
    fullName?: string;
    email?: string;
    contactNumber?: string;
    item?: string;
    amount?: number;
    quantity?: number;
    frequency?: string;
    expirationDate?: string;
    message?: string;
    proofOfPayment?: File;
    selectedCountry: string;
  }
  
  const [formData, setFormData] = useState<FormDataInterface>({
    fullName: '',
    email: '',
    contactNumber: '',
    item: '',
    amount: 0,
    quantity: 0,
    category: '',
    frequency: 'monthly',
    expirationDate: '',
    message: '',
    selectedCountry: 'Philippines'
  });

  useEffect(() => {
      setActiveTab(initialTab);
  }, [initialTab]);

  // Add new effect to populate form data when user is logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.name || '',
        email: user.email || '',
        contactNumber: user.phone || '',
        selectedCountry: 'Philippines' // Default country
      }));
    }
  }, [user]);

  const handleTabChange = (tab: string) => {
    if (tab !== activeTab) {
      setAnimationClass("fade-out");
      setTimeout(() => {
        setActiveTab(tab);
        setAnimationClass("fade-in");
        setSearchParams({ tab });
      }, 300); 
    }
  };

  const validateDonorInfo = (): string | null => {
    // Email validation - updated to match standard email format
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!formData.email) {
      return 'Email is required';
    }
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address (e.g., example@domain.com)';
    }

    // Get selected country format
    const selectedCountryFormat = COUNTRY_CODES.find(c => c.country === formData.selectedCountry);
    if (!selectedCountryFormat) {
      return 'Invalid country selection';
    }

    const phoneRegex = new RegExp(selectedCountryFormat.regex);
    if (!formData.contactNumber) {
      return 'Contact number is required';
    }

    // Clean the phone number (remove spaces and dashes)
    const cleanPhone = formData.contactNumber.replace(/[\s-]/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      return `Please enter a valid ${formData.selectedCountry} phone number format: ${selectedCountryFormat.format}`;
    }

    // Name validation
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      return 'Full name is required and must be at least 2 characters';
    }

    return null;
  };

  const validateDonationItem = (): string | null => {
    if (donationType === 'regular' || donationType === 'in-kind') {
      // Item name validation
      if (!formData.item || formData.item.trim().length < 2) {
        return 'Item name is required and must be at least 2 characters';
      }

      // Category validation
      if (!formData.category) {
        return 'Please select a category';
      }

      // Quantity validation
      const quantity = parseInt(formData.quantity?.toString() || '0');
      if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
        return 'Quantity must be a positive integer';
      }

      // Validate expiration date for food and medical items
      if (CATEGORIES_WITH_EXPIRATION.includes(formData.category || '')) {
        if (!formData.expirationDate) {
          return 'Expiration date is required for food and medical items';
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        const expDate = new Date(formData.expirationDate);
        if (expDate <= today) {
          return 'Expiration date must be in the future';
        }
      }
    }

    return null;
  };

  const handleAddToCart = () => {
    const donorValidationError = validateDonorInfo();
    if (donorValidationError) {
      alert(donorValidationError);
      return;
    }

    const itemValidationError = validateDonationItem();
    if (itemValidationError) {
      alert(itemValidationError);
      return;
    }

    // Store donor info if not already stored
    if (!donorInfo) {
      setDonorInfo({
        fullName: formData.fullName || '',
        email: formData.email || '',
        contactNumber: formData.contactNumber || ''
      });
    }

    const newItem: CartItem = {
      id: Date.now().toString(),
      itemName: formData.item || '',
      quantity: parseInt(formData.quantity?.toString() || '0'),
      unit: selectedUnit,
      category: formData.category || '',
      type: donationType as 'regular' | 'in-kind',
      ...(donationType === 'regular' && { frequency: formData.frequency as 'monthly' | 'quarterly' | 'annually' }),
      ...(formData.expirationDate && { expirationDate: formData.expirationDate })
    };

    setCartItems(prev => [...prev, newItem]);
    
    // Reset item-related fields but keep donor info
    setFormData(prev => ({
      ...prev,
      fullName: prev.fullName,
      email: prev.email,
      contactNumber: prev.contactNumber,
      item: '',
      amount: 0,
      quantity: 0,
      category: '',
      frequency: 'monthly',
      expirationDate: '',
      message: '',
      selectedCountry: prev.selectedCountry
    }));
    setSelectedUnit('Piece');
    
    alert('Item added to cart!');
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const donorValidationError = validateDonorInfo();
    if (donorValidationError) {
      alert(donorValidationError);
      return;
    }

    try {
      if (donationType === 'one-time') {
        // Handle one-time donation
        if (!formData.amount || formData.amount <= 0) {
          alert('Please enter a valid donation amount');
          return;
        }

        // Create form data for file upload
        const formDataToSend = new FormData();
        formDataToSend.append('fullName', formData.fullName || '');
        formDataToSend.append('email', formData.email || '');
        formDataToSend.append('contactNumber', formData.contactNumber || '');
        formDataToSend.append('amount', formData.amount.toString());
        formDataToSend.append('message', formData.message || '');
        formDataToSend.append('paymentMethod', paymentMethod);

        // If there's a proof of payment file, append it
        if (formData.proofOfPayment) {
          formDataToSend.append('proofOfPayment', formData.proofOfPayment);
        }

        // Submit one-time donation
        await api.post('/donations/monetary', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        alert('One-time donation submitted successfully!');
        
        // Reset form
        setFormData({
          fullName: '',
          email: '',
          contactNumber: '',
          item: '',
          amount: 0,
          quantity: 0,
          category: '',
          frequency: 'monthly',
          expirationDate: '',
          message: '',
          selectedCountry: 'Philippines'
        });
        setPaymentMethod('gcash');
        setSelectedFileName('');
        
      } else if (donationType === 'regular' || donationType === 'in-kind') {
        if (cartItems.length === 0) {
          alert('Please add at least one item to cart before submitting');
          return;
        }

        // Submit all cart items
        const donorData = {
          donatorName: formData.fullName,
          email: formData.email,
          contactNumber: formData.contactNumber || ''
        };

        for (const item of cartItems) {
          const donation = {
            ...donorData,
            item: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            ...(item.frequency && { frequency: item.frequency }),
            ...(item.expirationDate && { expirationDate: item.expirationDate })
          };

          const endpoint = item.type === 'regular' ? '/inventory/regular' : '/inventory/inkind';
          await api.post(endpoint, donation);
        }

        alert('All donations submitted successfully!');
        
        // Reset form and cart
        setFormData({
          fullName: '',
          email: '',
          contactNumber: '',
          item: '',
          amount: 0,
          quantity: 0,
          category: '',
          frequency: 'monthly',
          expirationDate: '',
          message: '',
          selectedCountry: 'Philippines'
        });
        setCartItems([]);
        setDonorInfo(null);
        setSelectedUnit('Piece');
        setDonationType('one-time');
      }
    } catch (error) {
      console.error('Error submitting donation:', error);
      alert('Error submitting donation. Please try again.');
    }
  };

  // Add onChange handler for amount input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || Number(value) >= 0) {
      setFormData(prev => ({
        ...prev,
        amount: value === '' ? undefined : Number(value)
      }));
    }
  };

  const renderDonationForm = () => (
    <form className="donation-form" onSubmit={handleDonationSubmit}>
      <div className="form-main-fields">
        <div className="form-groupss">
          <label>Full Name:</label>
          <input 
            name="fullName" 
            type="text" 
            required 
            placeholder="Enter your full name"
            onChange={(e) => setFormData(prev => ({...prev, fullName: e.target.value}))}
            value={formData.fullName || ''}
          />
        </div>
        <div className="form-groupss">
          <label>Email:</label>
          <input 
            name="email" 
            type="email" 
            required 
            placeholder="Enter your email"
            onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
            value={formData.email || ''}
          />
          <small className="email-caution">
            Use a valid email address to receive feedback about your donation
          </small>
        </div>
        
        <div className="form-groupss contact-number-group">
          <label>Contact Number:</label>
          <div className="contact-number-input">
            <select
              value={formData.selectedCountry}
              onChange={(e) => setFormData(prev => ({...prev, selectedCountry: e.target.value, contactNumber: ''}))}
              className="country-select"
            >
              {COUNTRY_CODES.map(country => (
                <option key={country.code} value={country.country}>
                  {country.country} ({country.code})
                </option>
              ))}
            </select>
            <input 
              name="contactNumber" 
              type="tel" 
              required 
              placeholder={COUNTRY_CODES.find(c => c.country === formData.selectedCountry)?.placeholder}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                const countryFormat = COUNTRY_CODES.find(c => c.country === formData.selectedCountry);
                if (countryFormat) {
                  // Format phone number based on country
                  switch (formData.selectedCountry) {
                    case 'Philippines':
                      if (value.startsWith('0')) value = value.substring(1);
                      if (!value.startsWith('63')) value = '63' + value;
                      if (value.length > 12) value = value.slice(0, 12);
                      break;
                    case 'United States':
                      if (value.length > 10) value = value.slice(0, 10);
                      if (value.length >= 6) {
                        value = `(${value.slice(0,3)}) ${value.slice(3,6)}-${value.slice(6)}`;
                      }
                      break;
                    // Add other country-specific formatting as needed
                  }
                }
                setFormData(prev => ({...prev, contactNumber: value}));
              }}
              value={formData.contactNumber || ''}
              className="phone-input"
            />
          </div>
          <small className="format-hint">
            <i className="fas fa-info-circle"></i>
            Format: {COUNTRY_CODES.find(c => c.country === formData.selectedCountry)?.format}
          </small>
        </div>

        {/* Make Donation Type span full width */}
        <div className="form-groupss" style={{ gridColumn: '1 / -1' }}>
          <label>Donation Type:</label>
          <select 
            required 
            value={donationType}
            onChange={(e) => {
              const newType = e.target.value;
              setDonationType(newType);
              
              // Clear cart items when switching to one-time donation
              if (newType === 'one-time' && cartItems.length > 0) {
                setCartItems([]);
              }
            }}
          >
            <option value="one-time">One-time Donation</option>
            <option value="regular">Regular Donation</option>
            <option value="in-kind">In-kind Donation</option>
          </select>
        </div>

        {/* Add amount field for one-time donations */}
        {donationType === 'one-time' && (
          <div className="form-groupss">
            <label>Donation Amount:</label>
            <div className="form-row">
              <div className="half-width">
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  placeholder="Enter donation amount"
                  onChange={handleAmountChange}
                  value={formData.amount || ''}
                />
                <small>Enter amount in PHP</small>
              </div>
            </div>
          </div>
        )}

        {/* Item name and category fields only for in-kind and regular donations */}
        {(donationType === 'in-kind' || donationType === 'regular') && (
          <>
            <div className="form-groupss">
              <label>Item Name:</label>
              <input 
                name="item" 
                type="text" 
                required 
                placeholder="Enter item name"
                onChange={(e) => setFormData(prev => ({...prev, item: e.target.value}))}
                value={formData.item || ''}
              />
            </div>

            <div className="form-groupss">
              <label>Category:</label>
              <select 
                name="category" 
                required 
                value={formData.category || ''}
                onChange={(e) => setFormData(prev => ({...prev, category: e.target.value}))}
              >
                <option value="">Select a category</option>
                <option value="Food & Nutrition">Food & Nutrition</option>
                <option value="Clothing & Footwear">Clothing & Footwear</option>
                <option value="Medical Supplies & Medicines">Medical Supplies & Medicines</option>
                <option value="School Supplies & Educational Materials">School Supplies & Educational Materials</option>
                <option value="Disaster Relief Essentials">Disaster Relief Essentials</option>
                <option value="Household & Hygiene Products">Household & Hygiene Products</option>
                <option value="Technology & Learning Tools">Technology & Learning Tools</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </>
        )}

        {/* Add this new expiration date field */}
        {(donationType === 'regular' || donationType === 'in-kind') && 
         formData.category && CATEGORIES_WITH_EXPIRATION.includes(formData.category) && (
          <div className="form-groupss">
            <label>Expiration Date:</label>
            <input
              type="date"
              name="expirationDate"
              required
              min={new Date().toISOString().split('T')[0]} // Set minimum date to today
              value={formData.expirationDate || ''}
              onChange={(e) => setFormData(prev => ({...prev, expirationDate: e.target.value}))}
              className="form-control"
            />
            <small>Required for food and medical items</small>
          </div>
        )}

        {/* Modified Amount/Quantity fields */}
        {(donationType === 'in-kind' || donationType === 'regular') && (
          <div className="form-groupss quantity-unit-container">
            <label>{donationType === "in-kind" ? "Quantity:" : "Quantity:"}</label>
            <div className="quantity-input-group">
              <input 
                type="number"
                required 
                min="1"
                placeholder="Enter quantity"
                className="quantity-input"
                name="itemQuantity" // Added name attribute
                onChange={(e) => setFormData(prev => ({...prev, quantity: Number(e.target.value)}))}
                value={formData.quantity || ''}
              />
              <select 
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value as QuantityUnit)}
                className="unit-select"
              >
                {QUANTITY_UNITS.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
              {donationType === 'regular' && (
                <select 
                  name="frequency" 
                  required
                  className="frequency-select"
                  value={formData.frequency || 'monthly'}
                  onChange={(e) => setFormData(prev => ({...prev, frequency: e.target.value}))}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              )}
            </div>
            <button 
              type="button" 
              onClick={handleAddToCart}
              className="add-to-cart-btn"
            >
              Add to Cart
            </button>
          </div>
        )}

        {/* Cart display */}
        {cartItems.length > 0 && (
          <div className="cart-summary">
            <h3>Donation Cart</h3>
            {cartItems.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-details">
                  <span className="item-name">{item.itemName}</span>
                  <span className="item-quantity">
                    {item.quantity} {item.unit}(s)
                  </span>
                  {item.frequency && (
                    <span className="item-frequency">
                      Frequency: {item.frequency}
                    </span>
                  )}
                  <span className="item-category">{item.category}</span>
                </div>
                <button 
                  type="button"  // Added type="button" to prevent form submission
                  onClick={() => setCartItems(prev => prev.filter(i => i.id !== item.id))}
                  className="remove-item-btn"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="cart-actions">
              {donationType === 'regular' && (
                <button 
                  type="button"
                  className="add-donation-btn"
                  onClick={() => {
                    const form = document.querySelector('.donation-form') as HTMLFormElement;
                    const formEvent = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(formEvent);
                  }}
                >
                  Submit Donation
                </button>
              )}
              {donationType === 'in-kind' && (
                <button 
                  type="button"
                  className="add-donation-btn"
                  onClick={() => {
                    const form = document.querySelector('.donation-form') as HTMLFormElement;
                    const formEvent = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(formEvent);
                  }}
                >
                  Submit Donation
                </button>
              )}
            </div>
          </div>
        )}

      
        {/* Payment method selector for one-time donations */}
        {donationType === 'one-time' && (
          <div className="form-groupss">
            <label>Payment Method:</label>
            <div className="payment-method-tabs">
              <div 
                className={`payment-tab payment-tab-gcash ${paymentMethod === 'gcash' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentMethod('gcash');
                  setSelectedFileName('');
                  setFormData(prev => ({ ...prev, proofOfPayment: undefined }));
                }}
              >
                GCash
              </div>
              <div 
                className={`payment-tab payment-tab-bank ${paymentMethod === 'bank' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentMethod('bank');
                  setSelectedFileName('');
                  setFormData(prev => ({ ...prev, proofOfPayment: undefined }));
                }}
              >
                Bank Transfer
              </div>
            </div>
            
            <div className="payment-detailss">
              {paymentMethod === 'gcash' && (
                <div className="gcash-details">
                  <h4>GCash Information</h4>
                  <p><strong>Account Name:</strong> KM Foundation</p>
                  <p><strong>GCash Number:</strong> +63-939-3031-767</p>
                  <p>Please send your donation to the GCash account above and upload your screenshot as proof of payment.</p>
                </div>
              )}
              
              {paymentMethod === 'bank' && (
                <div className="bank-details">
                  <h4>Bank Information</h4>
                  <p><strong>Bank Name:</strong> BDO</p>
                  <p><strong>Account Name:</strong> KM Foundation</p>
                  <p><strong>Account Number:</strong> 5125-7178-1234-5678</p>
                  <p><strong>Branch:</strong> Main Branch</p>
                  <p>Please transfer your donation to the bank account above and upload your receipt as proof of payment.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File upload for one-time donations */}
        {donationType === 'one-time' && (
          <>
<div className="form-groupss" style={{ gridColumn: '1 / -1' }}>
              <label>Proof of Donation (Optional):</label>
              <div className={`file-input-container ${selectedFileName ? 'has-file' : ''}`}
                   data-file-name={selectedFileName || 'Choose File'}>
                <input 
                  type="file" 
                  name="proofOfDonation"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert('File size should be less than 5MB');
                        e.target.value = '';
                        setSelectedFileName('');
                        setFormData(prev => ({ ...prev, proofOfPayment: undefined }));
                      } else {
                        setSelectedFileName(file.name);
                        setFormData(prev => ({ ...prev, proofOfPayment: file }));
                      }
                    } else {
                      setSelectedFileName('');
                      setFormData(prev => ({ ...prev, proofOfPayment: undefined }));
                    }
                  }}
                />
              </div>
              <small>Supported formats: JPG, PNG. Max size: 5MB</small>
            </div>

            <div className="form-groupss">
              <label>Message (Optional):</label>
              <textarea 
                name="message"
                placeholder="Enter your message or special instructions"
                rows={4}
                onChange={(e) => setFormData(prev => ({...prev, message: e.target.value}))}
                value={formData.message || ''}
              />
            </div>
          </>
        )}
      </div>

      {/* Only show submit button for one-time donations or when cart is empty */}
      {(donationType === 'one-time' || cartItems.length === 0) && (
        <button type="submit" className="submit-button">Submit Donation Form</button>
      )}
    </form>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "partner":
        return (
          <div className={`tab-content ${animationClass}`}>
            <div className="partner-section">
              <div className="partner-content">
                <h1>Partner with Us</h1>
                <p>
                  We welcome collaborations with organizations, corporations, and individuals who share our vision of
                  empowering underprivileged communities through education and support.
                </p>
                <p>
                  We offer flexible partnership options tailored to suit your specific goals and preferences. Whether
                  you’re looking to sponsor a student, organize a fundraising event, or initiate a corporate giving
                  program, we’re here to work with you every step of the way.
                </p>
                <p>
                  Together, we can create positive change and build a brighter future for those in need. Partner with us
                  today and be a part of something truly impactful.
                </p>
              </div>
              <img src={partnerwithus} alt="Partner with Us" className="partner-icon" />
            </div>
          </div>
        );
        case "sponsor":
          return (
            <div className={`tab-content ${animationClass}`}>
              <div className="page-container">
               <div className="sponsor-container">
    <div className="sponsor-text">
<h1>Sponsor a Student</h1>
<p>By sponsoring one of the following students, you will give them the opportunity to get an education so they can escape the cycle of poverty. Your contribution pays for their transportation to school, uniforms, books, tuition, and other school-related expenses.</p>
<p>Once you’ve chosen the student you would like to sponsor, we will send you a more detailed student profile. At that point, we will start your student sponsorship based on a donation of:</p>
</div>
 </div>
              <div className="shape-container">
                
              <div className="shape">
              <h1>PHP 12,000 /
                School year
              </h1>
              <h1>for k - Grade 6
                Students
              </h1>
              </div>
              <div className="shape">
              <h1>PHP 12,000 /
                School year
              </h1>
              <h1>for k - Grade 6
                Students
              </h1>
              </div>
              <div className="shape">
              <h1>PHP 12,000 /
                School year
              </h1>
              <h1>for k - Grade 6
                Students
              </h1>
              </div>
              <div className="shape">
              <h1>PHP 12,000 /
                School year
              </h1>
              <h1>for k - Grade 6
                Students
              </h1>
              </div>
              </div>

              <div className="sponsorp-text">
              <p>You may either set up a recurring monthly donation, or you may make a one-time payment for an annual sponsorship. If you choose an annual sponsorship, we will send you a renewal request when it’s about to expire. 
                Our hope is that, like almost all of our sponsors, you will opt to continue helping your student. Your commitment means the world to these children and, in turn, they will strive to honor your participation in their education.</p>
                </div>
              
              </div>
             
           </div>
          );
      case "donate":
        return (
          <div className={`tab-content ${animationClass}`}>
            <div className="donate-container">
              <div className="donate-text">
                <h1 className="donate-text">Donate</h1>
                <p>
                  By making a donation to KM Foundation, you can support our various programs and initiatives aimed at
                  uplifting underprivileged communities. Whether you choose to make a one-time donation, a regular
                  contribution, or an in-kind donation, your generosity will make a meaningful difference in the lives of
                  those in need.
                </p>
                <ul>
                  <li>
                    <b>One-time Donation:</b>
                    <ul>
                      <li>Housing Assistance/Repair</li>
                      <li>Recreational Activities of Children (Educational Tour)</li>
                      <li>General/Administrative Fund of the Foundation</li>
                    </ul>
                  </li>
                  <li>
                    <b>Regular Donation:</b>
                    <ul>
                      <li>Feeding Programs</li>
                    </ul>
                  </li>
                  <li>
                    <b>In-kind Donation:</b>
                    <ul>
                      <li>
                        Contribute by donating essential items such as food, clothing, medicines, and more. Your
                        thoughtful donations can make a meaningful impact on the lives of those in need.
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
              <div className="donate-picture">
                <img src={donatepicture} alt="Donate" />
              </div>
            </div>
            
            {/* Add donation form */}
            <div className="donation-form-container">
              <h2>Donation Form</h2>
              {renderDonationForm()}
              <div className="donation-note">
                <p><strong>Note:</strong> After submitting this form, our team will contact you with further instructions for completing your donation.</p>
              </div>
            </div>
          </div>
        );
        case "volunteer":
          return (
            <div className={`tab-content ${animationClass}`}>
              <div className="volunteer-container">
                <div className="volunteer-text">
                  <h1 className="volunteer-text">Become a Volunteer</h1>
                  <p>
                    Volunteering is a rewarding opportunity to make a positive impact in the lives of others while contributing to meaningful projects and initiatives. Whether you're passionate about education, the arts, digital media, or community engagement, there are various ways you can get involved and lend your skills and expertise to support our mission. 
                  </p>
                  <p>
                    These volunteer activities are just a few examples of how you can get involved and contribute your time and talents to support our organization's mission. We welcome individuals with diverse skills, backgrounds, and interests to join us in creating positive change and empowering communities in need. If you're interested in volunteering with us or learning more about our volunteer opportunities, please contact us for further information.
                  </p>
                </div>
                <div className="volunteer-picture">
                  <img src={volunteerpicture} alt="Volunteer" />
                </div>
              </div>
            </div>
          );
          case "faq":
            return (
              <div className={`tab-content ${animationClass}`}>
                <div className="faq-container">
    <div className="faq-item1">
      <div>
        <a href="your-link-1">
          <img src={KMKK} alt="FAQ" />
        </a>
      </div>
      <div className="faq-text">
        <a href="your-link-1">
          <h1>Best Practice for Donating Safely Online with Kmkk</h1>
        </a><br />
        <p>Answers to “How can I donate safely online?”</p>
        <div className="kmkk-team">
          <img src={Ellipse} alt="FAQ" />
          <p>by Kmkk Team</p>
        </div>
      </div>
    </div>

    <div className="faq-item2">
      <div>
        <a href="your-link-2">
          <img src={KMKK2} alt="FAQ" />
        </a>
      </div>
      <div className="faq-text">
        <a href="your-link-2">
          <h1>Are There More Ways I Can Help Beyond Donating?</h1>
        </a><br />
        <p>You can help further the causes you care about with these ideas.</p>
        <div className="kmkk-team">
          <img src={Ellipse} alt="FAQ" />
          <p>by Kmkk Team</p>
        </div>
      </div>
    </div>
  </div>
              </div>
            );
      default:
        return null;
    }
  }



  return (
    <div className="home-container">
      <img src={bannerImage} className="banner-image"></img>
    <div className="page-container">
   <div className="help-tabs">
      <div className="tabs-header">
        <button
          className={`tab-button ${activeTab === "partner" ? "active" : ""}`}
          onClick={() => handleTabChange("partner")}
        >
          PARTNER WITH US
        </button>
        <button
          className={`tab-button ${activeTab === "sponsor" ? "active" : ""}`}
          onClick={() => handleTabChange("sponsor")}
        >
          SPONSOR A STUDENT
        </button>
        <button
          className={`tab-button ${activeTab === "donate" ? "active" : ""}`}
          onClick={() => handleTabChange("donate")}
        >
          DONATE
        </button>
        <button
          className={`tab-button ${activeTab === "volunteer" ? "active" : ""}`}
          onClick={() => handleTabChange("volunteer")}
        >
          VOLUNTEER
        </button>
        <button
          className={`tab-button ${activeTab === "faq" ? "active" : ""}`}
          onClick={() => handleTabChange("faq")}
        >
          FAQ
        </button>
      </div>
      <div className="tabs-content">{renderContent()}</div>
    </div>
  </div>
  </div>
);
};


export default Help;