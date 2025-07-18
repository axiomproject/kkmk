import React, { useState, useEffect } from 'react';
import api from '../../config/axios'; // Replace axios import
import * as XLSX from 'xlsx';
import '../../styles/Bank.css';
import DonationService from '../../services/donationService';
import { AxiosResponse } from 'axios';

interface Transaction {
  id: number;
  amount: number;
  donor: string;
  date: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  proofOfPayment?: string | null;  // Update type to allow null
  remarks?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  fullName: string;
  email: string;
  contactNumber: string;
  message?: string;
  paymentMethod?: string; // Add payment method field
  certificate_sent?: boolean;
  certificate_sent_at?: string;
}

interface DonationResponse {
  id: number;
  amount: string;
  full_name: string;
  date: string;
  verification_status: string;
  proof_of_payment?: string | null;  // Update type to allow null
  message?: string;
  verified_at?: string;
  verified_by?: string;
  email: string;
  contact_number: string;
  payment_method?: string; // Add payment method field
}

// Add a base URL constant near the top of your file
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175'; 

const Bank: React.FC = () => {
  const [activeView, setActiveView] = useState<'verified' | 'pending'>('verified');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | undefined>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [sendingCertificateIds, setSendingCertificateIds] = useState<Set<number>>(new Set());
  const [actionMessage, setActionMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const loadDonations = async () => {
      try {
        const response = await api.get('/donations');
        const transformedDonations = response.data.map((donation: any) => ({
          id: donation.id,
          amount: parseFloat(donation.amount),
          donor: donation.full_name,
          date: donation.date,
          verificationStatus: donation.verification_status,
          // Use Cloudinary URL directly
          proofOfPayment: donation.proof_of_payment || null,
          remarks: donation.message,
          verifiedAt: donation.verified_at,
          verifiedBy: donation.verified_by,
          rejectedAt: donation.rejected_at,
          rejectedBy: donation.rejected_by,
          rejectionReason: donation.rejection_reason,
          fullName: donation.full_name,
          email: donation.email,
          contactNumber: donation.contact_number,
          message: donation.message,
          paymentMethod: donation.payment_method
        }));

        setTransactions(transformedDonations);
      } catch (error) {
        console.error('Error loading donations:', error);
      }
    };

    loadDonations();
    const interval = setInterval(loadDonations, 30000);
    return () => clearInterval(interval);
  }, []);

  const calculateVerifiedTotal = () => {
    return transactions
      .filter(t => t.verificationStatus === 'verified')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const calculateVerifiedMonthlyTotal = () => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // Adding 1 because getMonth() returns 0-11
    const currentYear = today.getFullYear();

    return transactions
      .filter(t => {
        const [year, month] = t.date.split('-'); // Split "2024-01-20" into year and month
        return t.verificationStatus === 'verified' &&
               parseInt(month) === currentMonth &&
               parseInt(year) === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const calculatePendingTotal = () => {
    return transactions
      .filter(t => t.verificationStatus === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleVerify = async (id: number) => {
    try {
      const result = await api.put(`/donations/${id}/verify`);
      console.log('Verification result:', result);
      
      // Update local state with the verified donation
      setTransactions(prevTransactions => 
        prevTransactions.map(transaction => 
          transaction.id === id ? {
            ...transaction,
            verificationStatus: 'verified',
            verifiedAt: result.data.verified_at,
            verifiedBy: result.data.verified_by
          } : transaction
        )
      );

      alert('Donation verified successfully!');
    } catch (error) {
      console.error('Error verifying donation:', error);
      alert('Failed to verify donation');
    }
  };

  const handleReject = async (id: number) => {
    const reason = window.prompt('Please enter reason for rejection:');
    if (reason) {
      try {
        const result = await api.put(`/donations/${id}/reject`, { reason });
        console.log('Rejection result:', result);

        // Update local state with the rejected donation
        setTransactions(prevTransactions => 
          prevTransactions.map(transaction => 
            transaction.id === id ? {
              ...transaction,
              verificationStatus: 'rejected',
              rejectedAt: result.data.rejected_at,
              rejectedBy: result.data.rejected_by,
              rejectionReason: reason
            } : transaction
          )
        );

        alert('Donation rejected successfully');
      } catch (error) {
        console.error('Error rejecting donation:', error);
        alert('Failed to reject donation');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this donation record? This action cannot be undone.')) {
      try {
        await DonationService.deleteDonation(id);
        setTransactions(prevTransactions => 
          prevTransactions.filter(transaction => transaction.id !== id)
        );
        alert('Donation record deleted successfully');
      } catch (error) {
        console.error('Error deleting donation:', error);
        alert('Failed to delete donation');
      }
    }
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const handleViewProof = (proofUrl: string, message?: string) => {
    setSelectedProof(proofUrl);
    setSelectedMessage(message);
    setShowProofModal(true);
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    try {
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

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fileInput = form.querySelector('input[name="proofOfPayment"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    try {
      let proofOfPaymentUrl = null;
      if (file) {
        proofOfPaymentUrl = await handleFileUpload(file);
      }

      const donationData = {
        fullName: form.fullName.value,
        email: form.email.value,
        contactNumber: form.contactNumber.value,
        amount: form.amount.value,
        message: form.message?.value || '',
        paymentMethod: form.paymentMethod.value,
        date: new Date().toLocaleDateString('en-US'),
        proofOfPayment: proofOfPaymentUrl
      };

      const response: AxiosResponse<DonationResponse> = await api.post('/donations', donationData);
      const data = response.data;

      // Transform the new donation using the response data
      const newDonation: Transaction = {
        id: data.id,
        amount: parseFloat(data.amount),
        donor: data.full_name,
        date: data.date,
        verificationStatus: data.verification_status as 'pending' | 'verified' | 'rejected',
        proofOfPayment: data.proof_of_payment || null,
        fullName: data.full_name,
        email: data.email,
        contactNumber: data.contact_number,
        message: data.message,
        paymentMethod: data.payment_method
      };

      setTransactions(prev => [newDonation, ...prev]);
      setShowAddModal(false);
      form.reset();
      setActionMessage({ text: 'Donation added successfully!', type: 'success' });
    } catch (error) {
      console.error('Error adding donation:', error);
      setActionMessage({ text: 'Failed to add donation. Please try again.', type: 'error' });
    }
  };

  const handleSendCertificate = async (id: number) => {
    // Get the transaction to display name in confirmation
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    // Only allow for verified transactions
    if (transaction.verificationStatus !== 'verified') {
      alert('Only verified donations can receive certificates');
      return;
    }
    
    if (!transaction.email) {
      alert('Cannot send certificate: Donor email is missing');
      return;
    }
    
    if (!window.confirm(`Send donation certificate to ${transaction.fullName} (${transaction.email})?`)) return;
    
    try {
      // Add this ID to the set of sending certificate IDs
      setSendingCertificateIds(prev => new Set(prev).add(id));
      
      // Call API endpoint to generate and send certificate
      const response = await api.post(`/donations/${id}/send-certificate`);
      
      if (response.data.success) {
        // Show success message
        setActionMessage({
          text: 'Certificate sent successfully!',
          type: 'success'
        });
        
        // Update local state to reflect certificate sent
        setTransactions(prevTransactions => 
          prevTransactions.map(t => 
            t.id === id ? {
              ...t,
              certificate_sent: true,
              certificate_sent_at: new Date().toISOString()
            } : t
          )
        );
      } else {
        throw new Error(response.data.message || 'Failed to send certificate');
      }
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setActionMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error sending certificate:', error);
      setActionMessage({
        text: 'Failed to send certificate. Please try again.',
        type: 'error'
      });
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setActionMessage(null);
      }, 5000);
    } finally {
      // Remove this ID from the set of sending certificate IDs
      setSendingCertificateIds(prev => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Extract just the date portion before the 'T'
      const date = dateString.split('T')[0];
      // Convert to more readable format
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  // Add pagination calculations
  const calculatePagination = (items: Transaction[]) => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return items.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  const renderPageNumbers = () => {
    const filteredTransactions = transactions.filter(t => 
      activeView === 'verified' ? 
        t.verificationStatus === 'verified' : 
        t.verificationStatus === 'pending'
    );
    const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages.map((page, index) => (
      <button
        key={index}
        className={`page-number ${currentPage === page ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}
        onClick={() => typeof page === 'number' ? handlePageChange(page) : null}
        disabled={page === '...'}
      >
        {page}
      </button>
    ));
  };

  // Modify the table rendering section
  const renderTransactions = () => {
    const filteredTransactions = transactions.filter(t => 
      activeView === 'verified' ? 
        t.verificationStatus === 'verified' : 
        t.verificationStatus === 'pending'
    );
    
    const paginatedTransactions = calculatePagination(filteredTransactions);
    
    return paginatedTransactions.map((transaction) => (
      <tr key={transaction.id}>
        <td>{formatDate(transaction.date)}</td>
        <td>₱{transaction.amount}</td>
        <td>{transaction.fullName}</td>
        <td>{transaction.paymentMethod || 'N/A'}</td> {/* Add payment method column */}
        {activeView === 'verified' ? (
          <>
            <td>{transaction.proofOfPayment && (
              <button 
                className="proof-button"
                onClick={() => handleViewProof(transaction.proofOfPayment!, transaction.message)}
              >View Proof</button>
            )}</td>
            <td>
              <div className="action-button-bank">
                <button 
                  onClick={() => handleViewDetails(transaction)}
                  className="view-button"
                >View</button>
                {transaction.email && (
                  <button 
                    onClick={() => handleSendCertificate(transaction.id)}
                    className="certificate-button"
                    disabled={sendingCertificateIds.has(transaction.id)}
                    title={transaction.certificate_sent ? 'Certificate already sent' : 'Send donation certificate'}
                  >
                    {sendingCertificateIds.has(transaction.id) ? 'Sending...' : 
                      transaction.certificate_sent ? 'Resend' : 'Certificate'}
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(transaction.id)}
                  className="delete-btn"
                >Delete</button>
              </div>
            </td>
          </>
        ) : (
          <>
            <td>{transaction.proofOfPayment && (
              <button 
                className="proof-button"
                onClick={() => handleViewProof(transaction.proofOfPayment!, transaction.message)}
              >View Proof</button>
            )}</td>
            <td className="action-button-bank">
              <button 
                onClick={() => handleVerify(transaction.id)}
                className="verify-button"
              >Verify</button>
              <button 
                onClick={() => handleReject(transaction.id)}
                className="reject-button"
              >Reject</button>
            </td>
          </>
        )}
      </tr>
    ));
  };

  const handleExport = () => {
    try {
      // Transform the data for export
      const exportData = transactions
        .filter(t => t.verificationStatus === activeView)
        .map(transaction => ({
          'Date': formatDate(transaction.date),
          'Amount': `₱${transaction.amount.toLocaleString()}`,
          'Donor Name': transaction.fullName,
          'Email': transaction.email,
          'Contact Number': transaction.contactNumber,
          'Message': transaction.message || 'N/A',
          'Status': transaction.verificationStatus,
          'Verified By': transaction.verifiedBy || 'N/A',
          'Verified At': transaction.verifiedAt ? formatDate(transaction.verifiedAt) : 'N/A'
        }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${activeView}_donations`);

      // Generate file name with date
      const fileName = `${activeView}_donations_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
  };

  return (
    <div className="bank-container">
      <div className="bank-header">
        <h1 className="bank-title">Monetary Donations</h1>
        <div className="bank-actions">
          <div className="bank-tab-buttons">
            <button 
              className={`bank-tab-buttons ${activeView === 'verified' ? 'active' : ''}`}
              onClick={() => setActiveView('verified')}
            >
              Verified Donations
            </button>
            <button 
              className={`bank-tab-buttons ${activeView === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveView('pending')}
            >
              Verification Queue
            </button>
          </div>
          <button 
            className="export-btn" 
            onClick={handleExport}
            disabled={transactions.length === 0}
          >
            Export
          </button>
          <button 
            className="add-button"
            onClick={() => setShowAddModal(true)}
          >
            Add Donation
          </button>
        </div>
      </div>

      {/* Add message alert banner */}
      {actionMessage && (
        <div 
          className={`action-message ${actionMessage.type}`}
          style={{
            padding: '10px 20px',
            borderRadius: '4px',
            margin: '10px 0',
            backgroundColor: actionMessage.type === 'success' ? '#d4edda' : '#f8d7da',
            color: actionMessage.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${actionMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            textAlign: 'center',
            position: 'relative',
            fontWeight: '500'
          }}
        >
          {actionMessage.text}
          <span 
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              fontSize: '18px'
            }}
            onClick={() => setActionMessage(null)}
          >
            &times;
          </span>
        </div>
      )}

      {activeView === 'verified' ? (
        <>
          <div className="stats-grid">
            <div className="stat-card total">
              <h3 className="stat-title">Total Verified Donations</h3>
              <p className="stat-value">₱{calculateVerifiedTotal()}</p>
            </div>
            <div className="stat-card monthly">
              <h3 className="stat-title">This Month (Verified)</h3>
              <p className="stat-value">₱{calculateVerifiedMonthlyTotal()}</p>
            </div>
            <div className="stat-card pending">
              <h3 className="stat-title">Pending Verification</h3>
              <p className="stat-value">₱{calculatePendingTotal()}</p>
            </div>
            </div>

          <div className="bank-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Donor Name</th>
                  <th>Payment Method</th> {/* Add payment method header */}
                  <th>Proof</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {renderTransactions()}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bank-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Donor Name</th>
                <th>Payment Method</th> {/* Add payment method header */}
                <th>Proof</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {renderTransactions()}
            </tbody>
          </table>
        </div>
      )}

      {/* Add pagination footer */}
      <footer className="pagination">
        <div className="pagination-controls">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="page-nav"
          >
            &lt;
          </button>
          {renderPageNumbers()}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === Math.ceil(transactions.filter(t => 
              activeView === 'verified' ? 
                t.verificationStatus === 'verified' : 
                t.verificationStatus === 'pending'
            ).length / rowsPerPage)}
            className="page-nav"
          >
            &gt;
          </button>
        </div>
        <div className="rows-per-page">
          <select value={rowsPerPage} onChange={handleRowsPerPageChange}>
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
          </select>
        </div>
      </footer>

      {/* Donor Details Modal */}
      {showModal && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Donor Details</h2>
              <button className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-group">
                <label>Full Name:</label>
                <p>{selectedTransaction.fullName}</p>
              </div>
              <div className="detail-group">
                <label>Email:</label>
                <p>{selectedTransaction.email}</p>
              </div>
              <div className="detail-group">
                <label>Contact Number:</label>
                <p>{selectedTransaction.contactNumber}</p>
              </div>
              <div className="detail-group">
                <label>Amount:</label>
                <p>₱{selectedTransaction.amount}</p>
              </div>
              {/* Add payment method to details modal */}
              <div className="detail-group">
                <label>Payment Method:</label>
                <p>{selectedTransaction.paymentMethod || 'N/A'}</p>
              </div>
              <div className="detail-group">
                <label>Date:</label>
                <p>{new Date().toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}</p>
              </div>
              {selectedTransaction.message && (
                <div className="detail-group">
                  <label>Message:</label>
                  <p>{selectedTransaction.message}</p>
                </div>
              )}
              {selectedTransaction.proofOfPayment && (
                <div className="detail-group">
                  <label>Proof of Payment:</label>
                  <div className="proof-preview">
                    <img 
                      src={selectedTransaction.proofOfPayment} 
                      alt="Proof of Payment"
                      style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', cursor: 'pointer' }}
                      onClick={() => handleViewProof(selectedTransaction.proofOfPayment!)}
                    />
                  </div>
                </div>
              )}
              {selectedTransaction.verificationStatus === 'verified' && (
                <div className="detail-group">
                  <label>Verified By:</label>
                  <p>{selectedTransaction.verifiedBy} on {selectedTransaction.verifiedAt}</p>
                </div>
              )}
              {selectedTransaction.verificationStatus === 'verified' && (
                <div className="detail-group">
                  <label>Certificate Status:</label>
                  <p>
                    {selectedTransaction.certificate_sent ? 
                      `Certificate sent on ${selectedTransaction.certificate_sent_at ? formatDate(selectedTransaction.certificate_sent_at) : 'Unknown date'}` : 
                      'Certificate not sent yet'}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selectedTransaction.verificationStatus === 'verified' && 
               selectedTransaction.email && (
                <button 
                  className="certificate-button"
                  onClick={() => {
                    setShowModal(false);
                    handleSendCertificate(selectedTransaction.id);
                  }}
                  disabled={sendingCertificateIds.has(selectedTransaction.id)}
                >
                  {sendingCertificateIds.has(selectedTransaction.id) ? 'Sending...' : 
                    selectedTransaction.certificate_sent ? 'Resend Certificate' : 'Send Certificate'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Proof of Payment Modal */}
      {showProofModal && selectedProof && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Proof of Payment</h2>
              <button className="close-button" onClick={() => setShowProofModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <img 
                src={selectedProof} 
                alt="Proof of Payment" 
                style={{ maxWidth: '100%', height: 'auto', marginBottom: '1rem' }}
                onError={(e) => {
                  console.error("Error loading image:", selectedProof);
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite loop
                  target.src = `${API_BASE_URL}/images/placeholder-image.jpg`;
                  target.alt = "Failed to load proof of payment";
                }}
              />
              {selectedMessage && (
                <div className="proof-message">
                  <h3>Donor Message:</h3>
                  <p>{selectedMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Donation Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="donation-modal-content">
            <div className="donation-modal-header">
              <h2 className="donation-modal-title">Add New Donation</h2>
            </div>
            <form onSubmit={handleAddDonation}>
              <div className="donation-form-group">
                <label>Full Name:</label>
                <input 
                  name="fullName" 
                  type="text" 
                  placeholder="Enter donor's full name"
                  required 
                />
              </div>
              <div className="donation-form-group">
                <label>Email:</label>
                <input 
                  name="email" 
                  type="email" 
                  placeholder="Enter donor's email address"
                  required 
                />
              </div>
              <div className="donation-form-group">
                <label>Contact Number:</label>
                <input 
                  name="contactNumber" 
                  type="tel" 
                  placeholder="Enter contact number"
                  required 
                />
              </div>
              <div className="donation-form-group">
                <label>Amount (PHP):</label>
                <input 
                  name="amount"
                  type="number"
                  placeholder="Enter donation amount"
                  required
                  min="1"
                  max="999999999.99"
                  step="0.01"
                />
              </div>
              {/* Add payment method dropdown */}
              <div className="donation-form-group">
                <label>Payment Method:</label>
                <select 
                  name="paymentMethod"
                  required
                  className="payment-method-select"
                >
                  <option value="">Select payment method</option>
                  <option value="gcash">GCash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="form-group">
                <label>Proof of Payment:</label>
                <input 
                  type="file"
                  id="proofOfPayment"
                  name="proofOfPayment"
                  accept="image/*"
                  onChange={(e) => {
                    const fileName = e.target.files?.[0]?.name;
                    const label = document.querySelector('label[for="proofOfPayment"]');
                    if (label && fileName) {
                      label.innerHTML = `<i class="fa fa-upload"></i><span class="file-name-truncate">${fileName}</span>`;
                    } else if (label) {
                      label.innerHTML = `<i class="fa fa-upload"></i><span class="file-name-truncate">Choose a file...</span>`;
                    }
                  }}
                />
                <label htmlFor="proofOfPayment">
                  <i className="fa fa-upload"></i> Choose a file...
                </label>
              </div>
              <div className="donation-form-group">
                <label>Message:</label>
                <textarea 
                  name="message"
                  placeholder="Enter any additional message or notes (optional)"
                ></textarea>
              </div>
              <div className="donation-modal-actions">
                <button type="button" className="donation-cancel-btn" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="donation-submit-btn">
                  Add Donation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bank;
