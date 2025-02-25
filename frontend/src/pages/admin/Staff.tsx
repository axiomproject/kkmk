import React, { useState, useEffect } from 'react';
import api from '../../config/axios'; // Replace axios import
import '../../styles/admin/AdminPages.css';
import * as XLSX from 'xlsx';
import StaffViewModal from '../../components/modals/StaffViewModal';
import StaffEditForm from '../../components/forms/StaffEditForm';
import NewStaffForm from '../../components/forms/NewStaffForm';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  department: string;
  phone: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc' | null;
}

const AdminStaff = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewModalStaff, setViewModalStaff] = useState<StaffMember | null>(null);
  const [editFormStaff, setEditFormStaff] = useState<StaffMember | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [dateFilter, setDateFilter] = useState('anytime');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  const fetchStaffMembers = async () => {
    try {
      const response = await api.get('/admin/staff');
      setStaffMembers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching staff members:', err);
      setError('Failed to fetch staff members');
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

  const getSortedStaff = (staff: StaffMember[]) => {
    if (!sortConfig.direction || !sortConfig.key) return staff;

    return [...staff].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof StaffMember] || '';
      const bValue = b[sortConfig.key as keyof StaffMember] || '';

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

  // Filter staff members based on search term and date filter
  const filteredStaff = getSortedStaff(staffMembers.filter(staff => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      staff.name?.toLowerCase().includes(searchLower) ||
      staff.email?.toLowerCase().includes(searchLower) ||
      staff.department?.toLowerCase().includes(searchLower) ||
      staff.phone?.toLowerCase().includes(searchLower);

    if (dateFilter === 'anytime') {
      return matchesSearch;
    }

    const staffDate = new Date(staff.created_at);
    const today = new Date();
    
    switch (dateFilter) {
      case 'last7':
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);
        return matchesSearch && staffDate >= last7Days;
        
      case 'last30':
        const last7DaysForExclusion = new Date(today);
        last7DaysForExclusion.setDate(today.getDate() - 7);
        // Show all staff older than 7 days
        return matchesSearch && staffDate < last7DaysForExclusion;
        
      default:
        return matchesSearch;
    }
  }));

  const handleDateFilter = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setDateFilter(event.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredStaff.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentStaff = filteredStaff.slice(startIndex, endIndex);

  const handleExport = () => {
    const exportData = staffMembers.map(staff => ({
      'Full Name': staff.name,
      'Email': staff.email,
      'Department': staff.department,
      'Phone': staff.phone || 'N/A',
      'Status': staff.status,
      'Created At': new Date(staff.created_at).toLocaleDateString(),
      'Last Login': staff.last_login ? new Date(staff.last_login).toLocaleDateString() : 'Never'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Members');
    XLSX.writeFile(wb, `staff_members_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const ids = currentStaff.map(staff => staff.id);
      setSelectedItems(ids);
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (staffId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      } else {
        return [...prev, staffId];
      }
    });
  };

  const handleBulkDelete = async () => {
    if (!selectedItems.length || !window.confirm(`Delete ${selectedItems.length} staff member(s)?`)) return;
    
    try {
      await api.delete('/admin/staff/bulk', {
        data: { ids: selectedItems }
      });
      await fetchStaffMembers();
      setSelectedItems([]);
    } catch (error: any) {
      console.error('Error performing bulk delete:', error);
      setError(error.response?.data?.error || 'Failed to delete staff members');
    }
  };

  const handleAction = async (action: string, staff: StaffMember) => {
    try {
      switch (action) {
        case 'view':
          const viewResponse = await api.get(`/admin/staff/${staff.id}`);
          if (viewResponse.data) {
            setViewModalStaff(viewResponse.data);
          }
          break;

        case 'edit':
          setEditFormStaff(staff);
          break;

        case 'delete':
          if (window.confirm('Are you sure you want to delete this staff member?')) {
            await api.delete(`/admin/staff/${staff.id}`);
            fetchStaffMembers();
          }
          break;
      }
      setActiveDropdown(null);
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
      setError(error.response?.data?.error || `Failed to ${action} staff member`);
    }
  };

  const handleEditSubmit = async (formData: any) => {
    try {
      await api.put(`/admin/staff/${editFormStaff?.id}`, formData);
      setEditFormStaff(null);
      await fetchStaffMembers();
    } catch (error: any) {
      console.error('Error updating staff:', error);
      setError(error.response?.data?.error || 'Failed to update staff member');
    }
  };

  const handleCreateStaff = async (formData: any) => {
    try {
      await api.post('/admin/staff', formData);
      setShowNewForm(false);
      await fetchStaffMembers();
    } catch (error: any) {
      console.error('Error creating staff:', error);
      setError(error.response?.data?.error || 'Failed to create staff member');
    }
  };

  // Add this renderPageNumbers function
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

  // Add this handler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="user-management-container">
      <header className="header">
        <h3 className='volunteer-title-admin'>Staff Management</h3>
        <div className="controls">
          {selectedItems.length > 0 && (
            <button className="bulk-delete-btn" onClick={handleBulkDelete}>
              Delete Selected ({selectedItems.length})
            </button>
          )}
          <input 
            type="text" 
            placeholder="Search by name, email, department..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
            disabled={staffMembers.length === 0}
          >
            Export
          </button>
          <button className="new-user-btn" onClick={() => setShowNewForm(true)}>
            + New Staff
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
                  checked={selectedItems.length === staffMembers.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th onClick={() => handleSort('name')} className="sortable-header">
                Full Name <span className="material-icons sort-icon">{getSortIcon('name')}</span>
              </th>
              <th onClick={() => handleSort('email')} className="sortable-header">
                Email Address <span className="material-icons sort-icon">{getSortIcon('email')}</span>
              </th>
              <th onClick={() => handleSort('department')} className="sortable-header">
                Department <span className="material-icons sort-icon">{getSortIcon('department')}</span>
              </th>
              <th onClick={() => handleSort('phone')} className="sortable-header">
                Phone <span className="material-icons sort-icon">{getSortIcon('phone')}</span>
              </th>
              <th onClick={() => handleSort('status')} className="sortable-header">
                Status <span className="material-icons sort-icon">{getSortIcon('status')}</span>
              </th>
              <th onClick={() => handleSort('last_login')} className="sortable-header">
                Last Login <span className="material-icons sort-icon">{getSortIcon('last_login')}</span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentStaff.map((staff) => (
              <tr key={staff.id}>
                <td>
                  <input 
                    type="checkbox" 
                    className="styled-checkbox"
                    checked={selectedItems.includes(staff.id)}
                    onChange={() => handleSelectItem(staff.id)}
                  />
                </td>
                <td>{staff.name}</td>
                <td>{staff.email}</td>
                <td>{staff.department || 'N/A'}</td>
                <td>{staff.phone || 'N/A'}</td>
                <td>{staff.status}</td>
                <td>{staff.last_login ? new Date(staff.last_login).toLocaleDateString() : 'Never'}</td>
                <td>
                  <div className="dropdowns">
                    <button
                      className="dots-button"
                      onClick={() => setActiveDropdown(activeDropdown === staff.id ? null : staff.id)}
                    >
                      
                    </button>
                    {activeDropdown === staff.id && (
                      <div className="dropdowns-content active">
                        <button 
                          className="dropdowns-item-admin view"
                          onClick={() => handleAction('view', staff)}
                        >
                          View
                        </button>
                        <button 
                          className="dropdowns-item-admin edit"
                          onClick={() => handleAction('edit', staff)}
                        >
                          Edit
                        </button>
                        <button 
                          className="dropdowns-item-admin delete"
                          onClick={() => handleAction('delete', staff)}
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

      {/* Pagination controls */}
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
          <select 
            value={rowsPerPage} 
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
          </select>
        </div>
      </footer>

      {/* Add modals and forms */}
      {viewModalStaff && (
        <StaffViewModal
          staff={viewModalStaff}
          onClose={() => setViewModalStaff(null)}
        />
      )}

      {editFormStaff && (
        <StaffEditForm
          staff={editFormStaff}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditFormStaff(null)}
        />
      )}

      {showNewForm && (
        <NewStaffForm
          onSubmit={handleCreateStaff}
          onCancel={() => setShowNewForm(false)}
        />
      )}
    </div>
  );
};

export default AdminStaff;
