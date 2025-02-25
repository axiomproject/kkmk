import React, { useState, useEffect } from 'react';
import api from '../../config/axios'; // Replace axios import
import '../../styles/ScholarReports.css';

interface ReportCard {
  id: number;
  user_id: number;
  front_image: string;
  back_image: string;
  status: 'pending' | 'in_review' | 'verified' | 'rejected';
  verification_step: number;
  submitted_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

const ScholarReports: React.FC = () => {
  const [activeView, setActiveView] = useState<'all' | 'pending' | 'in_review' | 'verified' | 'rejected'>('all');
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportCard | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadReports = async () => {
    try {
      const { data } = await api.get('/scholars/report-cards/all');
      setReports(data);
    } catch (error) {
      console.error('Error loading report cards:', error);
    }
  };

  const handleVerify = async (id: number) => {
    try {
      await api.put(`/scholars/report-cards/${id}/verify`);
      await loadReports();
      alert('Report card verified successfully!');
    } catch (error) {
      console.error('Error verifying report card:', error);
      alert('Failed to verify report card');
    }
  };

  const handleReject = async (id: number) => {
    const reason = window.prompt('Please enter reason for rejection:');
    if (reason) {
      try {
        await api.put(`/scholars/report-cards/${id}/reject`, { reason });
        await loadReports();
        alert('Report card rejected successfully');
      } catch (error) {
        console.error('Error rejecting report card:', error);
        alert('Failed to reject report card');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this report card? This action cannot be undone.')) {
      try {
        await api.delete(`/scholars/report-cards/${id}`);
        
        // Remove the deleted report from state
        setReports(prevReports => prevReports.filter(report => report.id !== id));
        alert('Report card deleted successfully');
      } catch (error) {
        console.error('Error deleting report card:', error);
        alert('Failed to delete report card');
      }
    }
  };

  const handleViewDetails = (report: ReportCard) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const handleViewImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ffa500';
      case 'in_review': return '#3498db';
      case 'verified': return '#2ecc71';
      case 'rejected': return '#e74c3c';
      default: return '#666';
    }
  };

  const getFilteredReports = () => {
    if (activeView === 'all') return reports;
    return reports.filter(report => report.status === activeView);
  };

  return (
    <div className="scholar-reports-container">
      <div className="reports-header">
        <h1>Scholar Report Cards</h1>
        <div className="view-buttons">
          <button 
            className={activeView === 'all' ? 'active' : ''}
            onClick={() => setActiveView('all')}
          >
            All Reports
          </button>
          <button 
            className={`status-button pending ${activeView === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveView('pending')}
          >
            Pending ({reports.filter(r => r.status === 'pending').length})
          </button>
          <button 
            className={`status-button in-review ${activeView === 'in_review' ? 'active' : ''}`}
            onClick={() => setActiveView('in_review')}
          >
            In Review ({reports.filter(r => r.status === 'in_review').length})
          </button>
          <button 
            className={`status-button verified ${activeView === 'verified' ? 'active' : ''}`}
            onClick={() => setActiveView('verified')}
          >
            Verified ({reports.filter(r => r.status === 'verified').length})
          </button>
          <button 
            className={`status-button rejected ${activeView === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveView('rejected')}
          >
            Rejected ({reports.filter(r => r.status === 'rejected').length})
          </button>
        </div>
      </div>

      <div className="reports-table">
        <table>
          <thead>
            <tr>
              <th>Date Submitted</th>
              <th>Scholar Name</th>
              <th>Status</th>
              <th>Images</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredReports().map(report => (
              <tr key={report.id}>
                <td>{formatDate(report.submitted_at)}</td>
                <td>{report.user_name}</td>
                <td>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(report.status) }}
                  >
                    {report.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <button className="image-view-button" onClick={() => handleViewImage(report.front_image)}>Front</button>
                  <button className="image-view-button" onClick={() => handleViewImage(report.back_image)}>Back</button>
                </td>
                <td>
                  {report.status === 'pending' || report.status === 'in_review' ? (
                    <>
                      <button onClick={() => handleVerify(report.id)}>Verify</button>
                      <button onClick={() => handleReject(report.id)}>Reject</button>
                      <button 
                        onClick={() => handleDelete(report.id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="view-details-button" onClick={() => handleViewDetails(report)}>View Details</button>
                      <button 
                        onClick={() => handleDelete(report.id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedReport && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Report Card Details</h2>
            <div className="report-details">
              <p><strong>Scholar:</strong> {selectedReport.user_name}</p>
              <p><strong>Email:</strong> {selectedReport.user_email}</p>
              <p><strong>Submitted:</strong> {formatDate(selectedReport.submitted_at)}</p>
              <p><strong>Status:</strong> {selectedReport.status}</p>
              <p><strong>Verification Step:</strong> {selectedReport.verification_step}</p>
            </div>
            <div className="report-modal-close-button" onClick={() => setShowModal(false)}>Close</div>
          </div>
        </div>
      )}

      {showImageModal && selectedImage && (
        <div className="modal-overlay">
          <div className="modal-content">
            <img src={selectedImage} alt="Report Card" style={{ maxWidth: '100%' }} />
            <div className="report-modal-close-button" onClick={() => setShowImageModal(false)}>Close</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarReports;
