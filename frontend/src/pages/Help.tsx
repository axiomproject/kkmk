import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion"; // Import framer-motion
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
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { AnimatePresence } from "framer-motion"; // Import AnimatePresence

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

// Animation variants - optimized timings
const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

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
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
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

  const [isLoading, setIsLoading] = useState(true);

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
      setActiveTab(tab);
      setSearchParams({ tab });
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

  const handleFileUpload = async (file: File): Promise<string> => {
    try {
      // First, get a signed upload URL from our backend
      const formData = new FormData();
      formData.append('file', file);

      // Upload to backend first
      const uploadResponse = await api.post('/donations/upload-signature', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      if (!uploadResponse.data?.url) {
        throw new Error('Failed to get upload URL');
      }

      return uploadResponse.data.url;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
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

        let proofOfPaymentUrl = '';
        if (formData.proofOfPayment) {
          try {
            proofOfPaymentUrl = await handleFileUpload(formData.proofOfPayment);
          } catch (error) {
            alert('Failed to upload proof of payment. Please try again.');
            return;
          }
        }

        // Create donation data
        const donationData = {
          fullName: formData.fullName || '',
          email: formData.email || '',
          contactNumber: formData.contactNumber || '',
          amount: formData.amount.toString(),
          message: formData.message || '',
          paymentMethod: paymentMethod,
          proofOfPayment: proofOfPaymentUrl, // Use the Cloudinary URL
          date: new Date().toISOString().split('T')[0] // Add current date
        };

        // Submit one-time donation
        await api.post('/donations', donationData);

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

        // Create an array to store all submitted items
        const submittedItems = [];

        for (const item of cartItems) {
          const donation = {
            ...donorData,
            item: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            type: item.type,
            expirationDate: item.expirationDate,
            ...(item.frequency && { frequency: item.frequency }),
          };

          const endpoint = item.type === 'regular' ? '/inventory/regular' : '/inventory/inkind';
          await api.post(endpoint, donation);
          submittedItems.push(item);
        }

        // Send submission notification email
        await api.post('/notifications/donation-submission', {
          email: formData.email,
          donorName: formData.fullName,
          items: submittedItems,
          submissionDate: new Date()
        });

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

  const toggleFaq = (id: string) => {
    setActiveFaq(activeFaq === id ? null : id);
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
                  onChange={async (e) => {
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
          <motion.div 
            className={`tab-content ${animationClass}`}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <div className="partner-section">
              <motion.div 
                className="partner-content"
                variants={fadeInLeft}
              >
                <h1>Partner with Us</h1>
                <p>
                  We welcome collaborations with organizations, corporations, and individuals who share our vision of
                  empowering underprivileged communities through education and support.
                </p>
                <p>
                  We offer flexible partnership options tailored to suit your specific goals and preferences. Whether
                  you're looking to sponsor a student, organize a fundraising event, or initiate a corporate giving
                  program, we're here to work with you every step of the way.
                </p>
                <p>
                  Together, we can create positive change and build a brighter future for those in need. Partner with us
                  today and be a part of something truly impactful.
                </p>
              </motion.div>
              <motion.img 
                src={partnerwithus} 
                alt="Partner with Us" 
                className="partner-icon"
                variants={fadeInRight}
                loading="lazy"
                decoding="async"
              />
            </div>
          </motion.div>
        );

      case "sponsor":
        return (
          <motion.div 
            className={`tab-content ${animationClass}`}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <div className="page-container">
              <motion.div 
                className="sponsor-container"
                variants={fadeInUp}
              >
                <div className="sponsor-text">
                  <h1>Sponsor a Student</h1>
                  <p>By sponsoring one of the following students, you will give them the opportunity to get an education so they can escape the cycle of poverty. Your contribution pays for their transportation to school, uniforms, books, tuition, and other school-related expenses.</p>
                  <p>Once you've chosen the student you would like to sponsor, we will send you a more detailed student profile. At that point, we will start your student sponsorship based on a donation of:</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="shape-container"
                variants={staggerContainer}
              >
                {[1, 2, 3, 4].map((_, index) => (
                  <motion.div 
                    key={index}
                    className="shape"
                    variants={fadeInUp}
                  >
                    <h1>PHP 12,000 / School year</h1>
                    <h1>for k - Grade 6 Students</h1>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div 
                className="sponsorp-text"
                variants={fadeInUp}
              >
                <p>You may either set up a recurring monthly donation, or you may make a one-time payment for an annual sponsorship. If you choose an annual sponsorship, we will send you a renewal request when it's about to expire. 
                Our hope is that, like almost all of our sponsors, you will opt to continue helping your student. Your commitment means the world to these children and, in turn, they will strive to honor your participation in their education.</p>
              </motion.div>
            </div>
          </motion.div>
        );

      case "donate":
        return (
          <motion.div 
            className={`tab-content ${animationClass}`}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <div className="donate-container">
              <motion.div 
                className="donate-text"
                variants={fadeInLeft}
              >
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
                      <li>Scholarship Assistance</li>
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
              </motion.div>
              <motion.div 
                className="donate-picture"
                variants={fadeInRight}
              >
                <img 
                  src={donatepicture} 
                  alt="Donate" 
                  loading="lazy"
                  decoding="async"
                />
              </motion.div>
            </div>
            
            <motion.div 
              className="donation-form-container"
              variants={fadeInUp}
            >
              <h2>Donation Form</h2>
              {renderDonationForm()}
              <div className="donation-note">
                <p><strong>Note:</strong> After submitting this form, our team will contact you with further instructions for completing your donation.</p>
              </div>
            </motion.div>
          </motion.div>
        );

      case "volunteer":
        return (
          <motion.div 
            className={`tab-content ${animationClass}`}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <div className="volunteer-container">
              <motion.div 
                className="volunteer-text"
                variants={fadeInLeft}
              >
                <h1 className="volunteer-text">Become a Volunteer</h1>
                <p>
                  Volunteering is a rewarding opportunity to make a positive impact in the lives of others while contributing to meaningful projects and initiatives. Whether you're passionate about education, the arts, digital media, or community engagement, there are various ways you can get involved and lend your skills and expertise to support our mission. 
                </p>
                <p>
                  These volunteer activities are just a few examples of how you can get involved and contribute your time and talents to support our organization's mission. We welcome individuals with diverse skills, backgrounds, and interests to join us in creating positive change and empowering communities in need. If you're interested in volunteering with us or learning more about our volunteer opportunities, please contact us for further information.
                </p>
              </motion.div>
              <motion.div 
                className="volunteer-picture"
                variants={fadeInRight}
              >
                <img 
                  src={volunteerpicture} 
                  alt="Volunteer" 
                  loading="lazy"
                  decoding="async"
                />
              </motion.div>
            </div>
          </motion.div>
        );

      case "faq":
        return (
          <motion.div 
            className={`tab-content ${animationClass}`}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <div className="faq-section minimal">
              <motion.h2 variants={fadeInUp}>Frequently Asked Questions</motion.h2>
              
              {/* FAQ categories with staggered animation */}
              <motion.div 
                className="faq-categories"
                variants={staggerContainer}
              >
                {/* About Donations */}
                <motion.div 
                  className="faq-category"
                  variants={fadeInUp}
                >
                  <h3>About Donations</h3>
                  <div id="safe-online-donation" className="faq-item">
                    <div 
                      className={`faq-question ${activeFaq === 'faq-1' ? 'active' : ''}`}
                      onClick={() => toggleFaq('faq-1')}
                    >
                      <h4>How can I donate safely online?</h4>
                      {activeFaq === 'faq-1' ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {activeFaq === 'faq-1' && (
                      <div className="faq-answer fixed-width">
                        <p>To donate safely online with KKMK Foundation:</p>
                        <ol>
                          <li>Always verify you're on our official website (look for https:// in the URL)</li>
                          <li>Use secure payment methods like credit cards or trusted platforms (GCash, Bank Transfer)</li>
                          <li>Check for security certifications on our payment pages</li>
                          <li>Keep receipts and confirmation emails for your records</li>
                          <li>Never share banking details via email or text</li>
                          <li>Look for acknowledgment of your donation within a reasonable timeframe</li>
                        </ol>
                        <p>If you have any concerns about donation safety, contact our team directly through our official channels.</p>
                      </div>
                    )}
                  </div>
                  <div className="faq-item">
                    <div 
                      className={`faq-question ${activeFaq === 'faq-2' ? 'active' : ''}`}
                      onClick={() => toggleFaq('faq-2')}
                    >
                      <h4>Is my donation tax-deductible?</h4>
                      {activeFaq === 'faq-2' ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {activeFaq === 'faq-2' && (
                      <div className="faq-answer fixed-width">
                        <p>Yes, KKMK Foundation is a registered non-profit organization, and donations are typically tax-deductible. We provide official receipts for all donations that can be used for tax purposes. The specific tax benefits may vary depending on your country's regulations.</p>
                        <p>For Philippine donors: We are registered with the BIR and can provide BIR Form 2322 for tax deductibility purposes.</p>
                      </div>
                    )}
                  </div>
                  <div className="faq-item">
                    <div 
                      className={`faq-question ${activeFaq === 'faq-3' ? 'active' : ''}`}
                      onClick={() => toggleFaq('faq-3')}
                    >
                      <h4>How is my donation used?</h4>
                      {activeFaq === 'faq-3' ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {activeFaq === 'faq-3' && (
                      <div className="faq-answer fixed-width">
                        <p>Your donations directly support our programs focused on education, poverty alleviation, and community development. Specifically:</p>
                        <ul>
                          <li>85% goes directly to program services (student scholarships, community programs, etc.)</li>
                          <li>10% covers administrative costs (staff, facilities, etc.)</li>
                          <li>5% is allocated to fundraising efforts to ensure sustainability</li>
                        </ul>
                        <p>We publish annual reports detailing how funds are utilized, which you can find in the Transparency section of our website.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
                
                {/* Ways to Help */}
                <motion.div 
                  className="faq-category"
                  variants={fadeInUp}
                >
                  <h3>Ways to Help</h3>
                  <div id="ways-to-help" className="faq-item">
                    <div 
                      className={`faq-question ${activeFaq === 'faq-4' ? 'active' : ''}`}
                      onClick={() => toggleFaq('faq-4')}
                    >
                      <h4>What are other ways I can help beyond donating money?</h4>
                      {activeFaq === 'faq-4' ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {activeFaq === 'faq-4' && (
                      <div className="faq-answer fixed-width">
                        <p>There are many ways to support our mission beyond financial contributions:</p>
                        <ul>
                          <li><strong>Volunteer your time:</strong> Depending on your skills, you can help with teaching, mentoring, event organizing, or administrative tasks</li>
                          <li><strong>Donate in-kind goods:</strong> School supplies, books, computers, clothing, food items, and other essentials</li>
                          <li><strong>Fundraise:</strong> Organize a fundraising event or campaign in your community or workplace</li>
                          <li><strong>Spread awareness:</strong> Share our work on social media, tell friends and family about our mission</li>
                          <li><strong>Offer professional services:</strong> If you're a professional (doctor, lawyer, accountant, etc.), consider offering pro bono services</li>
                          <li><strong>Corporate partnerships:</strong> Suggest your company partner with us through CSR initiatives or matching gift programs</li>
                        </ul>
                        <p>Visit our Volunteer page to learn more about specific opportunities currently available.</p>
                      </div>
                    )}
                  </div>
                  <div className="faq-item">
                    <div 
                      className={`faq-question ${activeFaq === 'faq-5' ? 'active' : ''}`}
                      onClick={() => toggleFaq('faq-5')}
                    >
                      <h4>Can I sponsor a specific child or project?</h4>
                      {activeFaq === 'faq-5' ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {activeFaq === 'faq-5' && (
                      <div className="faq-answer fixed-width">
                        <p>Yes! Our Student Sponsorship Program allows you to directly support a specific child's education. For PHP 12,000 per school year, you can provide:</p>
                        <ul>
                          <li>School tuition and fees</li>
                          <li>School supplies and books</li>
                          <li>Uniforms and shoes</li>
                          <li>Transportation assistance</li>
                        </ul>
                        <p>Sponsors receive regular updates about their student's progress, including photos, letters, and academic performance.</p>
                        <p>For project-specific sponsorship, please contact our partnerships team to discuss available opportunities for community initiatives, infrastructure projects, or program development.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
                
                {/* About Our Programs */}
                <motion.div 
                  className="faq-category"
                  variants={fadeInUp}
                >
                  <h3>About Our Programs</h3>
                  <div className="faq-item">
                    <div 
                      className={`faq-question ${activeFaq === 'faq-6' ? 'active' : ''}`}
                      onClick={() => toggleFaq('faq-6')}
                    >
                      <h4>What communities does KKMK Foundation serve?</h4>
                      {activeFaq === 'faq-6' ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {activeFaq === 'faq-6' && (
                      <div className="faq-answer fixed-width">
                        <p>KKMK Foundation primarily serves underprivileged communities in the Philippines, with a focus on:</p>
                        <ul>
                          <li>Urban poor communities in Metro Manila</li>
                          <li>Indigenous communities in remote areas</li>
                          <li>Disaster-affected regions</li>
                        </ul>
                        <p>Our programs specifically target children and families living below the poverty line, with particular attention to those who lack access to quality education and basic necessities.</p>
                      </div>
                    )}
                  </div>
                  <div className="faq-item">
                    <div 
                      className={`faq-question ${activeFaq === 'faq-7' ? 'active' : ''}`}
                      onClick={() => toggleFaq('faq-7')}
                    >
                      <h4>How can I apply for assistance from KKMK Foundation?</h4>
                      {activeFaq === 'faq-7' ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {activeFaq === 'faq-7' && (
                      <div className="faq-answer fixed-width">
                        <p>If you or someone you know needs assistance from our foundation:</p>
                        <ol>
                          <li>Visit our main office or contact us through our official channels</li>
                          <li>Complete an assistance application form (available online or at our office)</li>
                          <li>Submit required documentation (varies by program)</li>
                          <li>Wait for assessment by our social workers</li>
                        </ol>
                        <p>Our team evaluates applications based on need and program availability. Please note that we may have limited resources and waiting periods for certain programs.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
                
                {/* Volunteering */}
                <motion.div 
                  className="faq-category"
                  variants={fadeInUp}
                >
                  <h3>Volunteering</h3>
                  <div className="faq-item">
                    <div 
                      className={`faq-question ${activeFaq === 'faq-8' ? 'active' : ''}`}
                      onClick={() => toggleFaq('faq-8')}
                    >
                      <h4>What volunteer opportunities are available?</h4>
                      {activeFaq === 'faq-8' ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {activeFaq === 'faq-8' && (
                      <div className="faq-answer fixed-width">
                        <p>We offer various volunteer opportunities based on your skills, interests, and availability:</p>
                        <ul>
                          <li><strong>Education volunteers:</strong> Tutoring, teaching, curriculum development</li>
                          <li><strong>Event volunteers:</strong> Helping with fundraisers, community outreach events</li>
                          <li><strong>Administrative volunteers:</strong> Office assistance, data entry, documentation</li>
                          <li><strong>Creative volunteers:</strong> Graphic design, photography, content creation</li>
                          <li><strong>Professional volunteers:</strong> Medical, legal, accounting, counseling services</li>
                        </ul>
                        <p>Volunteers can commit to regular schedules or one-time events. Visit our Volunteer page to see current opportunities and application process.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };



  return (
    <div className="home-container">
      {/* Banner with loading optimization */}
      <img 
        src={bannerImage} 
        className={`banner-image ${isLoading ? 'loading' : 'loaded'}`}
        alt="Banner"
        onLoad={() => setIsLoading(false)}
        loading="eager"
        decoding="async"
      />
      <div className="page-container">
        <motion.div 
          className="help-tabs"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div 
            className="tabs-header"
            variants={fadeInUp}
          >
            <motion.button
              className={`tab-button ${activeTab === "partner" ? "active" : ""}`}
              onClick={() => handleTabChange("partner")}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.1 }}
            >
              PARTNER WITH US
            </motion.button>
            <motion.button
              className={`tab-button ${activeTab === "sponsor" ? "active" : ""}`}
              onClick={() => handleTabChange("sponsor")}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.1 }}
            >
              SPONSOR A STUDENT
            </motion.button>
            <motion.button
              className={`tab-button ${activeTab === "donate" ? "active" : ""}`}
              onClick={() => handleTabChange("donate")}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.1 }}
            >
              DONATE
            </motion.button>
            <motion.button
              className={`tab-button ${activeTab === "volunteer" ? "active" : ""}`}
              onClick={() => handleTabChange("volunteer")}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.1 }}
            >
              VOLUNTEER
            </motion.button>
            <motion.button
              className={`tab-button ${activeTab === "faq" ? "active" : ""}`}
              onClick={() => handleTabChange("faq")}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.1 }}
            >
              FAQ
            </motion.button>
          </motion.div>
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              className="tabs-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};


export default Help;