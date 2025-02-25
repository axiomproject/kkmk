import React, { useState, useEffect, useRef } from 'react';
import '../../styles/admin/AdminPages.css';
import api from '../../config/axios'; // Replace axios import
import { useNavigate } from 'react-router-dom';
import VolunteerViewModal from '../../components/modals/VolunteerViewModal';
import VolunteerEditForm from '../../components/forms/VolunteerEditForm';
import NewVolunteerForm from '../../components/forms/NewVolunteerForm';
import * as XLSX from 'xlsx';

interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  username: string;
  created_at: string;
  status: string;
  is_verified: boolean;
  date_of_birth?: string;
  last_login?: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc' | null;
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const Volunteer = () => {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('anytime');
  const navigate = useNavigate();
  const [viewModalVolunteer, setViewModalVolunteer] = useState<any>(null);
  const [editFormVolunteer, setEditFormVolunteer] = useState<any>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside a dropdown or on the dots button
      if (!target.closest('.dropdowns-content') && !target.closest('.dots-button')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    try {
      const response = await api.get('/admin/volunteers');
      
      // Debug the exact structure
      console.log('Raw data from API:', JSON.stringify(response.data, null, 2));

      const processedData = response.data.map((v: any) => {
        // Log individual volunteer data
        console.log('Individual volunteer raw data:', v);
        
        // Check all possible date field names
        const possibleDateFields = {
          created_at: v.created_at,
          createdAt: v.createdAt,
          createdat: v.createdat,
          createdDate: v.createdDate,
          created: v.created
        };
        console.log('Possible date fields:', possibleDateFields);

        return {
          ...v,
          // Try all possible date field variations
          created_at: v.created_at || v.createdAt || v.createdat || v.createdDate || v.created
        };
      });

      console.log('Processed data:', processedData);
      setVolunteers(processedData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching volunteers:', err);
      setError('Failed to fetch volunteers');
      setLoading(false);
    }
  };

const getDateFromFilter = (filter: string) => {
  const today = new Date();
  switch (filter) {
    case 'last7':
      const last7 = new Date();
      last7.setDate(today.getDate() - 7);
      return last7;
    case 'last30':
      const last30 = new Date();
      last30.setDate(today.getDate() - 30);
      return last30;
    default:
      return null;
  }
};

const handleSort = (key: string) => {
  let direction: 'asc' | 'desc' | null = 'asc';
  
  if (sortConfig.key === key) {
    if (sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.direction === 'desc') direction = null;
  }
  
  setSortConfig({ key, direction });
};

const getSortedVolunteers = (volunteers: Volunteer[]) => {
  if (!sortConfig.direction || !sortConfig.key) return volunteers;

  return [...volunteers].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof Volunteer] || '';
    const bValue = b[sortConfig.key as keyof Volunteer] || '';

    if (sortConfig.direction === 'asc') {
      return aValue < bValue ? -1 : 1;
    } else {
      return aValue > bValue ? -1 : 1;
    }
  });
};

const getSortIcon = (key: string) => {
  if (sortConfig.key !== key) return 'sort';
  if (sortConfig.direction === 'asc') return 'arrow_upward';
  if (sortConfig.direction === 'desc') return 'arrow_downward';
  return 'sort';
};

