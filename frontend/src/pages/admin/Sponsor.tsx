import React, { useState, useEffect } from 'react';
import api from '../../config/axios'; // Replace axios import
import '../../styles/admin/AdminPages.css';
import * as XLSX from 'xlsx';
import SponsorViewModal from '../../components/modals/SponsorViewModal';
import SponsorEditForm from '../../components/forms/SponsorEditForm';
import NewSponsorForm from '../../components/forms/NewSponsorForm';

interface Sponsor {
  id: string;
  name: string;
  email: string;
  username: string;
  phone?: string;
  status: string;
  created_at: string;
  is_verified: boolean;
  is_active: boolean;
  profile_photo?: string;
  company_name?: string;
  website?: string;
  date_of_birth?: string;
  last_login?: string;
}

interface SortConfig {
    key: string;
    direction: 'asc' | 'desc' | null;
  }

const SponsorManagement = () => {
  const [sponsor, setSponsors] = useState<Sponsor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [dateFilter, setDateFilter] = useState('anytime');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
    const [viewModalSponsor, setViewModalSponsor] = useState<any>(null);
    const [editFormSponsor, setEditFormSponsor] = useState<any>(null);
    const [showNewForm, setShowNewForm] = useState(false);

  const fetchSponsors = async () => {
    try {
      const response = await api.get('/admin/sponsors');
      setSponsors(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching sponsors:', err);
      setError('Failed to fetch sponsors');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  const handleCreateSponsor = async (formData: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token found');

      const sponsorData = {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        name: formData.name,
        phone: formData.phone || null,
        status: formData.status,
        is_verified: formData.is_verified,
        date_of_birth: formData.date_of_birth || null,
        role: 'sponsor'
      };

      await api.post(
        '/admin/sponsors',
        sponsorData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setShowNewForm(false);
      await fetchSponsors();
    } catch (error: any) {
      console.error('Error creating sponsor:', error);
      setError(error.response?.data?.error || 'Failed to create sponsor');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedItems.length || !window.confirm(`Delete ${selectedItems.length} sponsor(s)?`)) return;

    try {
      const numericIds = selectedItems.map(id => parseInt(id)).filter(id => !isNaN(id));
      await api.post('/admin/sponsors/bulk-delete', { ids: numericIds });
      await fetchSponsors();
      setSelectedItems([]);
    } catch (error: any) {
      console.error('Error performing bulk delete:', error);
      setError(error.response?.data?.error || 'Failed to delete sponsors');
    }
  };

  const handleExport = () => {
    const exportData = sponsor.map(sponsor => ({
      'Full Name': sponsor.name,
      'Company': sponsor.company_name || 'N/A',
      'Email': sponsor.email,
      'Phone': sponsor.phone || 'N/A',
      'Website': sponsor.website || 'N/A',
      'Status': sponsor.status,
      'Created At': new Date(sponsor.created_at).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sponsors');
    XLSX.writeFile(wb, `sponsors_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      return [...prev, id];
    });
  };

  const handleAction = async (action: string, sponsor: any) => {
    try {
      switch (action) {
        case 'view':
          const viewResponse = await api.get(`/admin/sponsors/${sponsor.id}`);
          setViewModalSponsor(viewResponse.data);
          break;

        case 'edit':
          setEditFormSponsor(sponsor);
          break;

          case 'delete':
            if (window.confirm('Are you sure you want to delete this sponsor?')) {
              await api.delete(`/admin/sponsors/${sponsor.id}`);
              await fetchSponsors();
            }
            break;
      }
      setActiveDropdown(null);
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
      setError(error.response?.data?.error || `Failed to ${action} sponsor`);
    }
  };

  const handleEditSubmit = async (formData: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token found');

      await api.put(`/admin/sponsors/${editFormSponsor.id}`, formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setEditFormSponsor(null);
      await fetchSponsors();
    } catch (error: any) {
      console.error('Error updating sponsor:', error);
      setError(error.response?.data?.error || 'Failed to update sponsor');
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

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return 'sort';
    if (sortConfig.direction === 'asc') return 'arrow_upward';
    if (sortConfig.direction === 'desc') return 'arrow_downward';
    return 'sort';
  };

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

  const getSortedSponsors = (sponsors: Sponsor[]) => {
    if (!sortConfig.key || !sortConfig.direction) return sponsors;

    return [...sponsors].sort((a, b) => {
      let aValue = (a[sortConfig.key as keyof Sponsor] || '').toString().toLowerCase();
      let bValue = (b[sortConfig.key as keyof Sponsor] || '').toString().toLowerCase();

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const filteredSponsors = getSortedSponsors(sponsor.filter(sponsor => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      sponsor.name?.toLowerCase().includes(searchLower) ||
      sponsor.email?.toLowerCase().includes(searchLower) ||
      sponsor.company_name?.toLowerCase().includes(searchLower);

    if (dateFilter === 'anytime') return matchesSearch;

    const sponsorDate = new Date(sponsor.created_at);
    const filterDate = getDateFromFilter(dateFilter);
    
    return matchesSearch && filterDate && sponsorDate >= filterDate;
  }));

  const totalPages = Math.ceil(filteredSponsors.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentSponsors = filteredSponsors.slice(startIndex, endIndex);

   const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        setSelectedItems(currentSponsors.map(sponsor => sponsor.id));
      } else {
        setSelectedItems([]);
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
        <h3 className='volunteer-title-admin'>Sponsor Management</h3>
        <div className="controls">
          {selectedItems.length > 0 && (
            <button className="bulk-delete-btn" onClick={handleBulkDelete}>
              Delete Selected ({selectedItems.length})
            </button>
          )}
          <input 
            type="text" 
            placeholder="Search by name, email, company..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
            disabled={sponsor.length === 0}
          >
            Export
          </button>
          <button className="new-user-btn" onClick={() => setShowNewForm(true)}>
            + New Sponsor
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
        checked={currentSponsors.length > 0 && selectedItems.length === currentSponsors.length}
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
            {currentSponsors.map((sponsor) => (
              <tr key={sponsor.id}>
                <td>
                  <input 
                    type="checkbox" 
                    className="styled-checkbox"
                    checked={selectedItems.includes(sponsor.id)}
                    onChange={() => handleSelectItem(sponsor.id)}
                  />
                </td>
                <td>{sponsor.name}</td>
                <td>{sponsor.email}</td>
                <td>{sponsor.company_name || 'N/A'}</td>
                <td>
                  
                    {sponsor.status}
                  
                </td>
                <td>{sponsor.is_verified ? 'Yes' : 'No'}</td>
                <td>
                <div className="dropdowns">
                    <button
                      className="dots-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === sponsor.id ? null : sponsor.id);
                      }}
                    >
                      
                    </button>
                    {activeDropdown === sponsor.id && (
                      <div className="dropdowns-content active">
                        <button 
                          className="dropdowns-item-admin view"
                          onClick={() => handleAction('view', sponsor)}
                        >
                          View
                        </button>
                        <button 
                          className="dropdowns-item-admin edit"
                          onClick={() => handleAction('edit', sponsor)}
                        >
                          Edit
                        </button>
                        <button 
                          className="dropdowns-item-admin delete"
                          onClick={() => handleAction('delete', sponsor)}
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

      {/* Modals */}
      {viewModalSponsor && (
        <SponsorViewModal
          sponsor={viewModalSponsor}
          onClose={() => setViewModalSponsor(null)}
        />
      )}

      {editFormSponsor && (
        <SponsorEditForm
          sponsor={editFormSponsor}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditFormSponsor(null)}
        />
      )}

      {showNewForm && (
        <NewSponsorForm
          onSubmit={handleCreateSponsor}
          onCancel={() => setShowNewForm(false)}
        />
      )}
    </div>
  );
};

export default SponsorManagement;
