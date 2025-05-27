import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scholarApi } from '../services/api';
import { useAuth } from '../hooks/useAuth'; 
import '../styles/StudentProfile.css';
import { formatDate } from '../utils/dateUtils';
import { FaTimes, FaBookOpen, FaGraduationCap, FaChevronDown, FaInfoCircle } from 'react-icons/fa';
import { FiUpload } from 'react-icons/fi';
import api from '../config/axios';

interface StudentDetails {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  favorite_subject: string;
  favorite_activity: string;
  favorite_color: string;
  image_url: string;
  education_level: string;
  school: string;
  guardian_name: string;
  guardian_phone: string;
  other_details: string;
  status: string;
  current_amount: number;
  amount_needed: number;
}

interface DonationForm {
  amount: number;
  paymentMethod: 'gcash' | 'credit_card' | 'bank_transfer' | '';
  message: string;
  name: string;
  email: string;
  phone: string;
  proof: File | null;
  proofPreview: string;
  frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'; // Add this new field
}

const initialDonationForm: DonationForm = {
  amount: 0,
  paymentMethod: '',
  message: '',
  name: '',
  email: '',
  phone: '',
  proof: null,
  proofPreview: '',
  frequency: 'monthly' // Default to monthly
};

interface PaymentMethod {
  name: string;
  qrCode: string;
  details: {
    accountName: string;
    accountNumber: string;
    additionalInfo?: string;
  };
}

const PAYMENT_METHODS: Record<string, PaymentMethod> = {
  gcash: {
    name: 'GCash',
    qrCode: '/images/payments/gcash.jpg', // Add your QR code image path
    details: {
      accountName: 'KKMK Foundation',
      accountNumber: '0907 123 4906'
    }
  },
  credit_card: {
    name: 'Credit Card',
    qrCode: '', // Removed QR code requirement
    details: {
      accountName: 'KKMK Foundation',
      accountNumber: '2354 5678 9012 3456',
      additionalInfo: 'We accept Visa, Mastercard, and JCB'
    }
  },
  bank_transfer: {
    name: 'Bank Transfer',
    qrCode: '', // Removed QR code requirement
    details: {
      accountName: 'KKMK Foundation',
      accountNumber: '5734-5678-9012',
      additionalInfo: 'BDO Savings Account'
    }
  }
};

const ProgressBar: React.FC<{ currentAmount: number; amountNeeded: number }> = ({ currentAmount, amountNeeded }) => {
  const percentage = Math.min((currentAmount / amountNeeded) * 100, 100);
  
  return (
    <div className="scholar-progress-container">
      <div className="scholar-progress-bar">
        <div 
          className="scholar-progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="scholar-progress-text">
        <span>₱{currentAmount.toLocaleString()}</span>
        <span>₱{amountNeeded.toLocaleString()}</span>
      </div>
    </div>
  );
};

interface DonationSubmission {
  scholarId: string;
  amount: number;
  name: string;
  email: string;
  phone: string;
  message?: string;
  paymentMethod: 'gcash' | 'credit_card' | 'bank_transfer' | ''; // Make it match DonationForm's paymentMethod type
  proof: File | null;
  proofPreview: string;
  sponsorId?: number; // Add this field
  frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'; // Add frequency here too
}

interface DonationUpdate {
  amount: number;
  created_at: string;
  verification_status: 'verified';
}