const filteredVolunteers = getSortedVolunteers(volunteers.filter(volunteer => {
  const searchLower = searchTerm.toLowerCase();
  const matchesSearch = 
    volunteer.name?.toLowerCase().includes(searchLower) ||
    volunteer.email?.toLowerCase().includes(searchLower) ||
    volunteer.phone?.toLowerCase().includes(searchLower) ||
    volunteer.username?.toLowerCase().includes(searchLower);

  if (dateFilter === 'anytime') {
    return matchesSearch;
  }

  const volunteerDate = new Date(volunteer.created_at);
  const today = new Date();
  
  switch (dateFilter) {
    case 'last7':
      const last7Days = new Date(today);
      last7Days.setDate(today.getDate() - 7);
      return matchesSearch && volunteerDate >= last7Days;
      
    case 'last30':
      const last7DaysForExclusion = new Date(today);
      last7DaysForExclusion.setDate(today.getDate() - 7);
      // Show all volunteers older than 7 days
      return matchesSearch && volunteerDate < last7DaysForExclusion;
      
    default:
      return matchesSearch;
  }
}));

  // Calculate pagination
  const totalPages = Math.ceil(filteredVolunteers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentVolunteers = filteredVolunteers.slice(startIndex, endIndex);

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

  const handleActionClick = (volunteerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === volunteerId ? null : volunteerId);
  };

  const handleAction = async (action: string, volunteer: any) => {
    try {
      switch (action) {
        case 'view':
          const viewResponse = await api.get(`/admin/volunteers/${volunteer.id}`);
          if (viewResponse.data) {
            setViewModalVolunteer(viewResponse.data);
          }
          break;

        case 'edit':
          // Format date for the edit form
          const formattedVolunteer = {
            ...volunteer,
            date_of_birth: volunteer.date_of_birth ? 
              new Date(volunteer.date_of_birth).toISOString().split('T')[0] : ''
          };
          setEditFormVolunteer(formattedVolunteer);
          break;

        case 'delete':
          if (window.confirm('Are you sure you want to delete this volunteer?')) {
            await api.delete(`/admin/volunteers/${volunteer.id}`);
            fetchVolunteers();
          }
          break;
      }
      setActiveDropdown(null);
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
      if (error.response) {
        console.error('Response error:', error.response.data);
        console.error('Status:', error.response.status);
      }
      setError(error.response?.data?.error || `Failed to ${action} volunteer`);
    }
  };
  

  const handleEditSubmit = async (formData: any) => {
    try {
      const response = await api.put(
        `/admin/volunteers/${editFormVolunteer.id}`,
        {
          ...formData,
          role: 'volunteer'  // Ensure role is included
        }
      );
      
      if (response.data) {
        setEditFormVolunteer(null);
        await fetchVolunteers();
      }
    } catch (error: any) {
      console.error('Error updating volunteer:', error);
      setError(error.response?.data?.error || 'Failed to update volunteer');
    }
  };

  const handleCreateVolunteer = async (formData: any) => {
    try {
      // Format the date for display before sending to server
      await api.post('/admin/volunteers', formData);
      setShowNewForm(false);
      await fetchVolunteers();
    } catch (error: any) {
      console.error('Error creating volunteer:', error);
      setError(error.response?.data?.error || 'Failed to create volunteer');
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      console.log('Current volunteers:', currentVolunteers); // Debug log
      const ids = currentVolunteers.map(volunteer => volunteer.id);
      console.log('Selected all IDs:', ids); // Debug log
      setSelectedItems(ids);
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (volunteerId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(volunteerId)) {
        return prev.filter(id => id !== volunteerId);
      } else {
        return [...prev, volunteerId];
      }
    });
  };

  const handleExport = () => {
    try {
      // Transform the data for export
      const exportData = volunteers.map(volunteer => ({
        'Full Name': volunteer.name,
        'Email': volunteer.email,
        'Username': volunteer.username,
        'Phone': volunteer.phone || 'N/A',
        'Date of Birth': formatDate(volunteer.date_of_birth || ''),
        'Status': volunteer.status,
        'Verified': volunteer.is_verified ? 'Yes' : 'No',
        'Last Login': volunteer.last_login ? formatDate(volunteer.last_login) : 'Never'
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Volunteers');

      // Generate file name with date
      const fileName = `volunteers_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data');
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedItems.length} volunteer(s)?`)) {
      try {
        console.log('Sending IDs for deletion:', selectedItems); // Debug log

        const response = await api.delete('/admin/volunteers/bulk', {
          data: { ids: selectedItems }
        });

        console.log('Bulk delete response:', response.data); // Debug log

        // Refresh volunteers list and clear selection
        await fetchVolunteers();
        setSelectedItems([]);
      } catch (error: any) {
        console.error('Error performing bulk delete:', error);
        console.error('Error details:', error.response?.data); // Debug log
        setError(error.response?.data?.error || error.message || 'Failed to delete volunteers');
      }
    }
  };

  const handleDateFilter = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setDateFilter(event.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="user-management-container">
      <header className="header">
        <h3 className='volunteer-title-admin'>Volunteer Management</h3>
        <div className="controls">
          {selectedItems.length > 0 && (
            <button className="bulk-delete-btn" onClick={handleBulkDelete}>
              Delete Selected ({selectedItems.length})
            </button>
          )}
          <input 
            type="text" 
            placeholder="Search by name, email, phone..." 
            className="search-input"
            value={searchTerm}
            onChange={handleSearch}
          />
          <select 
            className="filter"
            value={dateFilter}
            onChange={handleDateFilter}
          >
            <option value="anytime">Joined Anytime</option>
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
          </select>
          <button 
            className="export-btn" 
            onClick={handleExport}
            disabled={volunteers.length === 0}
          >
            Export
          </button>
          <button className="new-user-btn" onClick={() => setShowNewForm(true)}>
            + New User
          </button>
        </div>
      </header>

      {/* Show no results message if needed */}
      {filteredVolunteers.length === 0 && searchTerm && (
        <div className="no-results">
          No volunteers found matching "{searchTerm}"
        </div>
      )}
<div className="table-wrapper">
      <table className="user-table">
        <thead>
          <tr>
            <th>
              <input 
                type="checkbox" 
                className="styled-checkbox"
                checked={currentVolunteers.length > 0 && selectedItems.length === currentVolunteers.length}
                onChange={handleSelectAll}
              />
            </th>
            <th onClick={() => handleSort('name')} className="sortable-header">
              Full Name <span className="material-icons sort-icon">{getSortIcon('name')}</span>
            </th>
            <th onClick={() => handleSort('email')} className="sortable-header">
              Email Address <span className="material-icons sort-icon">{getSortIcon('email')}</span>
            </th>
            <th onClick={() => handleSort('phone')} className="sortable-header">
              Phone <span className="material-icons sort-icon">{getSortIcon('phone')}</span>
            </th>
            <th onClick={() => handleSort('status')} className="sortable-header">
              Status <span className="material-icons sort-icon">{getSortIcon('status')}</span>
            </th>
            <th onClick={() => handleSort('is_verified')} className="sortable-header">
              Verified <span className="material-icons sort-icon">{getSortIcon('is_verified')}</span>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentVolunteers.map((volunteer) => (
            <tr key={volunteer.id}>
              <td>
                <input 
                  type="checkbox" 
                  className="styled-checkbox"
                  checked={selectedItems.includes(volunteer.id)}
                  onChange={() => handleSelectItem(volunteer.id)}
                />
              </td>
              <td>{volunteer.name}</td>
              <td>{volunteer.email}</td>
              <td>{volunteer.phone || 'N/A'}</td>
              <td>{volunteer.status}</td>
              <td>{volunteer.is_verified ? 'Yes' : 'No'}</td>
              <td>
                <div className="dropdowns">
                  <button
                    className="dots-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === volunteer.id ? null : volunteer.id);
                    }}
                  >
                    
                  </button>
                  {activeDropdown === volunteer.id && (
                    <div className="dropdowns-content active">
                      <button 
                        className="dropdowns-item-admin view"
                        onClick={() => handleAction('view', volunteer)}
                      >
                        View
                      </button>
                      <button 
                        className="dropdowns-item-admin edit"
                        onClick={() => handleAction('edit', volunteer)}
                      >
                        Edit
                      </button>
                      <button 
                        className="dropdowns-item-admin delete"
                        onClick={() => handleAction('delete', volunteer)}
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

      {viewModalVolunteer && (
        <VolunteerViewModal
          volunteer={viewModalVolunteer}
          onClose={() => setViewModalVolunteer(null)}
        />
      )}

      {editFormVolunteer && (
        <VolunteerEditForm
          volunteer={editFormVolunteer}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditFormVolunteer(null)}
        />
      )}

      {showNewForm && (
        <NewVolunteerForm
          onSubmit={handleCreateVolunteer}
          onCancel={() => setShowNewForm(false)}
        />
      )}
    </div>
  );
};

export default Volunteer;