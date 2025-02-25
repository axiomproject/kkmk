import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scholarApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';  // Add this import
import '../styles/StudentProfile.css';
import { formatDate } from '../utils/dateUtils';
import { FaTimes } from 'react-icons/fa';
import { FiUpload } from 'react-icons/fi'; // Add this import

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
  grade_level: string;
  school: string;
  guardian_name: string;
  guardian_phone: string;
  address: string;
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
}

const initialDonationForm: DonationForm = {
  amount: 0,
  paymentMethod: '',
  message: '',
  name: '',
  email: '',
  phone: '',
  proof: null,
  proofPreview: ''
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
      accountNumber: '0917 123 4567'
    }
  },
  credit_card: {
    name: 'Credit Card',
    qrCode: '/images/payments/credit-qr.png', // Add your QR code image path
    details: {
      accountName: 'KKMK Foundation',
      accountNumber: '1234 5678 9012 3456',
      additionalInfo: 'We accept Visa, Mastercard, and JCB'
    }
  },
  bank_transfer: {
    name: 'Bank Transfer',
    qrCode: '/images/payments/bank-qr.png', // Add your QR code image path
    details: {
      accountName: 'KKMK Foundation',
      accountNumber: '1234-5678-9012',
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
}

interface DonationUpdate {
  amount: number;
  created_at: string;
  verification_status: 'verified';
}

const StudentDetails: React.FC = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Add this hook
  const [activeTab, setActiveTab] = useState<'details' | 'updates'>('details');
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [donationForm, setDonationForm] = useState<DonationSubmission>({
    scholarId: studentId || '',
    amount: 0,
    name: '',
    email: '',
    phone: '',
    message: '',
    paymentMethod: '',
    proof: null, // Initialize as null instead of undefined
    proofPreview: '' // Add initial value
  });
  const [donationUpdates, setDonationUpdates] = useState<DonationUpdate[]>([]);

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
    
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
    setShowDonationModal(true);
    // Remove the fixed positioning of body
  };

  const handleCloseModal = () => {
    setShowDonationModal(false);
    // Remove any scroll position restoration since we're keeping scrolling enabled
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      
      // Add sponsor ID if user is logged in and is a sponsor
      if (user && user.role === 'sponsor') {
        formData.append('sponsorId', user.id.toString());
      }
      
      // Add all form fields to FormData
      formData.append('scholarId', donationForm.scholarId);
      formData.append('amount', donationForm.amount.toString());
      formData.append('name', donationForm.name);
      formData.append('email', donationForm.email);
      formData.append('phone', donationForm.phone);
      formData.append('message', donationForm.message || '');
      formData.append('paymentMethod', donationForm.paymentMethod);
  
      // Append proof file if exists
      if (donationForm.proof) {
        formData.append('proof', donationForm.proof);
      }

      const response = await fetch('http://localhost:5175/api/scholardonations/submit', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to submit donation');
      }
  
      const result = await response.json();
      console.log('Donation submitted successfully:', result);
  
      alert('Thank you for your donation! We will verify your payment shortly.');
      setShowDonationModal(false);
      
      // Reset form
      setDonationForm({
        scholarId: studentId || '',
        amount: 0,
        name: '',
        email: '',
        phone: '',
        message: '',
        paymentMethod: '',
        proof: null,
        proofPreview: ''
      });
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

  const renderDonationStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="donation-step">
            <h3>Choose Amount</h3>
            <div className="amount-options">
              {[500, 1000, 2000, 5000].map((amount) => (
                <button
                  key={amount}
                  className={`amount-btn ${donationForm.amount === amount ? 'selected' : ''}`}
                  onClick={() => setDonationForm(prev => ({ ...prev, amount }))}
                >
                  ₱{amount.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="custom-amount">
              <input
                type="number"
                placeholder="Enter custom amount"
                value={donationForm.amount === 0 ? '' : donationForm.amount}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  const numericValue = inputValue === '' ? 0 : parseInt(inputValue);
                  setDonationForm(prev => ({ 
                    ...prev, 
                    amount: numericValue
                  }));
                }}
                step="1"
              />
              {donationForm.amount > 0 && donationForm.amount < 100 && (
                <p className="amount-warning">Minimum donation amount is ₱100</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="donation-step">
            <h3>Your Details</h3>
            <div className="donation-form">
              <input
                type="text"
                placeholder="Your Name"
                value={donationForm.name}
                onChange={(e) => setDonationForm(prev => ({ ...prev, name: e.target.value }))}
              />
              <input
                type="email"
                placeholder="Email Address"
                value={donationForm.email}
                onChange={(e) => setDonationForm(prev => ({ ...prev, email: e.target.value }))}
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={donationForm.phone}
                onChange={(e) => setDonationForm(prev => ({ ...prev, phone: e.target.value }))}
              />
              <textarea
                placeholder="Leave a message (optional)"
                value={donationForm.message}
                onChange={(e) => setDonationForm(prev => ({ ...prev, message: e.target.value }))}
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
                  onClick={() => setDonationForm(prev => ({ 
                    ...prev, 
                    paymentMethod: method as 'gcash' | 'credit_card' | 'bank_transfer' // Explicitly type the method
                  }))}
                >
                  {PAYMENT_METHODS[method].name}
                </button>
              ))}
            </div>

            {donationForm.paymentMethod && (
              <div className="payment-details">
                <div className="qr-code-container">
                  <img 
                    src={PAYMENT_METHODS[donationForm.paymentMethod].qrCode} 
                    alt={`${PAYMENT_METHODS[donationForm.paymentMethod].name} QR Code`}
                    className="payment-qr-code"
                  />
                </div>
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
    return 'Donate Now';
  };

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
        const response = await fetch(`http://localhost:5175/api/scholardonations/history/${studentId}`);
        if (!response.ok) throw new Error('Failed to fetch updates');
        const data = await response.json();
        setDonationUpdates(data);
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!student) return <div>No student found</div>;

  return (
    <div className="student-profile-container">
      <div className="student-profile-sidebar">
        <button className="student-profile-btn" onClick={() => navigate('/StudentProfile')}>
          Back to Students
        </button>
      </div>
      
      <div className="student-profile-main">
        <div className="student-details-content">
          <div className="student-details-header">
            <div className="student-details-image-container">
              <img 
                src={`http://localhost:5175${student.image_url}`}
                alt={`${student.first_name} ${student.last_name}`}
                className="student-details-image"
              />
              <ProgressBar 
                currentAmount={student.current_amount} 
                amountNeeded={student.amount_needed}
              />
              <button 
                className="student-profile-donate-btn"
                onClick={handleDonateClick}
              >
                {getButtonText()}
              </button>
            </div>
            <div className="student-details-info">
              <h1>{`${student.first_name} ${student.last_name}`}</h1>
              
              <div className="student-details-tabs">
                <button 
                  className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
                  onClick={() => setActiveTab('updates')}
                >
                  Updates
                </button>
              </div>

              <div className="student-details-tab-content">
                {activeTab === 'details' ? (
                  <div className="details-tab">
                  
                      <p><strong>Name:</strong> {`${student.first_name} ${student.last_name}`}</p>
                      <p><strong>Date of Birth:</strong> {formatDate(student.date_of_birth)}</p>
                      <p><strong>Gender:</strong> {student.gender}</p>
                      <p><strong>School:</strong> {student.school}</p>
                      <p><strong>Education Level:</strong> {student.grade_level}</p>
                      <p><strong>Address:</strong> {student.address}</p>
                 
                    
          
                      <p><strong>Guardian Name:</strong> {student.guardian_name}</p>
                      <p><strong>Guardian Phone:</strong> {student.guardian_phone}</p>
                

              
                      <p><strong>Favorite Subject:</strong> {student.favorite_subject}</p>
                      <p><strong>Favorite Activity:</strong> {student.favorite_activity}</p>
                      <p><strong>Favorite Color:</strong> {student.favorite_color}</p>
              

                    {student.other_details && (
                      <div className="other-details">
                        <h3>Additional Information</h3>
                        <p>{student.other_details}</p>
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
                      <p className="no-updates">No donation updates yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showDonationModal && renderDonationModal()}
    </div>
  );
};

export default StudentDetails;

