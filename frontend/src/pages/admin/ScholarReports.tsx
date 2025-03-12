import React, { useState, useEffect, useRef } from 'react';
import api from '../../config/axios'; // Replace axios import
import '../../styles/ScholarReports.css';
import { FaGraduationCap, FaSchool, FaUniversity, FaBookReader, FaUserGraduate } from 'react-icons/fa';

interface ReportCard {
  id: number;
  user_id: number;
  front_image: string;
  back_image: string;
  grade_level: string; // Make sure this property exists
  status: 'pending' | 'in_review' | 'verified' | 'rejected';
  verification_step: number;
  submitted_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

interface GradeLevelGroup {
  label: string;
  reports: ReportCard[];
}

interface ReportCardHistory {
  history_id: number;
  report_card_id: number;
  user_id: number;
  grade_level: string;
  status: string;
  verification_step: number;
  submitted_at: string;
  archived_at: string;
  school_year: string;
  renewal_reason: string;
}

const ScholarReports: React.FC = () => {
  const [activeView, setActiveView] = useState<'all' | 'pending' | 'in_review' | 'verified' | 'rejected' | 'by-grade'>('all');
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportCard | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [printView, setPrintView] = useState(false);
  const [reportToPrint, setReportToPrint] = useState<ReportCard | null>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const frontImageRef = useRef<HTMLImageElement>(null);
  const backImageRef = useRef<HTMLImageElement>(null);
  const [gradeLevelGroups, setGradeLevelGroups] = useState<GradeLevelGroup[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [reportCardHistory, setReportCardHistory] = useState<ReportCardHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Grade level display names mapping
  const gradeLevelLabels: {[key: string]: string} = {
    'grade1': 'Grade 1',
    'grade2': 'Grade 2',
    'grade3': 'Grade 3',
    'grade4': 'Grade 4',
    'grade5': 'Grade 5',
    'grade6': 'Grade 6',
    'grade7': 'Grade 7 (Junior High)',
    'grade8': 'Grade 8 (Junior High)',
    'grade9': 'Grade 9 (Junior High)',
    'grade10': 'Grade 10 (Junior High)',
    'grade11': 'Grade 11 (Senior High)',
    'grade12': 'Grade 12 (Senior High)',
    'college': 'College',
  };

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // When reports change, organize them by grade level
    organizeByGradeLevel();
  }, [reports]);

  const loadReports = async () => {
    try {
      const { data } = await api.get('/scholars/report-cards/all');
      setReports(data);
    } catch (error) {
      console.error('Error loading report cards:', error);
    }
  };

  const organizeByGradeLevel = () => {
    // Only use verified reports for grade level organization
    const verifiedReports = reports.filter(report => report.status === 'verified');
    
    // Create a map to group by grade level
    const groupMap: {[key: string]: ReportCard[]} = {};
    
    verifiedReports.forEach(report => {
      const gradeLevel = report.grade_level || 'unknown';
      if (!groupMap[gradeLevel]) {
        groupMap[gradeLevel] = [];
      }
      groupMap[gradeLevel].push(report);
    });
    
    // Convert map to array and sort by grade level
    const groups: GradeLevelGroup[] = Object.entries(groupMap).map(([key, reports]) => ({
      label: gradeLevelLabels[key] || key,
      reports
    }));
    
    // Sort the groups by grade level (assuming grade levels are named consistently)
    groups.sort((a, b) => {
      // Sort college at the end
      if (a.label.toLowerCase().includes('college')) return 1;
      if (b.label.toLowerCase().includes('college')) return -1;
      
      // Extract grade numbers and compare
      const aMatch = a.label.match(/grade(\d+)/i);
      const bMatch = b.label.match(/grade(\d+)/i);
      
      if (aMatch && bMatch) {
        return parseInt(aMatch[1]) - parseInt(bMatch[1]);
      }
      
      return a.label.localeCompare(b.label);
    });
    
    setGradeLevelGroups(groups);
  };

  const handleSetInReview = async (id: number, userName: string | undefined) => {
    try {
      await api.put(`/scholars/report-cards/${id}/review`);
      await loadReports();
      alert(`Report card for ${userName || 'scholar'} is now being reviewed. A notification has been sent to the scholar.`);
    } catch (error) {
      console.error('Error setting report card to review status:', error);
      alert('Failed to update report card status');
    }
  };

