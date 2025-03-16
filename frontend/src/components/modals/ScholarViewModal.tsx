import React, { useState } from 'react';
import '../../styles/admin/Modals.css';

interface ScholarViewModalProps {
  scholar: any;
  onClose: () => void;
}

const ScholarViewModal = ({ scholar, onClose }: ScholarViewModalProps) => {
  // Debug log to check what data is arriving in view modal
  console.log("Scholar data received in ViewModal:", scholar);

  // State for document preview
  const [previewDoc, setPreviewDoc] = useState<{ url: string, type: string, title: string } | null>(null);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatLastLogin = (dateString: string) => {
    if (!dateString) return 'Never logged in';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  // Format name components for display
  const formatName = () => {
    // If we have separated name components, display them
    if (scholar.first_name || scholar.last_name) {
      const nameParts = [];
      if (scholar.first_name) nameParts.push(scholar.first_name);
      if (scholar.middle_name) nameParts.push(scholar.middle_name);
      if (scholar.last_name) nameParts.push(scholar.last_name);
      if (scholar.name_extension) nameParts.push(scholar.name_extension);
      
      return {
        fullName: scholar.name || nameParts.join(' '),
        firstName: scholar.first_name || 'N/A',
        middleName: scholar.middle_name || 'N/A',
        lastName: scholar.last_name || 'N/A',
        nameExtension: scholar.name_extension || 'N/A'
      };
    }
    
    // Fallback if no name components
    return {
      fullName: scholar.name || 'N/A',
      firstName: 'N/A',
      middleName: 'N/A',
      lastName: 'N/A',
      nameExtension: 'N/A'
    };
  };
  
  const nameInfo = formatName();

  // Parse document paths from JSON if available
  const getDocuments = () => {
    if (!scholar.document_paths) return null;
    
    try {
      // If it's already an object, use it directly
      if (typeof scholar.document_paths === 'object' && !Array.isArray(scholar.document_paths)) {
        return scholar.document_paths;
      }
      
      // Otherwise try to parse it from a JSON string
      return JSON.parse(scholar.document_paths);
    } catch (err) {
      console.error('Error parsing document paths:', err);
      return null;
    }
  };

  const documents = getDocuments();

  // Helper function to get document type from URL
  const getDocumentType = (url: string) => {
    if (!url) return 'unknown';
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) return 'image';
    return 'unknown';
  };

  // Helper function to get human-readable document name
  const getDocumentTitle = (key: string) => {
    switch (key) {
      case 'schoolRegistrationForm': return 'School Registration Form';
      case 'psaDocument': return 'PSA Birth Certificate';
      case 'parentsId': return 'Parent\'s ID';
      case 'reportCard': return 'Report Card/Grade Slip';
      default: return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }
  };

  // Handle document preview
  const handlePreviewDocument = (url: string, type: string, title: string) => {
    setPreviewDoc({ url, type, title });
  };

  // Close document preview
  const closePreview = () => {
    setPreviewDoc(null);
  };

  // Document preview modal
  const renderDocumentPreview = () => {
    if (!previewDoc) return null;

    return (
      <div className="document-preview-overlay" onClick={closePreview}>
        <div className="document-preview-content" onClick={e => e.stopPropagation()}>
          <div className="document-preview-header">
            <h3>{previewDoc.title}</h3>
            <button className="close-button" onClick={closePreview}>&times;</button>
          </div>
          <div className="document-preview-body">
            {previewDoc.type === 'image' ? (
              <img src={previewDoc.url} alt={previewDoc.title} className="document-preview-image" />
            ) : previewDoc.type === 'pdf' ? (
              <iframe 
                src={`${previewDoc.url}#toolbar=0`} 
                title={previewDoc.title} 
                className="document-preview-pdf"
              />
            ) : (
              <div className="document-preview-unsupported">
                <p>This document type cannot be previewed.</p>
                <a href={previewDoc.url} target="_blank" rel="noreferrer" className="download-link">
                  Download Document
                </a>
              </div>
            )}
          </div>
          <div className="document-preview-footer">
            <a href={previewDoc.url} download className="download-button">
              Download
            </a>
            <button className="close-btn" onClick={closePreview}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-contents scholar-edit-form" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Scholar Details</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body scholar-form">
          {/* Personal Information Section */}
          <div className="form-section">
            <div className="form-section-title">Personal Information</div>
            
            {/* Name fields - 4 columns in one row */}
            <div className="form-row">
              <div className="form-column">
                <div className="detail-group">
                  <label>First Name:</label>
                  <div className="detail-value">{nameInfo.firstName}</div>
                </div>
              </div>
              
              <div className="form-column">
                <div className="detail-group">
                  <label>Middle Name:</label>
                  <div className="detail-value">{nameInfo.middleName}</div>
                </div>
              </div>
              
              <div className="form-column">
                <div className="detail-group">
                  <label>Last Name:</label>
                  <div className="detail-value">{nameInfo.lastName}</div>
                </div>
              </div>
              
              <div className="form-column">
                <div className="detail-group">
                  <label>Name Extension:</label>
                  <div className="detail-value">{nameInfo.nameExtension}</div>
                </div>
              </div>
            </div>
            
            {/* Second row - Gender, DOB, Phone */}
            <div className="form-row">
              <div className="form-column">
                <div className="detail-group">
                  <label>Gender:</label>
                  <div className="detail-value">
                    {scholar.gender ? scholar.gender.charAt(0).toUpperCase() + scholar.gender.slice(1) : 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="form-column">
                <div className="detail-group">
                  <label>Date of Birth:</label>
                  <div className="detail-value">{formatDate(scholar.date_of_birth)}</div>
                </div>
              </div>
              
              <div className="form-column">
                <div className="detail-group">
                  <label>Phone:</label>
                  <div className="detail-value">{scholar.phone || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Account Information Section */}
          <div className="form-section">
            <div className="form-section-title">Account Information</div>
            <div className="form-row three-columns">
              <div className="form-column">
                <div className="detail-group">
                  <label>Username:</label>
                  <div className="detail-value">{scholar.username}</div>
                </div>
              </div>
              
              <div className="form-column">
                <div className="detail-group">
                  <label>Email:</label>
                  <div className="detail-value">{scholar.email}</div>
                </div>
              </div>
              
              <div className="form-column">
                <div className="detail-group">
                  <label>Status:</label>
                  <div className="detail-value">
                    <span className={`status-badge ${scholar.status}`}>{scholar.status}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-column">
                <div className="detail-group">
                  <label>Approved:</label>
                  <div className="detail-value">{scholar.is_verified ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Guardian Information */}
          <div className="form-section">
            <div className="form-section-title">Guardian Information</div>
            <div className="form-row">
              <div className="form-column">
                <div className="detail-group">
                  <label>Guardian Name:</label>
                  <div className="detail-value">{scholar.guardian_name || 'N/A'}</div>
                </div>
              </div>
              
              <div className="form-column">
                <div className="detail-group">
                  <label>Guardian Phone:</label>
                  <div className="detail-value">{scholar.guardian_phone || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-column full-width">
                <div className="detail-group">
                  <label>Address:</label>
                  <div className="detail-value">{scholar.address || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Education Information */}
          <div className="form-section">
            <div className="form-section-title">Education Information</div>
            <div className="form-row three-columns">
              <div className="form-column">
                <div className="detail-group">
                  <label>Education Level:</label>
                  <div className="detail-value">{scholar.education_level || 'N/A'}</div>
                </div>
              </div>
              
              <div className="form-column">
                <div className="detail-group">
                  <label>School:</label>
                  <div className="detail-value">{scholar.school || 'N/A'}</div>
                </div>
              </div>
              
              <div className="form-column">
                <div className="detail-group">
                  <label>Parents' Income:</label>
                  <div className="detail-value">{scholar.parents_income || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Documents Section - Only show if documents are available */}
          {documents && Object.keys(documents).length > 0 && (
            <div className="form-section">
              <div className="form-section-title">Required Documents</div>
              <div className="document-grid">
                {Object.entries(documents).map(([key, url]) => {
                  const documentType = getDocumentType(url as string);
                  const documentTitle = getDocumentTitle(key);
                  
                  return (
                    <div className="document-item" key={key}>
                      <div className="document-icon">
                        {documentType === 'pdf' ? (
                          <i className="material-icons">description</i>
                        ) : documentType === 'image' ? (
                          <i className="material-icons">image</i>
                        ) : (
                          <i className="material-icons">insert_drive_file</i>
                        )}
                      </div>
                      <div className="document-details">
                        <h4>{documentTitle}</h4>
                        <div className="document-actions">
                          <button 
                            className="view-document-btn"
                            onClick={() => handlePreviewDocument(url as string, documentType, documentTitle)}
                          >
                            View
                          </button>
                          <a 
                            href={url as string} 
                            download 
                            target="_blank" 
                            rel="noreferrer"
                            className="download-document-btn"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* System Information Section */}
          <div className="form-section">
            <div className="form-section-title">System Information</div>
            <div className="form-row">
              <div className="form-column">
                <div className="detail-group">
                  <label>Created At:</label>
                  <div className="detail-value">{formatDate(scholar.created_at)}</div>
                </div>
              </div>
              
              <div className="form-column">
                <div className="detail-group">
                  <label>Last Login:</label>
                  <div className="detail-value">{formatLastLogin(scholar.last_login)}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Buttons at bottom for consistency with edit form */}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
      {/* Document Preview Modal */}
      {renderDocumentPreview()}
    </div>
  );
};

export default ScholarViewModal;
