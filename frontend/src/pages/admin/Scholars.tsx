import React, { useState, useEffect } from 'react';
import api from '../../config/axios'; // Replace axios import
import '../../styles/admin/AdminPages.css';
import * as XLSX from 'xlsx';
import ScholarViewModal from '../../components/modals/ScholarViewModal';
import ScholarEditForm from '../../components/forms/ScholarEditForm';
import NewScholarForm from '../../components/forms/NewScholarForm';

interface Scholar {
  id: string;
  name: string;
  username: string;
  phone?: string;
  status: string;
  created_at: string;
  is_verified: boolean;
  profile_photo?: string;
  date_of_birth?: string;
  last_login?: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc' | null;
}

const ScholarManagement = () => {
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState('anytime');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
  const [viewModalScholar, setViewModalScholar] = useState<any>(null);
  const [editFormScholar, setEditFormScholar] = useState<any>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [formError, setFormError] = useState<{ field?: string, detail?: string } | null>(null);
  
  // Add more state for modals and forms as needed

  const fetchScholars = async () => {
    try {
      const response = await api.get('/admin/scholars');
      setScholars(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching scholars:', err);
      setError('Failed to fetch scholars');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScholars();
  }, []);

  // Sorting functions
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return 'sort';
    if (sortConfig.direction === 'asc') return 'arrow_upward';
    if (sortConfig.direction === 'desc') return 'arrow_downward';
    return 'sort';
  };

  // Date filtering
  const getDateFromFilter = (filter: string) => {
    const today = new Date();
    switch (filter) {
      case 'last7':
        const last7 = new Date(today);
        last7.setDate(today.getDate() - 7);
        return last7;
      case 'last30':
        const last30 = new Date(today);
        last30.setDate(today.getDate() - 30);
        return last30;
      default:
        return null;
    }
  };

  const getSortedScholars = (scholars: Scholar[]) => {
    if (!sortConfig.key || !sortConfig.direction) return scholars;

    return [...scholars].sort((a, b) => {
      let aValue = (a[sortConfig.key as keyof Scholar] || '').toString().toLowerCase();
      let bValue = (b[sortConfig.key as keyof Scholar] || '').toString().toLowerCase();

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  // Filtered and sorted scholars
  const filteredScholars = getSortedScholars(scholars.filter(scholar => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      scholar.name?.toLowerCase().includes(searchLower) ||
      scholar.username?.toLowerCase().includes(searchLower);

    // Apply approval filter
    const matchesApprovalFilter = 
      approvalFilter === 'all' || 
      (approvalFilter === 'approved' && scholar.is_verified) ||
      (approvalFilter === 'notapproved' && !scholar.is_verified);

    if (dateFilter === 'anytime') return matchesSearch && matchesApprovalFilter;

    const scholarDate = new Date(scholar.created_at);
    const filterDate = getDateFromFilter(dateFilter);
    
    return matchesSearch && matchesApprovalFilter && filterDate && scholarDate >= filterDate;
  }));

  // Pagination
  const totalPages = Math.ceil(filteredScholars.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentScholars = filteredScholars.slice(startIndex, endIndex);

  // Event handlers
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedItems(currentScholars.map(scholar => scholar.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedItems.length || !window.confirm(`Delete ${selectedItems.length} scholar(s)?`)) return;
    
    try {
      const numericIds = selectedItems.map(Number).filter(id => !isNaN(id));
      await api.post('/admin/scholars/bulk-delete', { ids: numericIds });
      await fetchScholars();
      setSelectedItems([]);
    } catch (error: any) {
      console.error('Error performing bulk delete:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.error || 'Failed to delete scholars');
    }
  };

  // Export functionality
  const handleExport = () => {
    const exportData = scholars.map(scholar => ({
      'Full Name': scholar.name,
      'Username': scholar.username,
      'Phone': scholar.phone || 'N/A',
      'Status': scholar.status,
      'Approved': scholar.is_verified ? 'Yes' : 'No',
      'Created At': new Date(scholar.created_at).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Scholars');
    XLSX.writeFile(wb, `scholars_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Add this function before the return statement
  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      return [...prev, id];
    });
  };

  const handleActionClick = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const handleAction = async (action: string, scholar: any) => {
    try {
      switch (action) {
        case 'view':
          try {
            // Fetch the full scholar data with all fields, just like we do for edit
            const viewResponse = await api.get(`/admin/scholars/${scholar.id}`);
            if (viewResponse.data) {
              console.log("Scholar data for view:", viewResponse.data);
              setViewModalScholar(viewResponse.data);
            }
          } catch (error) {
            console.error("Error fetching scholar details for view:", error);
            throw new Error("Failed to load scholar details for viewing");
          }
          break;

        case 'edit':
          try {
            // Fetch the full scholar data with all name fields
            const response = await api.get(`/admin/scholars/${scholar.id}`);
            if (response.data) {
              const scholarData = response.data;
              
              // Format date for the form
              const formattedScholar = {
                ...scholarData,
                date_of_birth: scholarData.date_of_birth ? 
                  new Date(scholarData.date_of_birth).toISOString().split('T')[0] : ''
              };
              
              console.log("Scholar data for edit:", formattedScholar);
              setEditFormScholar(formattedScholar);
            }
          } catch (error) {
            console.error("Error fetching scholar details for edit:", error);
            throw new Error("Failed to load scholar details for editing");
          }
          break;

        case 'approve':
          if (window.confirm('Are you sure you want to approve this scholar?')) {
            try {
              await api.put(`/admin/scholars/${scholar.id}/approve`, 
                { is_verified: true },
                { 
                  headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json' 
                  } 
                }
              );
              alert('Scholar approved successfully!');
              await fetchScholars();
            } catch (error: any) {
              console.error('Approval error:', error.response?.data);
              throw new Error(error.response?.data?.details || 'Failed to approve scholar');
            }
          }
          break;

        case 'revoke':
          if (window.confirm('Are you sure you want to revoke this scholar\'s verification?')) {
            try {
              await api.put(`/admin/scholars/${scholar.id}/approve`, 
                { is_verified: false },
                { 
                  headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json' 
                  } 
                }
              );
              alert('Scholar verification revoked successfully!');
              await fetchScholars();
            } catch (error: any) {
              console.error('Revocation error:', error.response?.data);
              throw new Error(error.response?.data?.details || 'Failed to revoke scholar verification');
            }
          }
          break;

        case 'delete':
          if (window.confirm('Are you sure you want to delete this scholar? This will also delete all associated data.')) {
            try {
              await api.delete(`/admin/scholars/${scholar.id}`);
              await fetchScholars();
            } catch (error: any) {
              console.error('Delete error:', error.response?.data);
              throw new Error(error.response?.data?.details || 'Failed to delete scholar');
            }
          }
          break;
      }
      setActiveDropdown(null);
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
      setError(error.message || `Failed to ${action} scholar`);
      // Display error to user
      alert(error.message || `Failed to ${action} scholar`);
    }
  };

  const handleEditSubmit = async (formData: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token found');

      await api.put(
        `/admin/scholars/${editFormScholar.id}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setEditFormScholar(null);
      await fetchScholars();
    } catch (error: any) {
      console.error('Error updating scholar:', error);
      setError(error.response?.data?.error || 'Failed to update scholar');
    }
  };

  const handleCreateScholar = async (formData: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token found');

      // Reset form error
      setFormError(null);
      setError('');

      // Include all fields from the form including the separated name fields
      const scholarData = {
        first_name: formData.first_name,
        middle_name: formData.middle_name || null,
        last_name: formData.last_name,
        name_extension: formData.name_extension || null,
        name: formData.name, // Keep for backward compatibility
        username: formData.username,
        password: formData.password,
        email: formData.email,
        phone: formData.phone || null,
        status: formData.status,
        is_verified: formData.is_verified,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender,
        guardian_name: formData.guardian_name || null,
        guardian_phone: formData.guardian_phone || null,
        address: formData.address || null,
        education_level: formData.education_level || null,
        school: formData.school || null,
        parents_income: formData.parents_income || null,
        role: 'scholar'
      };

      console.log('Sending scholar data:', scholarData);

      await api.post(
        '/admin/scholars',
        scholarData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setShowNewForm(false);
      await fetchScholars();
    } catch (error: any) {
      console.error('Error creating scholar:', error);
      console.error('Error details:', error.response?.data);
      
      // Enhanced error handling for specific error types
      if (error.response?.status === 409) {
        // Handle duplicate username or email
        setFormError({
          field: error.response.data.field,
          detail: error.response.data.detail
        });
      } else {
        // Generic error
        setError(error.response?.data?.error || 'Failed to create scholar');
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(event.target.value));
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  const renderPageNumbers = () => {
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

  return (
    <div className="user-management-container">
      <header className="header">
        <h3 className='volunteer-title-admin'>Scholar Management</h3>
        <div className="controls">
          {selectedItems.length > 0 && (
            <button className="bulk-delete-btn" onClick={handleBulkDelete}>
              Delete Selected ({selectedItems.length})
            </button>
          )}
          <input 
            type="text" 
            placeholder="Search by name, username, school..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {/* Move the filter tabs here, before the joined anytime dropdown */}
          <div className="filter-tabs-container">
            <button 
              className={`filter-tab ${approvalFilter === 'all' ? 'active' : ''}`}
              onClick={() => setApprovalFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-tab ${approvalFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setApprovalFilter('approved')}
            >
              Approved
            </button>
            <button 
              className={`filter-tab ${approvalFilter === 'notapproved' ? 'active' : ''}`}
              onClick={() => setApprovalFilter('notapproved')}
            >
              Not Approved
            </button>
          </div>
          
          <select 
            className="filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="anytime">Joined Anytime</option>
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
          </select>
          <button 
            className="export-btn" 
            onClick={handleExport}
            disabled={scholars.length === 0}
          >
            Export
          </button>
          <button className="new-user-btn" onClick={() => setShowNewForm(true)}>
            + New Scholar
          </button>
        </div>
      </header>
      
      <div className="table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox" 
                  className="styled-checkbox"
                  checked={currentScholars.length > 0 && selectedItems.length === currentScholars.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th onClick={() => handleSort('name')} className="sortable-header">
                Full Name <span className="material-icons sort-icon">{getSortIcon('name')}</span>
              </th>
              <th onClick={() => handleSort('username')} className="sortable-header">
                Username <span className="material-icons sort-icon">{getSortIcon('username')}</span>
              </th>
              <th onClick={() => handleSort('phone')} className="sortable-header">
                Phone <span className="material-icons sort-icon">{getSortIcon('phone')}</span>
              </th>
              <th onClick={() => handleSort('status')} className="sortable-header">
                Status <span className="material-icons sort-icon">{getSortIcon('status')}</span>
              </th>
              <th onClick={() => handleSort('is_verified')} className="sortable-header">
                Approved <span className="material-icons sort-icon">{getSortIcon('is_verified')}</span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentScholars.map((scholar) => (
              <tr key={scholar.id}>
                <td>
                  <input 
                    type="checkbox" 
                    className="styled-checkbox"
                    checked={selectedItems.includes(scholar.id)}
                    onChange={() => handleSelectItem(scholar.id)}
                  />
                </td>
                <td>{scholar.name}</td>
                <td>{scholar.username}</td>
                <td>{scholar.phone || 'N/A'}</td>
                <td>
                  
                    {scholar.status}
                 
                </td>
                <td>{scholar.is_verified ? 'Yes' : 'No'}</td>
                <td>
                  <div className="dropdowns">
                    <button
                      className="dots-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === scholar.id ? null : scholar.id);
                      }}
                    >
                      
                    </button>
                    {activeDropdown === scholar.id && (
                      <div className="dropdowns-content active">
                 
                     
                        {scholar.is_verified === false && (
                          <button 
                            className="dropdowns-item-admin approve"
                            onClick={() => handleAction('approve', scholar)}
                          >
                            Approve
                          </button>
                        )}
                        {scholar.is_verified === true && (
                          <button 
                            className="dropdowns-item-admin revoke"
                            onClick={() => handleAction('revoke', scholar)}
                          >
                            <span className="material-icons">cancel</span> Revoke
                          </button>
                        )}
                        <button 
                          className="dropdowns-item-admin view"
                          onClick={() => handleAction('view', scholar)}
                        >
                          View
                        </button>
                        <button 
                          className="dropdowns-item-admin edit"
                          onClick={() => handleAction('edit', scholar)}
                        >
                          Edit
                        </button>
                        <button 
                          className="dropdowns-item-admin delete"
                          onClick={() => handleAction('delete', scholar)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
            disabled={currentPage === totalPages}
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

      {/* Add modals and forms */}
      {viewModalScholar && (
        <ScholarViewModal
          scholar={viewModalScholar}
          onClose={() => setViewModalScholar(null)}
        />
      )}

      {editFormScholar && (
        <ScholarEditForm
          scholar={editFormScholar}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditFormScholar(null)}
        />
      )}

      {showNewForm && (
        <NewScholarForm
          onSubmit={handleCreateScholar}
          onCancel={() => {
            setShowNewForm(false);
            setFormError(null); // Clear any form errors when closing
          }}
          submitError={formError}
        />
      )}
    </div>
  );
};

export default ScholarManagement;