  const handleVerify = async (id: number, userName: string | undefined) => {
    try {
      await api.put(`/scholars/report-cards/${id}/verify`);
      await loadReports();
      alert(`Report card for ${userName || 'scholar'} has been verified successfully! A notification has been sent to the scholar.`);
    } catch (error) {
      console.error('Error verifying report card:', error);
      alert('Failed to verify report card');
    }
  };

  const handleReject = async (id: number, userName: string | undefined) => {
    const reason = window.prompt('Please enter reason for rejection:');
    if (reason) {
      try {
        await api.put(`/scholars/report-cards/${id}/reject`, { reason });
        await loadReports();
        alert(`Report card for ${userName || 'scholar'} has been rejected. A notification with the reason has been sent to the scholar.`);
      } catch (error) {
        console.error('Error rejecting report card:', error);
        alert('Failed to reject report card');
      }
    }
  };

  const handleRenew = async (id: number, userName: string | undefined) => {
    if (window.confirm(`Are you sure you want to request ${userName || 'this scholar'} to submit a new report card? They will need to provide their grade level and upload new report card images.`)) {
      try {
        // Call the renewal endpoint
        await api.put(`/scholars/report-cards/${id}/renew`);
        
        // Refresh the reports list
        await loadReports();
        alert(`${userName || 'Scholar'} has been notified to submit a new report card. Their previous submissions will remain in the system until deleted.`);
      } catch (error) {
        console.error('Error requesting report card renewal:', error);
        alert('Failed to request report card renewal');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this report card? This action cannot be undone.')) {
      try {
        await api.delete(`/scholars/report-cards/${id}`);
        
        // Remove the deleted report from state
        setReports(prevReports => prevReports.filter(report => report.id !== id));
        
        // Also remove from grade level groups if applicable
        setGradeLevelGroups(prevGroups => 
          prevGroups.map(group => ({
            ...group,
            reports: group.reports.filter(report => report.id !== id)
          }))
        );
        
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

  const handlePrintReport = (report: ReportCard) => {
    setReportToPrint(report);
    setPrintView(true);
    setImagesLoaded(false);
    
    // Add a class to the body for print-specific styling
    document.body.classList.add('printing-report');
    
    // Wait for images to load before triggering print
    const checkImagesLoaded = () => {
      const frontLoaded = frontImageRef.current?.complete && frontImageRef.current.naturalHeight !== 0;
      const backLoaded = backImageRef.current?.complete && backImageRef.current.naturalHeight !== 0;
      
      if (frontLoaded && backLoaded) {
        setImagesLoaded(true);
        setTimeout(() => {
          window.print();
          // Reset print view after printing dialog is closed
          setTimeout(() => {
            setPrintView(false);
            setReportToPrint(null);
            document.body.classList.remove('printing-report');
          }, 500);
        }, 500);
      } else {
        setTimeout(checkImagesLoaded, 200);
      }
    };
    
    setTimeout(checkImagesLoaded, 200);
  };

  const handleViewHistory = async (userId: number, userName: string | undefined) => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get(`/scholars/report-card/${userId}/history`);
      setReportCardHistory(data);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Error loading report card history:', error);
      alert('Failed to load report card history');
    } finally {
      setLoadingHistory(false);
    }
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
    if (activeView === 'by-grade') return reports.filter(report => report.status === 'verified');
    return reports.filter(report => report.status === activeView);
  };

  // Add this helper function to get icon and color for grade levels
  const getGradeLevelInfo = (label: string) => {
    if (label.toLowerCase().includes('college')) {
      return {
        icon: <FaUniversity className="grade-level-icon" />,
        color: '#2c3e50'
      };
    } else if (label.toLowerCase().includes('senior')) {
      return {
        icon: <FaUserGraduate className="grade-level-icon" />,
        color: '#8e44ad'
      };
    } else if (label.toLowerCase().includes('junior')) {
      return {
        icon: <FaSchool className="grade-level-icon" />,
        color: '#2980b9'
      };
    } else if (label.match(/grade [7-9]/i)) {
      return {
        icon: <FaBookReader className="grade-level-icon" />,
        color: '#27ae60'
      };
    } else {
      return {
        icon: <FaGraduationCap className="grade-level-icon" />,
        color: '#e67e22'
      };
    }
  };

  // Update the renderGradeLevelSection function
  const renderGradeLevelSection = (group: GradeLevelGroup) => {
    const { icon, color } = getGradeLevelInfo(group.label);
    return (
      <div key={group.label} className="grade-level-section">
        <div className="grade-level-header" style={{ backgroundColor: color }}>
          {icon}
          <h3 className="grade-level-title">
            {group.label}
            <span className="scholar-count">({group.reports.length} scholars)</span>
          </h3>
        </div>
        <div className="grade-level-content">
          <div className="scholars-grid">
            {group.reports.map(report => (
              <div key={report.id} className="scholar-card">
                <div className="scholar-info">
                  <h4>{report.user_name}</h4>
                  <p className="submission-date">Submitted: {formatDate(report.submitted_at)}</p>
                </div>
                <div className="report-actions">
                  <button 
                    className="view-images-btn"
                    onClick={() => handleViewImage(report.front_image)}
                  >
                    View Front
                  </button>
                  <button 
                    className="view-images-btn"
                    onClick={() => handleViewImage(report.back_image)}
                  >
                    View Back
                  </button>
                </div>
                <div className="card-actions">
                  <button onClick={() => handleViewDetails(report)}>Details</button>
                  <button onClick={() => handlePrintReport(report)}>Print</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="scholar-reports-container">
      {/* Only show the main UI when not in print view */}
      {!printView && (
        <>
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
              <button 
                className={`status-button grade-level ${activeView === 'by-grade' ? 'active' : ''}`}
                onClick={() => setActiveView('by-grade')}
              >
                By Grade Level
              </button>
            </div>
          </div>

          {activeView === 'by-grade' ? (
            <div className="grade-level-container">
              {gradeLevelGroups.length === 0 ? (
                <div className="no-reports-message">
                  <p>No verified report cards found. Verify some report cards to see them organized by grade level.</p>
                </div>
              ) : (
                <div className="grade-level-groups">
                  {gradeLevelGroups.map(renderGradeLevelSection)}
                </div>
              )}
            </div>
          ) : (
            <div className="reports-table">
              <table>
                <thead>
                  <tr>
                    <th>Date Submitted</th>
                    <th>Scholar Name</th>
                    {activeView === 'verified' && <th>Grade Level</th>}
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
                      {activeView === 'verified' && (
                        <td>{gradeLevelLabels[report.grade_level] || report.grade_level || 'Unknown'}</td>
                      )}
                      <td>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(report.status) }}
                        >
                          {report.status.replace('_', ' ')} ({report.verification_step}/3)
                        </span>
                      </td>
                      <td>
                        <button className="image-view-button" onClick={() => handleViewImage(report.front_image)}>Front</button>
                        <button className="image-view-button" onClick={() => handleViewImage(report.back_image)}>Back</button>
                      </td>
                      <td>
                        {report.status === 'pending' ? (
                          <>
                            <button onClick={() => handleSetInReview(report.id, report.user_name)}>Set to Review</button>
                            <button onClick={() => handleReject(report.id, report.user_name)}>Reject</button>
                            <button onClick={() => handlePrintReport(report)} className="print-btn">Print</button>
                          </>
                        ) : report.status === 'in_review' ? (
                          <>
                            <button onClick={() => handleVerify(report.id, report.user_name)}>Verify</button>
                            <button onClick={() => handleReject(report.id, report.user_name)}>Reject</button>
                            <button onClick={() => handlePrintReport(report)} className="print-btn">Print</button>
                          </>
                        ) : (
                          <>
                            <button className="view-details-button" onClick={() => handleViewDetails(report)}>View Details</button>
                            <button onClick={() => handlePrintReport(report)} className="print-btn">Print</button>
                            {report.status === 'verified' && (
                              <button 
                                onClick={() => handleRenew(report.id, report.user_name)}
                                className="renew-btn"
                              >
                                Renew
                              </button>
                            )}
                            <button 
                              onClick={() => handleViewHistory(report.user_id, report.user_name)}
                              className="history-btn"
                            >
                              History
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
                <div className="modal-actions">
                  <button onClick={() => handlePrintReport(selectedReport)} className="print-btn">Print Report</button>
                  <button className="report-modal-close-button" onClick={() => setShowModal(false)}>Close</button>
                </div>
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

          {/* History Modal */}
          {showHistoryModal && (
            <div className="modal-overlay">
              <div className="modal-content history-modal">
                <h2>Report Card History</h2>
                {loadingHistory ? (
                  <p>Loading history...</p>
                ) : reportCardHistory.length === 0 ? (
                  <p>No previous report card submissions found.</p>
                ) : (
                  <div className="history-list">
                    <table>
                      <thead>
                        <tr>
                          <th>School Year</th>
                          <th>Grade Level</th>
                          <th>Status</th>
                          <th>Submitted</th>
                          <th>Archived</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportCardHistory.map(history => (
                          <tr key={history.history_id}>
                            <td>{history.school_year || 'N/A'}</td>
                            <td>{gradeLevelLabels[history.grade_level] || history.grade_level || 'Unknown'}</td>
                            <td>{history.status.replace('_', ' ')}</td>
                            <td>{formatDate(history.submitted_at)}</td>
                            <td>{formatDate(history.archived_at)}</td>
                            <td>{history.renewal_reason || 'Manual renewal'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button className="report-modal-close-button" onClick={() => setShowHistoryModal(false)}>Close</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Optimized print view - only visible when printing */}
      {printView && reportToPrint && (
        <div className="print-container" ref={printContainerRef}>
          {/* Single page with scholar info and both images */}
          <div className="print-page">
            <div className="print-header">
              <h1>Scholar Report Card</h1>
              <p className="print-date">Printed: {new Date().toLocaleDateString()}</p>
            </div>
            
            <div className="print-report-details">
              <h2>Scholar Information</h2>
              <p><strong>Name:</strong> {reportToPrint.user_name || 'N/A'}</p>
              <p><strong>Email:</strong> {reportToPrint.user_email || 'N/A'}</p>
              <p><strong>Submitted:</strong> {formatDate(reportToPrint.submitted_at)}</p>
              <p><strong>Status:</strong> {reportToPrint.status.replace('_', ' ')}</p>
              <p><strong>Verification Step:</strong> {reportToPrint.verification_step}/3</p>
            </div>
            
            <h3 className="print-images-title">Report Card Images</h3>
            
            {/* Container for both images side by side */}
            <div className="print-images-row">
              <div className="print-image-container">
                <h4>Front Side</h4>
                <img 
                  ref={frontImageRef}
                  src={reportToPrint.front_image} 
                  alt="Report Card Front"
                  onLoad={() => frontImageRef.current && console.log("Front image loaded")} 
                  onError={() => console.error("Error loading front image")}
                />
              </div>
              
              <div className="print-image-container">
                <h4>Back Side</h4>
                <img 
                  ref={backImageRef}
                  src={reportToPrint.back_image} 
                  alt="Report Card Back"
                  onLoad={() => backImageRef.current && console.log("Back image loaded")}
                  onError={() => console.error("Error loading back image")}
                />
              </div>
            </div>
            
            <div className="print-footer">
              <p>This document is confidential and intended only for administrative purposes.</p>
            </div>
          </div>
          
          {!imagesLoaded && (
            <div className="print-loading">Loading images for printing...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScholarReports;

// Add this CSS at the end of your existing CSS file or in ScholarReports.css
const styles = `
  .grade-level-section {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 24px;
    overflow: hidden;
  }

  .grade-level-header {
    display: flex;
    align-items: center;
    padding: 16px 24px;
    color: white;
    transition: all 0.3s ease;
  }

  .grade-level-header:hover {
    filter: brightness(1.1);
  }

  .grade-level-icon {
    font-size: 24px;
    margin-right: 12px;
  }

  .grade-level-title {
    margin: 0;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .scholar-count {
    font-size: 0.9rem;
    opacity: 0.9;
    font-weight: normal;
  }

  .scholars-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    padding: 20px;
  }

  .scholar-card {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 16px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .scholar-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .scholar-info h4 {
    margin: 0 0 8px 0;
    color: #2c3e50;
  }

  .submission-date {
    font-size: 0.85rem;
    color: #666;
    margin: 0 0 12px 0;
  }

  .report-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .view-images-btn {
    flex: 1;
    padding: 6px 12px;
    background: #f1f1f1;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .view-images-btn:hover {
    background: #e9ecef;
  }

  .card-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .card-actions button {
    padding: 8px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .card-actions .history-btn {
    background: #4a90e2;
    color: white;
  }

  .card-actions .renew-btn {
    background: #28a745;
    color: white;
  }

  .card-actions button:hover {
    filter: brightness(1.1);
  }
`;