const StudentDetails: React.FC = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'story' | 'updates'>('story');
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [donationForm, setDonationForm] = useState<DonationSubmission>({
    scholarId: studentId || '',
    amount: 0,
    name: '',
    email: '',
    phone: '',
    message: '',
    paymentMethod: '',
    proof: null,
    proofPreview: '',
    frequency: 'monthly' // Set default frequency
  });
  const [donationUpdates, setDonationUpdates] = useState<DonationUpdate[]>([]);

  const handleFormInputChange = (field: keyof DonationSubmission, value: string | number) => {
    setDonationForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDonateClick = () => {
    if (!user) {
      navigate('/register', { 
        state: { 
          preselectedRole: 'sponsor',
          scholarId: studentId
        }
      });
      return;
    }

    if (user.role === 'volunteer' || user.role === 'scholar') {
      alert('Please contact the admin if you would like to support this scholar.');
      return;
    }
    
    // Reset to step 1 when opening the donation modal
    setCurrentStep(1);
    
    // Pre-populate form with sponsor information and set the amount to the student's needed amount
    if (student) {
      setDonationForm({
        scholarId: studentId || '',
        amount: student.amount_needed, // Automatically set to amount needed
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        message: '',
        paymentMethod: '',
        proof: null,
        proofPreview: '',
        frequency: 'monthly' // Set default frequency
      });
    }
    
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
    setShowDonationModal(true);
  };

  const handleDonateRedirect = () => {
    navigate('/help');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
  };

  const handleCloseModal = () => {
    setShowDonationModal(false);
    // Remove any scroll position restoration since we're keeping scrolling enabled
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      
      // Log form data being submitted for debugging
      console.log('Submitting donation form with data:', donationForm);
      
      // Add sponsor ID if user is logged in and is a sponsor
      if (user && user.role === 'sponsor') {
        formData.append('sponsorId', user.id.toString());
      }
      
      // Add all form fields to FormData - ensure we're using the current state values
      formData.append('scholarId', donationForm.scholarId);
      formData.append('amount', donationForm.amount.toString());
      formData.append('name', donationForm.name);
      formData.append('email', donationForm.email);
      formData.append('phone', donationForm.phone);
      formData.append('message', donationForm.message || '');
      formData.append('paymentMethod', donationForm.paymentMethod);
      formData.append('frequency', donationForm.frequency); // Add frequency to the form data
  
      // Append proof file if exists
      if (donationForm.proof) {
        formData.append('proof', donationForm.proof);
      }

      const response = await api.post('/scholardonations/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
  
      if (response.status === 201) {
        const result = response.data;
        console.log('Donation submitted successfully:', result);
    
        alert('Thank you for your donation! We will verify your payment shortly.');
        setShowDonationModal(false);
        
        // Reset form and step counter for next time
        setDonationForm({
          scholarId: studentId || '',
          amount: 0,
          name: '',
          email: '',
          phone: '',
          message: '',
          paymentMethod: '',
          proof: null,
          proofPreview: '',
          frequency: 'monthly' // Set default frequency
        });
        setCurrentStep(1);
      }
    } catch (error) {
      console.error('Error submitting donation:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit donation. Please try again.');
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDonationForm(prev => ({
          ...prev,
          proof: file,
          proofPreview: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProof = () => {
    setDonationForm(prev => ({
      ...prev,
      proof: null, // Use null instead of undefined
      proofPreview: ''
    }));
  };

  // Add a useEffect to update form data when user data changes
  useEffect(() => {
    // Pre-populate form when user data changes and modal is open
    if (user && user.role === 'sponsor' && showDonationModal) {
      setDonationForm(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone
      }));
    }
  }, [user, showDonationModal]);

  const renderDonationStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="donation-step">
            <h3>Scholarship Amount</h3>
            <div className="fixed-amount-container">
              <div className="fixed-amount-display">
                <p>
                  Full scholarship support for {student?.first_name} costs:
                </p>
                <div className="fixed-amount-value">
                  ₱{student ? student.amount_needed.toLocaleString() : '0'}
                </div>
                <p className="fixed-amount-description">
                  This covers school supplies, uniform, and educational materials for the school year.
                </p>
              </div>
            </div>
            
            {/* Add sponsorship frequency dropdown */}
            <div className="frequency-selection">
              <label htmlFor="sponsorship-frequency">Sponsorship Frequency:</label>
              <select 
                id="sponsorship-frequency" 
                className="frequency-dropdown"
                value={donationForm.frequency}
                onChange={(e) => handleFormInputChange('frequency', e.target.value as any)}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (Every 3 months)</option>
                <option value="semi_annual">Semi-Annual (Every 6 months)</option>
                <option value="annual">Annual (Once a year)</option>
              </select>
              <p className="frequency-description">
                Choose how often you'd like to contribute to {student?.first_name}'s education.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="donation-step">
            <h3>Your Details</h3>
            {user && user.role === 'sponsor' && (
              <p className="autofill-notice" style={{ color: '#4CAF50', fontSize: '0.9rem', marginBottom: '10px' }}>
                ✓ Your profile information has been autofilled
              </p>
            )}
            <div className="donation-form">
              <input
                type="text"
                placeholder="Your Name"
                value={donationForm.name}
                onChange={(e) => handleFormInputChange('name', e.target.value)}
              />
              <input
                type="email"
                placeholder="Email Address"
                value={donationForm.email}
                onChange={(e) => handleFormInputChange('email', e.target.value)}
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={donationForm.phone}
                onChange={(e) => handleFormInputChange('phone', e.target.value)}
              />
              <textarea
                placeholder="Leave a message (optional)"
                value={donationForm.message}
                onChange={(e) => handleFormInputChange('message', e.target.value)}
                rows={4}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="donation-step">
            <h3>Payment Method</h3>
            <div className="payment-options">
              {Object.keys(PAYMENT_METHODS).map((method) => (
                <button
                  key={method}
                  className={`payment-btn ${donationForm.paymentMethod === method ? 'selected' : ''}`}
                  onClick={() => handleFormInputChange('paymentMethod', method as 'gcash' | 'credit_card' | 'bank_transfer')}
                >
                  {PAYMENT_METHODS[method].name}
                </button>
              ))}
            </div>

            {donationForm.paymentMethod && (
              <div className="payment-details">
                {PAYMENT_METHODS[donationForm.paymentMethod].qrCode && (
                  <div className="qr-code-container">
                    <img 
                      src={PAYMENT_METHODS[donationForm.paymentMethod].qrCode} 
                      alt={`${PAYMENT_METHODS[donationForm.paymentMethod].name} QR Code`}
                      className="payment-qr-code"
                    />
                  </div>
                )}
                <div className="payment-info">
                  <h4>{PAYMENT_METHODS[donationForm.paymentMethod].name} Payment Details</h4>
                  <p><strong>Account Name:</strong> {PAYMENT_METHODS[donationForm.paymentMethod].details.accountName}</p>
                  <p><strong>Account Number:</strong> {PAYMENT_METHODS[donationForm.paymentMethod].details.accountNumber}</p>
                  {PAYMENT_METHODS[donationForm.paymentMethod].details.additionalInfo && (
                    <p><strong>Additional Info:</strong> {PAYMENT_METHODS[donationForm.paymentMethod].details.additionalInfo}</p>
                  )}
                </div>
                <div className="proof-upload-section">
                  <h4>Proof of Payment</h4>
                  <p className="proof-description">Optional: Upload your payment receipt</p>
                  <div className="proof-upload-container">
                    <input
                      type="file"
                      id="proofUpload"
                      accept="image/*"
                      onChange={handleProofUpload}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="proofUpload" className="proof-upload-label">
                      {donationForm.proofPreview ? (
                        <div className="proof-preview-container">
                          <img
                            src={donationForm.proofPreview}
                            alt="Payment proof"
                            className="proof-preview-image"
                          />
                          <button
                            type="button"
                            className="remove-proof-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              handleRemoveProof();
                            }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <div className="proof-upload-placeholder">
                          <FiUpload size={24} />
                          <span>Upload Receipt</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="donation-summary">
              <h4>Donation Summary</h4>
              <p>Amount: ₱{donationForm.amount.toLocaleString()}</p>
              <p>Frequency: {donationForm.frequency.replace('_', '-').charAt(0).toUpperCase() + donationForm.frequency.replace('_', '-').slice(1)}</p>
              <p>Name: {donationForm.name}</p>
              <p>Email: {donationForm.email}</p>
              <p>Phone: {donationForm.phone}</p>
              {donationForm.message && <p>Message: {donationForm.message}</p>}
              {donationForm.proofPreview && (
                <p><strong>Receipt:</strong> Uploaded ✓</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderDonationModal = () => (
    <div className="donation-modal-overlay" onClick={handleCloseModal}>
      <div className="donation-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={handleCloseModal}>
          <FaTimes />
        </button>
        <div className="donation-header">
          <h2>Support {student?.first_name}'s Education</h2>
          <div className="step-indicators">
            {[1, 2, 3].map((step) => (
              <div key={step} className={`step ${currentStep === step ? 'active' : ''}`}>
                {step}
              </div>
            ))}
          </div>
        </div>
        
        {renderDonationStep()}

        <div className="donation-actions">
          {currentStep > 1 && (
            <button onClick={() => setCurrentStep(prev => prev - 1)}>
              Previous
            </button>
          )}
          {currentStep < 3 ? (
            <button 
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={
                (currentStep === 1 && (donationForm.amount === 0 || donationForm.amount < 100)) ||
                (currentStep === 2 && (!donationForm.name || !donationForm.email || !donationForm.phone))
              }
            >
              Next
            </button>
          ) : (
            <button 
              onClick={handleDonationSubmit}
              disabled={!donationForm.paymentMethod}
            >
              Complete Donation
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Add this helper function for button text
  const getButtonText = () => {
    if (!user) return 'Sign Up to Sponsor';
    if (user.role === 'volunteer' || user.role === 'scholar') return 'Contact Admin';
    return 'Sponsor Now';
  };

  // New render function for dropdown items with tooltips
  const renderDropdownItem = (
    label: string,
    onClick: () => void,
    tooltipText: string
  ) => (
    <button 
      className="donate-dropdown-item"
      onClick={onClick}
    >
      {label}
      <div className="info-icon-container">
        <FaInfoCircle className="info-icon" />
        <span className="info-tooltip">{tooltipText}</span>
      </div>
    </button>
  );

  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (!studentId) return;
      try {
        setLoading(true);
        const data = await scholarApi.getScholarDetails(studentId);
        setStudent(data);
      } catch (err) {
        console.error('Error fetching student details:', err);
        setError('Failed to load student details');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetails();
  }, [studentId]);

  useEffect(() => {
    const fetchDonationUpdates = async () => {
      if (!studentId) return;
      try {
        const response = await api.get(`/scholardonations/history/${studentId}`);
        setDonationUpdates(response.data);
      } catch (error) {
        console.error('Error fetching donation updates:', error);
      }
    };

    if (activeTab === 'updates') {
      fetchDonationUpdates();
    }
  }, [studentId, activeTab]);

  const formatUpdateDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${import.meta.env.VITE_API_URL}${path}`;
  };

  // Helper function to get highlighted information - enhanced with better information
  const getHighlights = (student: StudentDetails) => {
    return [
      {
        icon: <FaGraduationCap />,
        label: "Education",
        value: `${student.school}${student.education_level ? `, ${student.education_level}` : ''}`
      },
      {
        icon: <FaBookOpen />,
        label: "Interest",
        value: student.favorite_subject || student.favorite_activity || "Learning"
      }
    ];
  };

  if (loading) return <div className="student-loading">Loading student story...</div>;
  if (error) return <div className="student-error">Error: {error}</div>;
  if (!student) return <div className="student-not-found">No student found</div>;

  const highlights = getHighlights(student);

  return (
    <div className="student-profile-container">
      <div className="student-profile-sidebar">
        <button className="student-profile-btn" onClick={() => navigate('/StudentProfile')}>
          Back to Students
        </button>
      </div>
      
      <div className="student-profile-main student-story-main">
        <div className="student-story-header">
          <div className="student-portrait-container">
            <img 
              src={getImageUrl(student.image_url)}
              alt={`${student.first_name}`}
              className="student-portrait"
            />
            <ProgressBar 
              currentAmount={student.current_amount} 
              amountNeeded={student.amount_needed}
            />
            
            <div className="student-donate-dropdown-container">
              <button 
                className="student-profile-donate-btn"
                onClick={toggleDropdown}
              >
                {getButtonText()} <FaChevronDown />
              </button>
              
              {isDropdownOpen && (
                <div className="donate-dropdown-menu">
                  {renderDropdownItem(
                    "Sponsor Now", 
                    () => {
                      handleDonateClick();
                      handleCloseDropdown();
                    },
                    "Full scholarship support for this student for the whole year"
                  )}
                  {renderDropdownItem(
                    "Donate Now", 
                    () => {
                      handleDonateRedirect();
                      handleCloseDropdown();
                    },
                    "One-time donation to the general fund"
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="student-story-intro">
            <h1 className="student-name">{`${student.first_name} ${student.last_name}`}</h1>
            
            <div className="student-highlights">
              {highlights.map((item, index) => (
                <div key={index} className="highlight-item">
                  <div className="highlight-icon">{item.icon}</div>
                  <div className="highlight-content">
                    <span className="highlight-label">{item.label}</span>
                    <span className="highlight-value">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="student-tabs">
              <button 
                className={`tab-btn ${activeTab === 'story' ? 'active' : ''}`}
                onClick={() => setActiveTab('story')}
              >
                Story
              </button>
              <button 
                className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
                onClick={() => setActiveTab('updates')}
              >
                Updates
              </button>
            </div>
          </div>
        </div>
        
        <div className="student-content-area">
          {activeTab === 'story' ? (
            <div className="student-story">
              {student.other_details ? (
                <>
                  <div className="story-quote-mark start-quote">"</div>
                  <div className="story-contentss">
                    {student.other_details}
                  </div>
                  <div className="story-quote-mark end-quote">"</div>
                </>
              ) : (
                <div className="no-story-message">
                  <p>We're still writing {student.first_name}'s story. This young dreamer has great potential and needs your support to achieve their educational goals.</p>
                  <div className="student-donate-dropdown-container">
                 
                    
                   
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="updates-tab">
              {donationUpdates.length > 0 ? (
                <div className="donation-updates">
                  {donationUpdates.map((update, index) => (
                    <div key={index} className="update-item">
                      <div className="update-icon">💝</div>
                      <div className="update-content">
                        <p className="update-text">
                          Received a donation of <span className="amount">₱{update.amount.toLocaleString()}</span>
                        </p>
                        <p className="update-date">{formatUpdateDate(update.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-updates">
                  <p>No donation updates yet. Be the first to support {student.first_name}!</p>
                  <div className="student-donate-dropdown-container">
                    <button className="student-support-cta dropdown-toggle" onClick={toggleDropdown}>
                      Support Now <FaChevronDown />
                    </button>
                    
                    {isDropdownOpen && (
                      <div className="donate-dropdown-menu">
                        {renderDropdownItem(
                          "Sponsor Now", 
                          () => {
                            handleDonateClick();
                            handleCloseDropdown();
                          },
                          "Full scholarship support for this student"
                        )}
                        {renderDropdownItem(
                          "Donate Now", 
                          () => {
                            handleDonateRedirect();
                            handleCloseDropdown();
                          },
                          "One-time donation to the general fund"
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {showDonationModal && renderDonationModal()}
    </div>
  );
};

export default StudentDetails;

