import React, { useState, useRef, useEffect } from 'react';
import '../../styles/Inventory.css';
import api from '../../config/axios'; // Replace axios import
import * as XLSX from 'xlsx'; // Add this import

interface BaseDonation {
  id: number;
  donatorName: string;
  email: string;
  contactNumber: string;
  item: string;
  quantity: number;
  category: string;
  lastUpdated: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt?: string;
  verifiedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

interface RegularDonation extends BaseDonation {
  frequency: 'monthly' | 'quarterly' | 'annually';
  type: 'regular';
}

interface InKindDonation extends BaseDonation {
  type: 'in-kind';
}

// Update the Scholar interface to only include necessary fields
interface Scholar {
  id: number;
  name: string;
  email: string;
  role: string; // Add role field
}

type DonationItem = RegularDonation | InKindDonation;

// Update ModalProps interface to properly type the onSubmit function
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: DonationItem;
  type: 'regular' | 'in-kind';
  onSubmit: (item: Omit<DonationItem, 'id' | 'lastUpdated'>) => void;
}

// Update DistributeModalProps
interface DistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DonationItem;
  onSubmit: (itemId: number, quantity: number, recipientId: number, recipientType: string) => void;
}

type FrequencyType = 'monthly' | 'quarterly' | 'annually';

const ItemModal: React.FC<ModalProps> = ({ isOpen, onClose, item, type, onSubmit }) => {
  const [formData, setFormData] = useState({
    donatorName: '',
    email: '',
    contactNumber: '',
    item: '',  // Changed from 'name' to 'item'
    quantity: 0,
    category: '',
    frequency: 'monthly' as FrequencyType,
    type: type // Add type field
  });

  // Reset form when modal opens or type/item changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        donatorName: item?.donatorName || '',
        email: item?.email || '',
        contactNumber: item?.contactNumber || '',
        item: item?.item || '',  // Changed from 'name' to 'item'
        quantity: item?.quantity || 0,
        category: item?.category || '',
        frequency: (item as RegularDonation)?.frequency || 'monthly',
        type: item?.type || type // Ensure type is always set
      });
    }
  }, [isOpen, item, type]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Create the correct type of item based on formData.type
    const submitData = formData.type === 'regular' 
      ? {
          donatorName: formData.donatorName,
          email: formData.email,
          contactNumber: formData.contactNumber,
          item: formData.item,
          quantity: formData.quantity,
          category: formData.category,
          frequency: formData.frequency,
          type: 'regular' as const,
          verificationStatus: 'pending' as const
        }
      : {
          donatorName: formData.donatorName,
          email: formData.email,
          contactNumber: formData.contactNumber,
          item: formData.item,
          quantity: formData.quantity,
          category: formData.category,
          type: 'in-kind' as const,
          verificationStatus: 'pending' as const
        };

    onSubmit(submitData);
    // Reset form after submission
    setFormData({
      donatorName: '',
      email: '',
      contactNumber: '',
      item: '',  // Changed from 'name' to 'item'
      quantity: 0,
      category: '',
      frequency: 'monthly',
      type: type
    });
    onClose();
  };

  // Update the frequency change handler
  const handleFrequencyChange = (value: string) => {
    if (value === 'monthly' || value === 'quarterly' || value === 'annually') {
      setFormData({
        ...formData,
        frequency: value as FrequencyType
      });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="inventory-modal-content">
        <h2 className="inventory-modal-title">
          {item ? 'Edit Item' : `Add New ${type === 'regular' ? 'Regular' : 'In-kind'} Item`}
        </h2>
        <form className="inventory-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Donator Name"
            value={formData.donatorName}
            onChange={e => setFormData({...formData, donatorName: e.target.value})}
            required
            className="inventory-form-input"
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            required
            className="inventory-form-input"
          />
          <input
            type="text"
            placeholder="Contact Number"
            value={formData.contactNumber}
            onChange={e => setFormData({...formData, contactNumber: e.target.value})}
            required
            className="inventory-form-input"
          />
          <input
            type="text"
            placeholder="Item"
            value={formData.item}
            onChange={e => setFormData({...formData, item: e.target.value})}
            required
            className="inventory-form-input"
          />
          <select
            value={formData.category}
            onChange={e => setFormData({...formData, category: e.target.value})}
            required
            className="inventory-form-select"
          >
            <option value="">Select a category</option>
            <option value="Food & Nutrition">Food & Nutrition</option>
            <option value="Clothing & Footwear">Clothing & Footwear</option>
            <option value="Medical Supplies & Medicines">Medical Supplies & Medicines</option>
            <option value="School Supplies & Educational Materials">School Supplies & Educational Materials</option>
            <option value="Disaster Relief Essentials">Disaster Relief Essentials</option>
            <option value="Household & Hygiene Products">Household & Hygiene Products</option>
            <option value="Technology & Learning Tools">Technology & Learning Tools</option>
            <option value="Others">Others</option>
          </select>
          <input
            type="number"
            placeholder="Quantity"
            value={formData.quantity}
            onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
            required
            min="1"
            className="inventory-form-input"
          />
          {type === 'regular' && (
            <select
              value={formData.frequency}
              onChange={(e) => handleFrequencyChange(e.target.value)}
              required
              className="inventory-form-select"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          )}
          <div className="inventory-modal-buttons">
            <button type="button" onClick={onClose} className="inventory-modal-cancel">
              Cancel
            </button>
            <button type="submit" className="inventory-modal-submit">
              {item ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DistributeModal: React.FC<DistributeModalProps> = ({ isOpen, onClose, item, onSubmit }) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [selectedScholarIds, setSelectedScholarIds] = useState<number[]>([]); // Changed to array
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all'); // Add this state

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isOpen) return;
      try {
        const token = localStorage.getItem('token');
        console.log('Fetching users...');
        const response = await api.get(
          '/admin/users', // Updated to fetch all users
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('Received users:', response.data);
        setScholars(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [isOpen]);

  const getScholarInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const handleScholarSelect = (scholarId: number) => {
    setSelectedScholarIds(prev => {
      if (prev.includes(scholarId)) {
        // Unselect if already selected
        return prev.filter(id => id !== scholarId);
      } else {
        // Add to selection
        return [...prev, scholarId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedScholarIds.length === scholars.length) {
      // If all are selected, unselect all
      setSelectedScholarIds([]);
    } else {
      // Select all
      setSelectedScholarIds(scholars.map(scholar => scholar.id));
    }
  };

  // Add filterUsers function
  const filterUsers = (users: Scholar[]) => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = userTypeFilter === 'all' || user.role === userTypeFilter;
      return matchesSearch && matchesType;
    });
  };

  // Add this function to validate quantity
  const validateQuantity = () => {
    const totalNeededQuantity = selectedScholarIds.length * quantity;
    const isValid = totalNeededQuantity <= item.quantity;
    return {
      isValid,
      message: isValid ? '' : `Not enough items. Need ${totalNeededQuantity} but only have ${item.quantity} available.`
    };
  };

  if (!isOpen) return null;

  const filteredScholars = scholars.filter(scholar =>
    scholar.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content-inventory distribute-modal">
        <div className="distribute-modal-grid">
          {/* Left side - Distribution details */}
          <div className="distribution-details">
            <h2>Distribute Item</h2>
            <div className="item-details">
              <p><strong>Item:</strong> {item.item}</p>
              <p><strong>Available Quantity:</strong> {item.quantity}</p>
            </div>

            <div className="form-group">
              <label>Quantity to Distribute:</label>
              <input
                type="number"
                min="1"
                max={item.quantity}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Right side - Updated scholar selection */}
          <div className="scholar-selection">
            <div className="scholar-search-header">
              <h3>Select User(s)</h3>
              <div className="scholar-controls">
                <button 
                  type="button"
                  onClick={handleSelectAll}
                  className="select-all-button"
                >
                  {selectedScholarIds.length === scholars.length ? 'Unselect All' : 'Select All'}
                </button>
                <div className="search-filter-container">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="scholar-search"
                  />
                  <select
                    value={userTypeFilter}
                    onChange={(e) => setUserTypeFilter(e.target.value)}
                    className="user-type-filter"
                  >
                    <option value="all">All Users</option>
                    <option value="scholar">Scholars</option>
                    <option value="volunteer">Volunteers</option>
                    <option value="sponsor">Sponsors</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="scholars-grid">
              {loading ? (
                <div className="loading">Loading users...</div>
              ) : scholars.length === 0 ? (
                <div className="no-scholars">No users found</div>
              ) : (
                filterUsers(scholars).map(user => (
                  <div
                    key={user.id}
                    className={`scholar-card ${selectedScholarIds.includes(user.id) ? 'selected' : ''}`}
                    onClick={() => handleScholarSelect(user.id)}
                  >
                    <div className="styled-checkbox-inventory">
                      <input
                        type="checkbox"
                        checked={selectedScholarIds.includes(user.id)}
                        onChange={() => handleScholarSelect(user.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="checkmark"></span>
                    </div>
                    <div className="scholar-info">
                      <div className="scholar-name">{user.name}</div>
                      <div className="scholar-email">{user.email}</div>
                      <div className="user-role">{user.role}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="selected-count">
            {selectedScholarIds.length > 0 ? (
              <>
                <div>Selected: {selectedScholarIds.length} user(s)</div>
                <div className="quantity-summary">
                  Total needed: {selectedScholarIds.length * quantity} items
                  {!validateQuantity().isValid && (
                    <div className="quantity-error">{validateQuantity().message}</div>
                  )}
                </div>
              </>
            ) : (
              <div>Selected: 0 user(s)</div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button 
              type="button" 
              onClick={() => {
                if (selectedScholarIds.length > 0) {
                  if (validateQuantity().isValid) {
                    selectedScholarIds.forEach(scholarId => {
                      onSubmit(item.id, quantity, scholarId, 'scholar');
                    });
                  } else {
                    alert(validateQuantity().message);
                  }
                } else {
                  alert('Please select at least one user');
                }
              }}
              disabled={
                selectedScholarIds.length === 0 || 
                quantity <= 0 || 
                !validateQuantity().isValid
              }
              className="distribute-button"
            >
              Distribute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add new interface for distributions
interface Distribution {
  id: number;
  recipientName: string;  // matches backend recipient_name
  recipientEmail: string; // matches backend recipient_email
  recipientType: string;  // matches backend recipient_type
  itemName: string;       // matches backend item_name
  quantity: number;
  itemType: string;       // matches backend item_type
  distributedAt: string;  // matches backend distributed_at
}

// Add this interface near the top with other interfaces
interface SortConfig {
  key: string;
  direction: 'asc' | 'desc' | null;
}

// Add this helper function at the top with other utility functions
const formatDateTime = (timestamp: string) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
};

const AdminInventory: React.FC = () => {
  // Update state types and API calls
  const [regularItems, setRegularItems] = useState<RegularDonation[]>([]);
  const [inkindItems, setInkindItems] = useState<InKindDonation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RegularDonation | InKindDonation | undefined>();
  const [distributeItem, setDistributeItem] = useState<RegularDonation | InKindDonation | null>(null);
  const [addingType, setAddingType] = useState<'regular' | 'in-kind'>('regular');
  const [activeView, setActiveView] = useState<'pending' | 'regular' | 'in-kind'>('pending');
  const [selectedScholarId, setSelectedScholarId] = useState<number | null>(null);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [queuePage, setQueuePage] = useState(1);
  const [distributionPage, setDistributionPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewItem, setViewItem] = useState<DonationItem | null>(null); // Add this state

  // Add sort config state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });

  // Add new state for distribution search
  const [distributionSearchTerm, setDistributionSearchTerm] = useState('');

  // Add these sorting functions
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    
    setSortConfig({ key, direction });
  };

  const getSortedItems = (items: DonationItem[]) => {
    if (!sortConfig.direction || !sortConfig.key) return items;

    return [...items].sort((a, b) => {
      const aValue = String(a[sortConfig.key as keyof DonationItem] || '');
      const bValue = String(b[sortConfig.key as keyof DonationItem] || '');

      if (sortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return 'sort';
    if (sortConfig.direction === 'asc') return 'arrow_upward';
    if (sortConfig.direction === 'desc') return 'arrow_downward';
    return 'sort';
  };

  const handlePageChange = (page: number, table: 'inventory' | 'queue' | 'distribution') => {
    switch (table) {
      case 'inventory':
        setInventoryPage(page);
        break;
      case 'queue':
        setQueuePage(page);
        break;
      case 'distribution':
        setDistributionPage(page);
        break;
    }
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(event.target.value));
    setInventoryPage(1);
    setQueuePage(1);
    setDistributionPage(1);
  };

  const renderPageNumbers = (totalItems: number, currentPage: number, table: 'inventory' | 'queue' | 'distribution') => {
    const totalPages = Math.ceil(totalItems / rowsPerPage);
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
        onClick={() => typeof page === 'number' ? handlePageChange(page, table) : null}
        disabled={page === '...'}
      >
        {page}
      </button>
    ));
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  // Add this new function to fetch all data
  const fetchAll = async () => {
    try {
      const [regularRes, inkindRes, distributionsRes] = await Promise.all([
        api.get('/inventory/regular'),
        api.get('/inventory/inkind'),
        api.get('/inventory/distributions')
      ]);
      setRegularItems(regularRes.data);
      setInkindItems(inkindRes.data);
      setDistributions(distributionsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Update the fetchItems function to use fetchAll
  const fetchItems = () => fetchAll();

  // Fetch items on component mount
  useEffect(() => {
    const fetchDistributions = async () => {
      try {
        const response = await api.get(
          '/inventory/distributions',
          getAuthHeaders()
        );
        setDistributions(response.data);
      } catch (error) {
        console.error('Error fetching distributions:', error);
      }
    };

    fetchItems();
    fetchDistributions();
  }, []);

  const handleAddItem = async (newItem: Omit<DonationItem, 'id' | 'lastUpdated'>) => {
    try {
      const type = newItem.type === 'regular' ? 'regular' : 'inkind';
      const response = await api.post(`/inventory/${type}`, newItem);
      if (newItem.type === 'regular') {
        setRegularItems([...regularItems, response.data]);
      } else {
        setInkindItems([...inkindItems, response.data]);
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleEditItem = async (updatedItem: Omit<DonationItem, 'id' | 'lastUpdated'>) => {
    if (!editingItem) return;
    try {
      const type = editingItem.type === 'regular' ? 'regular' : 'inkind';
      const response = await api.put(`/inventory/${type}/${editingItem.id}`, updatedItem);
      if (editingItem.type === 'regular') {
        setRegularItems(regularItems.map(item => item.id === editingItem.id ? response.data : item));
      } else {
        setInkindItems(inkindItems.map(item => item.id === editingItem.id ? response.data : item));
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (id: number, type: 'regular' | 'in-kind') => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        // Fix the delete endpoint URL to match the backend routes
        const endpoint = type === 'regular' ? 'regular' : 'inkind';
        await api.delete(`/inventory/${endpoint}/${id}`);
        
        // Update the correct state based on type
        if (type === 'regular') {
          setRegularItems(regularItems.filter(item => item.id !== id));
        } else {
          setInkindItems(inkindItems.filter(item => item.id !== id));
        }
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item. Please try again.');
      }
    }
  };

  // Update handleDistribute function
  const handleDistribute = async (itemId: number, quantity: number, recipientId: number, recipientType: string) => {
    try {
      const type = distributeItem?.type === 'regular' ? 'regular' : 'inkind';
      await api.post(`/inventory/${type}/${itemId}/distribute`, {
        quantity,
        recipientId,
        recipientType
      });
      
      // Refresh all data after successful distribution
      await fetchAll();
      setDistributeItem(null);
    } catch (error) {
      console.error('Error distributing item:', error);
      alert('Failed to distribute item. Please try again.');
    }
  };

  const handleVerify = async (id: number, type: 'regular' | 'in-kind') => {
    try {
      const endpoint = type === 'regular' ? 'regular' : 'inkind';
      const response = await api.post(
        `/inventory/${endpoint}/${id}/verify`,
        {},
        getAuthHeaders()
      );

      // Update local state
      if (type === 'regular') {
        setRegularItems(regularItems.map(item => 
          item.id === id ? response.data : item
        ));
      } else {
        setInkindItems(inkindItems.map(item => 
          item.id === id ? response.data : item
        ));
      }

      alert('Item verified successfully!');
    } catch (error) {
      console.error('Error verifying item:', error);
      alert('Failed to verify item');
    }
  };

  const handleReject = async (id: number, type: 'regular' | 'in-kind') => {
    const reason = window.prompt('Please enter reason for rejection:');
    if (reason) {
      try {
        const endpoint = type === 'regular' ? 'regular' : 'inkind';
        const response = await api.post(
          `/inventory/${endpoint}/${id}/reject`,
          { reason },
          getAuthHeaders()
        );

        // Update local state
        if (type === 'regular') {
          setRegularItems(regularItems.map(item => 
            item.id === id ? response.data : item
          ));
        } else {
          setInkindItems(inkindItems.map(item => 
            item.id === id ? response.data : item
          ));
        }

        alert('Item rejected successfully');
      } catch (error) {
        console.error('Error rejecting item:', error);
        alert('Failed to reject item');
      }
    }
  };

  // Add export functions
  const handleExportVerified = () => {
    try {
      const items = [...regularItems, ...inkindItems].filter(item => 
        item.verificationStatus === 'verified'
      );
      
      const exportData = items.map(item => ({
        'Donator Name': item.donatorName,
        'Email': item.email,
        'Contact': item.contactNumber,
        'Item': item.item,
        'Category': item.category,
        'Quantity': item.quantity,
        'Type': item.type,
        'Frequency': item.type === 'regular' ? (item as RegularDonation).frequency : 'N/A',
        'Last Updated': item.lastUpdated
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Verified Items');
      XLSX.writeFile(wb, `verified_items_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleExportQueue = () => {
    try {
      const items = [...regularItems, ...inkindItems].filter(item => 
        item.verificationStatus === 'pending'
      );
      
      const exportData = items.map(item => ({
        'Type': item.type,
        'Donator Name': item.donatorName,
        'Item': item.item,
        'Category': item.category,
        'Quantity': item.quantity,
        'Status': item.verificationStatus
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Verification Queue');
      XLSX.writeFile(wb, `verification_queue_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleExportDistributions = () => {
    try {
      const exportData = distributions.map(dist => ({
        'Date': new Date(dist.distributedAt).toLocaleDateString(),
        'Recipient': dist.recipientName,
        'Recipient Email': dist.recipientEmail,
        'Recipient Type': dist.recipientType,
        'Item': dist.itemName,
        'Quantity': dist.quantity,
        'Item Type': dist.itemType
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Distribution History');
      XLSX.writeFile(wb, `distribution_history_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Update type definition for renderInventoryTable
const renderInventoryTable = (view: 'regular' | 'in-kind') => {
  // Filter for verified items only in regular and in-kind views
  let items = (view === 'regular' ? regularItems : inkindItems).filter(item =>
    item.verificationStatus === 'verified'
  );
  const type = view;
  
  // Apply sorting
  items = getSortedItems(items);
  
  // Apply pagination
  const startIndex = (inventoryPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);
  
  return (
    <div className="inventory-section">
      <div className="table-header">
        <div className="header-left">
          <h2 className="table-title">
            {view === 'regular' ? 'Verified Regular Donations' : 'Verified In-kind Donations'}
          </h2>
        </div>
        <div className="header-actions">
          <button className="export-btn" onClick={handleExportVerified}>
            Export
          </button>
          <button className="add-button" onClick={() => {
            setAddingType(type);
            setEditingItem(undefined);
            setIsModalOpen(true);
          }}>
            Add {type === 'regular' ? 'Regular' : 'In-kind'} Item
          </button>
        </div>
      </div>
      <div className="inventory-table">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('donatorName')} className="sortable-header">
                Donator Name <span className="material-icons sort-icon">{getSortIcon('donatorName')}</span>
              </th>
              <th onClick={() => handleSort('email')} className="sortable-header">
                Email <span className="material-icons sort-icon">{getSortIcon('email')}</span>
              </th>
              <th onClick={() => handleSort('contactNumber')} className="sortable-header">
                Contact <span className="material-icons sort-icon">{getSortIcon('contactNumber')}</span>
              </th>
              <th onClick={() => handleSort('item')} className="sortable-header">
                Item <span className="material-icons sort-icon">{getSortIcon('item')}</span>
              </th>
              <th onClick={() => handleSort('category')} className="sortable-header">
                Category <span className="material-icons sort-icon">{getSortIcon('category')}</span>
              </th>
              <th onClick={() => handleSort('quantity')} className="sortable-header">
                Quantity <span className="material-icons sort-icon">{getSortIcon('quantity')}</span>
              </th>
              {view === 'regular' && (
                <th onClick={() => handleSort('frequency')} className="sortable-header">
                  Frequency <span className="material-icons sort-icon">{getSortIcon('frequency')}</span>
                </th>
              )}
              <th onClick={() => handleSort('lastUpdated')} className="sortable-header">
                Last Updated <span className="material-icons sort-icon">{getSortIcon('lastUpdated')}</span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((item) => (
              <tr key={item.id}>
                <td>{item.donatorName}</td>
                <td>{item.email}</td>
                <td>{item.contactNumber}</td>
                <td>{item.item}</td>
                <td>{item.category}</td>
                <td>{item.quantity}</td>
                {view === 'regular' && (
                  <td>{(item as RegularDonation).frequency}</td>
                )}
                <td>{item.lastUpdated ? formatDateTime(item.lastUpdated) : 'N/A'}</td>
                <td>
                  <div className="action-buttons">
                  <button 
                      className="viewsss-button"
                      onClick={() => handleView(item)}
                    >
                      View
                    </button>
                    <button 
                      className="inventory-action-edit" 
                      onClick={() => {
                        setEditingItem(item);
                        setIsModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="inventory-action-delete" 
                      onClick={() => handleDeleteItem(item.id, type)}
                    >
                      Delete
                    </button>
                    <button 
                      className="distribute-button"
                      onClick={() => {
                        setDistributeItem(item);
                      }}
                      disabled={item.quantity === 0}
                    >
                      Distribute
                    </button>
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
            onClick={() => handlePageChange(inventoryPage - 1, 'inventory')}
            disabled={inventoryPage === 1}
            className="page-nav"
          >
            &lt;
          </button>
          {renderPageNumbers(items.length, inventoryPage, 'inventory')}
          <button
            onClick={() => handlePageChange(inventoryPage + 1, 'inventory')}
            disabled={inventoryPage === Math.ceil(items.length / rowsPerPage)}
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
    </div>
  );
};

  // Add verification queue table
  const renderVerificationQueue = () => {
    let pendingItems = [...regularItems, ...inkindItems]
      .filter(item => item.verificationStatus === 'pending');
    
    // Apply sorting
    pendingItems = getSortedItems(pendingItems);
    
    const startIndex = (queuePage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedItems = pendingItems.slice(startIndex, endIndex);

    return (
      <div className="inventory-section">
        <div className="table-header">
          <div className="header-left">
            <h2 className="table-title">Verification Queue</h2>
          </div>
        </div>
        <div className="inventory-table">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('type')} className="sortable-header">
                  Type <span className="material-icons sort-icon">{getSortIcon('type')}</span>
                </th>
                <th onClick={() => handleSort('donatorName')} className="sortable-header">
                  Donator Name <span className="material-icons sort-icon">{getSortIcon('donatorName')}</span>
                </th>
                <th onClick={() => handleSort('item')} className="sortable-header">
                  Item <span className="material-icons sort-icon">{getSortIcon('item')}</span>
                </th>
                <th onClick={() => handleSort('category')} className="sortable-header">
                  Category <span className="material-icons sort-icon">{getSortIcon('category')}</span>
                </th>
                <th onClick={() => handleSort('quantity')} className="sortable-header">
                  Quantity <span className="material-icons sort-icon">{getSortIcon('quantity')}</span>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr key={`${item.type}-${item.id}`}>
                  <td>{item.type}</td>
                  <td>{item.donatorName}</td>
                  <td>{item.item}</td>
                  <td>{item.category}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <div className="action-buttons">
                    <button 
                        className="viewsss-button"
                        onClick={() => handleView(item)}
                      >
                        View
                      </button>
                      <button 
                        className="verify-button"
                        onClick={() => handleVerify(item.id, item.type)}
                      >
                        Verify
                      </button>
                      <button 
                        className="reject-button"
                        onClick={() => handleReject(item.id, item.type)}
                      >
                        Reject
                      </button>
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
              onClick={() => handlePageChange(queuePage - 1, 'queue')}
              disabled={queuePage === 1}
              className="page-nav"
            >
              &lt;
            </button>
            {renderPageNumbers(pendingItems.length, queuePage, 'queue')}
            <button
              onClick={() => handlePageChange(queuePage + 1, 'queue')}
              disabled={queuePage === Math.ceil(pendingItems.length / rowsPerPage)}
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
      </div>
    );
  };

  // Update distribution history table
  const renderDistributionHistory = () => {
    // Filter distributions based on search term with null checks
    let sortedDistributions = [...distributions].filter(dist =>
      (dist.recipientName?.toLowerCase() || '').includes(distributionSearchTerm.toLowerCase()) ||
      (dist.recipientEmail?.toLowerCase() || '').includes(distributionSearchTerm.toLowerCase()) ||
      (dist.itemName?.toLowerCase() || '').includes(distributionSearchTerm.toLowerCase()) ||
      (dist.recipientType?.toLowerCase() || '').includes(distributionSearchTerm.toLowerCase())
    );

    // Apply sorting to filtered distributions
    if (sortConfig.direction && sortConfig.key) {
      sortedDistributions.sort((a, b) => {
        let aValue = String(a[sortConfig.key as keyof Distribution] || '');
        let bValue = String(b[sortConfig.key as keyof Distribution] || '');

        // Special handling for date comparison
        if (sortConfig.key === 'distributedAt') {
          aValue = new Date(a.distributedAt).getTime().toString();
          bValue = new Date(b.distributedAt).getTime().toString();
        }

        if (sortConfig.direction === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });
    }

    const startIndex = (distributionPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedDistributions = sortedDistributions.slice(startIndex, endIndex);

    return (
      <div className="inventory-section">
        <div className="table-header">
          <div className="header-left">
            <h2 className="table-title">Distribution History</h2>
          </div>
          <div className="header-actions">
            <input
              type="text"
              placeholder="Search distributions..."
              value={distributionSearchTerm}
              onChange={(e) => setDistributionSearchTerm(e.target.value)}
              className="search-input"
            />
            <button className="export-btn" onClick={handleExportDistributions}>
              Export
            </button>
          </div>
        </div>
        <div className="inventory-table">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('distributedAt')} className="sortable-header">
                  Date <span className="material-icons sort-icon">{getSortIcon('distributedAt')}</span>
                </th>
                <th onClick={() => handleSort('recipientName')} className="sortable-header">
                  Recipient <span className="material-icons sort-icon">{getSortIcon('recipientName')}</span>
                </th>
                <th onClick={() => handleSort('recipientEmail')} className="sortable-header">
                  Recipient Email <span className="material-icons sort-icon">{getSortIcon('recipientEmail')}</span>
                </th>
                <th onClick={() => handleSort('recipientType')} className="sortable-header">
                  Recipient Type <span className="material-icons sort-icon">{getSortIcon('recipientType')}</span>
                </th>
                <th onClick={() => handleSort('itemName')} className="sortable-header">
                  Item <span className="material-icons sort-icon">{getSortIcon('itemName')}</span>
                </th>
                <th onClick={() => handleSort('quantity')} className="sortable-header">
                  Quantity <span className="material-icons sort-icon">{getSortIcon('quantity')}</span>
                </th>
                <th onClick={() => handleSort('itemType')} className="sortable-header">
                  Item Type <span className="material-icons sort-icon">{getSortIcon('itemType')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedDistributions.map((dist) => (
                <tr key={dist.id}>
                  <td>{new Date(dist.distributedAt).toLocaleDateString()}</td>
                  <td>{dist.recipientName}</td>
                  <td>{dist.recipientEmail}</td>
                  <td>{dist.recipientType}</td>
                  <td>{dist.itemName}</td>
                  <td>{dist.quantity}</td>
                  <td>{dist.itemType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="pagination">
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(distributionPage - 1, 'distribution')}
              disabled={distributionPage === 1}
              className="page-nav"
            >
              &lt;
            </button>
            {renderPageNumbers(distributions.length, distributionPage, 'distribution')}
            <button
              onClick={() => handlePageChange(distributionPage + 1, 'distribution')}
              disabled={distributionPage === Math.ceil(distributions.length / rowsPerPage)}
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
      </div>
    );
  };

  const handleView = (item: DonationItem) => {
    setViewItem(item);
  };

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1 className="inventory-title">Inventory Management</h1>
        <div className="inventory-actions">
          <div className="inventory-tab-buttons">
            <button 
              className={`inventory-tab-button ${activeView === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveView('pending')}
            >
              Verification Queue
            </button>
            <button 
              className={`inventory-tab-button ${activeView === 'regular' ? 'active' : ''}`}
              onClick={() => setActiveView('regular')}
            >
              Regular Donations
            </button>
            <button 
              className={`inventory-tab-button ${activeView === 'in-kind' ? 'active' : ''}`}
              onClick={() => setActiveView('in-kind')}
            >
              In-kind Donations
            </button>
          </div>
        
        </div>
      </div>

      <div className="inventory-tables-container">
        {activeView === 'pending' ? (
          renderVerificationQueue()
        ) : (
          renderInventoryTable(activeView)
        )}
        {renderDistributionHistory()}
      </div>

      <ItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(undefined);
        }}
        item={editingItem}
        type={editingItem?.type || addingType}
        onSubmit={editingItem ? handleEditItem : handleAddItem}
      />

      {distributeItem && (
        <DistributeModal
          isOpen={!!distributeItem}
          onClose={() => setDistributeItem(null)}
          item={distributeItem}
          onSubmit={handleDistribute}
        />
      )}

      {viewItem && (
        <div className="modal-overlay">
          <div className="modal-content-inventory">
            <h2>View Item Details</h2>
            <div className="view-details">
              <p><strong>Donator Name:</strong> {viewItem.donatorName}</p>
              <p><strong>Email:</strong> {viewItem.email}</p>
              <p><strong>Contact Number:</strong> {viewItem.contactNumber}</p>
              <p><strong>Item:</strong> {viewItem.item}</p>
              <p><strong>Category:</strong> {viewItem.category}</p>
              <p><strong>Quantity:</strong> {viewItem.quantity}</p>
              {viewItem.type === 'regular' && (
                <p><strong>Frequency:</strong> {(viewItem as RegularDonation).frequency}</p>
              )}
              <p><strong>Status:</strong> {viewItem.verificationStatus}</p>
              <p><strong>Last Updated:</strong> {formatDateTime(viewItem.lastUpdated)}</p>
              {viewItem.verifiedAt && (
                <p><strong>Verified At:</strong> {formatDateTime(viewItem.verifiedAt)}</p>
              )}
              {viewItem.verifiedBy && (
                <p><strong>Verified By:</strong> {viewItem.verifiedBy}</p>
              )}
              {viewItem.rejectedAt && (
                <p><strong>Rejected At:</strong> {formatDateTime(viewItem.rejectedAt)}</p>
              )}
              {viewItem.rejectedBy && (
                <p><strong>Rejected By:</strong> {viewItem.rejectedBy}</p>
              )}
              {viewItem.rejectionReason && (
                <p><strong>Rejection Reason:</strong> {viewItem.rejectionReason}</p>
              )}
            </div>
           
              <button 
                className="cancel-button"
                onClick={() => setViewItem(null)}
              >
                Close
              </button>
           
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminInventory;
