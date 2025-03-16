import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/Inventory.css';
import api from '../../config/axios'; // Replace axios import
import * as XLSX from 'xlsx'; // Add this import
import { useLocation } from 'react-router-dom'; // Add this import

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
  expirationDate?: string;
  unit: QuantityUnit;
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

type QuantityUnit = 'Piece' | 'Box' | 'Pack' | 'Kilogram' | 'Liter' | 'Set';

const QUANTITY_UNITS = [
  { value: 'Piece', label: 'Piece' },
  { value: 'Box', label: 'Box' },
  { value: 'Pack', label: 'Pack' },
  { value: 'Kilogram', label: 'Kilogram' },
  { value: 'Liter', label: 'Liter' },
  { value: 'Set', label: 'Set' }
];

const CATEGORIES_WITH_EXPIRATION = ['Food & Nutrition', 'Medical Supplies & Medicines'];

const ItemModal: React.FC<ModalProps> = ({ isOpen, onClose, item, type, onSubmit }) => {
  const [formData, setFormData] = useState({
    donatorName: '',
    email: '',
    contactNumber: '',
    item: '',  // Changed from 'name' to 'item'
    quantity: 0,
    category: '',
    frequency: 'monthly' as FrequencyType,
    type: type, // Add type field
    unit: 'Piece' as QuantityUnit,
    expirationDate: '',
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
        type: item?.type || type, // Ensure type is always set
        unit: item?.unit || 'Piece',
        expirationDate: item?.expirationDate || ''
      });
    }
  }, [isOpen, item, type]);

  if (!isOpen) return null;

  const validateForm = (): string | null => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Invalid email format';
    }

    // Contact number validation (Philippine format)
    const phoneRegex = /^(\+63|0)[0-9]{10}$/;
    if (!phoneRegex.test(formData.contactNumber)) {
      return 'Invalid contact number format. Use +63 or 0 followed by 10 digits';
    }

    // Quantity validation
    if (formData.quantity <= 0 || !Number.isInteger(formData.quantity)) {
      return 'Quantity must be a positive integer';
    }

    // Validate expiration date for food and medical items
    if (CATEGORIES_WITH_EXPIRATION.includes(formData.category)) {
      if (!formData.expirationDate) {
        return 'Expiration date is required for food and medical items';
      }
      
      const today = new Date();
      const expDate = new Date(formData.expirationDate);
      if (expDate <= today) {
        return 'Expiration date must be in the future';
      }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

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
          verificationStatus: 'pending' as const,
          unit: formData.unit,
          expirationDate: formData.expirationDate
        }
      : {
          donatorName: formData.donatorName,
          email: formData.email,
          contactNumber: formData.contactNumber,
          item: formData.item,
          quantity: formData.quantity,
          category: formData.category,
          type: 'in-kind' as const,
          verificationStatus: 'pending' as const,
          unit: formData.unit,
          expirationDate: formData.expirationDate
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
      type: type,
      unit: 'Piece',
      expirationDate: ''
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
          <div className="form-group">
            <label>Unit:</label>
            <select
              value={formData.unit}
              onChange={e => setFormData({...formData, unit: e.target.value as QuantityUnit})}
              required
              className="inventory-form-select"
            >
              {QUANTITY_UNITS.map(unit => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>

          {CATEGORIES_WITH_EXPIRATION.includes(formData.category) && (
            <div className="form-group">
              <label>Expiration Date:</label>
              <input
                type="date"
                value={formData.expirationDate}
                onChange={e => setFormData({...formData, expirationDate: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                required
                className="inventory-form-input"
              />
              <small>Required for food and medical items</small>
            </div>
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

  const validateDistribution = (): string | null => {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return 'Quantity must be a positive integer';
    }

    if (selectedScholarIds.length === 0) {
      return 'Please select at least one recipient';
    }

    const totalNeeded = selectedScholarIds.length * quantity;
    if (totalNeeded > item.quantity) {
      return `Not enough items. Need ${totalNeeded} but only have ${item.quantity} available.`;
    }

    return null;
  };

  const handleDistribute = () => {
    const validationError = validateDistribution();
    if (validationError) {
      alert(validationError);
      return;
    }

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
  };

  if (!isOpen) return null;

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
              onClick={handleDistribute}
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
  status: 'pending' | 'received' | 'not_received' | null; // add status field
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

type ExpiringItem = (RegularDonation | InKindDonation) & {
  daysUntilExpiration: number;
  isExpired: boolean; // Add this field
};

const AdminInventory: React.FC = () => {
  // Update state types and API calls
  const [regularItems, setRegularItems] = useState<RegularDonation[]>([]);
  const [inkindItems, setInkindItems] = useState<InKindDonation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RegularDonation | InKindDonation | undefined>();
  const [distributeItem, setDistributeItem] = useState<RegularDonation | InKindDonation | null>(null);
  const [addingType, setAddingType] = useState<'regular' | 'in-kind'>('regular');
  const [activeView, setActiveView] = useState<'pending' | 'regular' | 'in-kind' | 'expiring'>('pending');
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [queuePage, setQueuePage] = useState(1);
  const [distributionPage, setDistributionPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewItem, setViewItem] = useState<DonationItem | null>(null); // Add this state
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);

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
  const fetchItems = useCallback(() => fetchAll(), []);

  // Fetch items on component mount - fixed to prevent infinite loop
  useEffect(() => {
    fetchItems();
    
    // Set up interval to fetch data periodically (every 5 minutes) instead of constant polling
    const intervalId = setInterval(() => {
      console.log('Scheduled data refresh');
      fetchItems();
    }, 300000); // 5 minutes in milliseconds
    
    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array means this runs once on mount

  // Update useEffect to calculate expiring items only when needed
  useEffect(() => {
    if (regularItems.length > 0 || inkindItems.length > 0) {
      calculateExpiringItems();
    }
  }, [regularItems.length, inkindItems.length]); // Only recalculate when the arrays change length

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
      const response = await api.put(`/inventory/${type}/${editingItem.id}`, {
        donatorName: updatedItem.donatorName,
        email: updatedItem.email, 
        contactNumber: updatedItem.contactNumber,
        item: updatedItem.item,
        quantity: updatedItem.quantity,
        category: updatedItem.category,
        unit: updatedItem.unit,
        expirationDate: updatedItem.expirationDate,
        ...(type === 'regular' && { frequency: (updatedItem as RegularDonation).frequency })
      });

      // Update the correct state based on type
      if (type === 'regular') {
        setRegularItems(regularItems.map(item => 
          item.id === editingItem.id ? response.data : item
        ));
      } else {
        setInkindItems(inkindItems.map(item => 
          item.id === editingItem.id ? response.data : item
        ));
      }

      setIsModalOpen(false);
      setEditingItem(undefined);
      
      // Refresh data
      fetchItems();
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item. Please try again.');
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
      
      // First get scholar info before distribution
      const scholarResponse = await api.get(`/scholars/${recipientId}`);
      if (!scholarResponse.data) {
        throw new Error('Scholar information not found');
      }
      
      console.log('Scholar info for notification:', scholarResponse.data);
  
      // Distribute item
      const response = await api.post(`/inventory/${type}/${itemId}/distribute`, {
        quantity,
        recipientId,
        recipientType
      });
  
      // Send email notification with detailed logging
      if (response.data.success) {
        console.log('Distribution successful, sending notification...');
        try {
          const notificationData = {
            email: scholarResponse.data.email,
            scholarName: scholarResponse.data.name,
            items: [{
              itemId,
              itemName: distributeItem?.item,
              quantity,
              unit: distributeItem?.unit,
              category: distributeItem?.category,
              type: distributeItem?.type,
              recipientId
            }],
            distributionId: response.data.distributionId
          };
  
          console.log('Sending notification with data:', notificationData);
  
          const notificationResponse = await api.post('/notifications/distribution-notification', notificationData);
  
          console.log('Notification response:', notificationResponse.data);
  
          if (notificationResponse.data.emailSent) {
            console.log('Email notification sent successfully');
          } else {
            console.warn('Email notification failed:', notificationResponse.data.emailError);
            alert('Distribution successful but there might be an issue with the email notification.');
          }
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
          alert('Distribution successful but notification may not have been sent.');
        }
      }
  
      // Refresh data and cleanup
      await fetchAll();
      setDistributeItem(null);
      alert('Items distributed successfully! Scholar has been notified.');
    } catch (error) {
      console.error('Error in distribution process:', error);
      alert('Failed to distribute item. Please try again.');
    }
  };
  

  const handleVerify = async (id: number, type: 'regular' | 'in-kind') => {
    try {
      const endpoint = type === 'regular' ? 'regular' : 'inkind';
      
      // Find the item being verified to get its details
      const items = type === 'regular' ? regularItems : inkindItems;
      const itemToVerify = items.find(item => item.id === id);
      
      const response = await api.post(
        `/inventory/${endpoint}/${id}/verify`,
        { 
          expirationDate: itemToVerify?.expirationDate || new Date().toISOString().split('T')[0]
        },
        getAuthHeaders()
      );

      // Send verification notification email
      if (itemToVerify) {
        await api.post('/notifications/donation-verification', {
          email: itemToVerify.email,
          donorName: itemToVerify.donatorName,
          items: [itemToVerify],
          verificationDate: new Date()
        });
      }

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
        
        // Find the item being rejected to get its details
        const items = type === 'regular' ? regularItems : inkindItems;
        const itemToReject = items.find(item => item.id === id);

        const response = await api.post(
          `/inventory/${endpoint}/${id}/reject`,
          { reason },
          getAuthHeaders()
        );

        // Send rejection notification email
        if (itemToReject) {
          await api.post('/notifications/donation-rejection', {
            email: itemToReject.email,
            donorName: itemToReject.donatorName,
            items: [itemToReject],
            rejectionReason: reason
          });
        }

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
        'Item Type': dist.itemType,
        'Status': dist.status || 'Pending' // Add status to export
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
              <th onClick={() => handleSort('unit')} className="sortable-header">
                Unit <span className="material-icons sort-icon">{getSortIcon('unit')}</span>
              </th>
              <th onClick={() => handleSort('expirationDate')} className="sortable-header">
                Expiration Date <span className="material-icons sort-icon">{getSortIcon('expirationDate')}</span>
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
                <td>{item.unit}</td>
                <td>{item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : 'N/A'}</td>
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
          <div className="header-actions">
            <button className="export-btn" onClick={handleExportQueue}>
              Export
            </button>
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
    const sortedDistributions = [...distributions].filter(dist =>
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

    // Helper function to render status badge with appropriate styling
    const renderStatusBadge = (status: string | null) => {
      if (!status || status === 'pending') {
        return <span className="status-badge pending">Pending</span>;
      } else if (status === 'received') {
        return <span className="status-badge received">Received ✓</span>;
      } else if (status === 'not_received') {
        return <span className="status-badge not-received">Not Received ✕</span>;
      }
      return <span className="status-badge">{status}</span>;
    };

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
                {/* Add status column header */}
                <th onClick={() => handleSort('status')} className="sortable-header">
                  Status <span className="material-icons sort-icon">{getSortIcon('status')}</span>
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
                  {/* Add status column cell */}
                  <td>{renderStatusBadge(dist.status)}</td>
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

  // Add this new function to calculate expiring items
  const calculateExpiringItems = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expiring = [...regularItems, ...inkindItems]
      .filter(item => 
        item.verificationStatus === 'verified' && 
        item.expirationDate 
      )
      .map(item => ({
        ...item,
        daysUntilExpiration: Math.ceil(
          (new Date(item.expirationDate || '').getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        ),
        isExpired: new Date(item.expirationDate || '') <= today
      }))
      .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

    setExpiringItems(expiring);
  };

  // Update useEffect to include expiring items calculation
  useEffect(() => {
    fetchItems();
    calculateExpiringItems();
  }, [regularItems, inkindItems]);

  // Update this function to be a complete tab view
  const renderExpiringItems = () => {
    if (expiringItems.length === 0) {
      return (
        <div className="inventory-section">
          <div className="table-header">
            <div className="header-left">
              <h2 className="table-title">Items Nearing Expiration or Expired</h2>
            </div>
          </div>
          <div className="inventory-table">
            <p style={{ padding: "20px", textAlign: "center" }}>No expiring or expired items found.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="inventory-section expiring-items-section">
        <div className="table-header">
          <div className="header-left">
            <h2 className="table-title">Items Nearing Expiration or Expired</h2>
          </div>
          <div className="header-actions">
            <button className="export-btn" onClick={() => {
              // Create export for expiring items
              try {
                const exportData = expiringItems.map(item => ({
                  'Item Name': item.item,
                  'Category': item.category,
                  'Quantity': item.quantity,
                  'Unit': item.unit,
                  'Type': item.type,
                  'Expiration Date': new Date(item.expirationDate || '').toLocaleDateString(),
                  'Days Until Expiration': item.isExpired ? 'EXPIRED' : `${item.daysUntilExpiration} days`,
                }));

                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Expiring Items');
                XLSX.writeFile(wb, `expiring_items_${new Date().toISOString().split('T')[0]}.xlsx`);
              } catch (error) {
                console.error('Export error:', error);
              }
            }}>
              Export
            </button>
          </div>
        </div>
        <div className="inventory-table">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('item')} className="sortable-header">
                  Item Name <span className="material-icons sort-icon">{getSortIcon('item')}</span>
                </th>
                <th onClick={() => handleSort('category')} className="sortable-header">
                  Category <span className="material-icons sort-icon">{getSortIcon('category')}</span>
                </th>
                <th onClick={() => handleSort('quantity')} className="sortable-header">
                  Quantity <span className="material-icons sort-icon">{getSortIcon('quantity')}</span>
                </th>
                <th onClick={() => handleSort('unit')} className="sortable-header">
                  Unit <span className="material-icons sort-icon">{getSortIcon('unit')}</span>
                </th>
                <th onClick={() => handleSort('type')} className="sortable-header">
                  Type <span className="material-icons sort-icon">{getSortIcon('type')}</span>
                </th>
                <th onClick={() => handleSort('expirationDate')} className="sortable-header">
                  Expiration Date <span className="material-icons sort-icon">{getSortIcon('expirationDate')}</span>
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expiringItems.map((item) => (
                <tr 
                  key={`${item.type}-${item.id}`} 
                  className={item.isExpired ? 'expired-row' : item.daysUntilExpiration <= 7 ? 'urgent-expiration' : ''}
                >
                  <td>{item.item}</td>
                  <td>{item.category}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>{item.type}</td>
                  <td>{new Date(item.expirationDate || '').toLocaleDateString()}</td>
                  <td>
                    {item.isExpired ? (
                      <span className="expiration-badge expired">Expired</span>
                    ) : (
                      <span className={`expiration-badge ${
                        item.daysUntilExpiration <= 7 ? 'urgent' : 
                        item.daysUntilExpiration <= 14 ? 'warning' : 'notice'
                      }`}>
                        {item.daysUntilExpiration} days left
                      </span>
                    )}
                  </td>
                  <td>
                    {item.isExpired ? (
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteItem(item.id, item.type)}
                      >
                        Delete
                      </button>
                    ) : (
                      <div className="action-buttons">
                        <button
                          className="edit-button"
                          onClick={() => {
                            setEditingItem(item);
                            setIsModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteItem(item.id, item.type)}
                        >
                          Delete
                        </button>
                        <button
                          className="distribute-button"
                          onClick={() => setDistributeItem(item)}
                        >
                          Distribute
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Get location state for redirection from Maps page with proper typing
  const location = useLocation();
  const navigateState = location.state as { 
    selectedItemId?: string;
    itemType?: 'regular' | 'in-kind';
    openDistributeDialog?: boolean;
    fromMap?: boolean;
    category?: string; // Add category to help find items
  } | null;

  // Improved useEffect to handle redirection from the Maps page
  useEffect(() => {
    if (navigateState && navigateState.selectedItemId && navigateState.openDistributeDialog) {
      console.log("Navigate state received:", navigateState);
      
      // Find the item based on the ID passed from Maps
      if (navigateState.fromMap) {
        // Improved function to find item from map ID
        const findItemFromMapId = (id: string) => {
          console.log("Looking for item with ID:", id);
          
          // The ID format from Maps is like "category-item-name"
          const idParts = id.split('-');
          const categoryFromId = idParts[0];
          
          // Log all items for debugging
          console.log("Available regular items:", regularItems);
          console.log("Available in-kind items:", inkindItems);
          
          // Try looking through all items to find the best match
          let bestMatch: RegularDonation | InKindDonation | undefined;
          
          // First try to find an exact match
          const allItems = [...regularItems, ...inkindItems];
          
          // If we have a category from the Maps component, prioritize it
          if (navigateState.category && navigateState.category !== 'all') {
            const categoryItems = allItems.filter(item => 
              item.category.toLowerCase() === navigateState.category?.toLowerCase()
            );
            
            if (categoryItems.length > 0) {
              console.log("Found items matching category:", navigateState.category);
              bestMatch = categoryItems[0]; // Select first item of correct category
            }
          }
          
          // If no match by category, try to match by item name parts
          if (!bestMatch) {
            for (const item of allItems) {
              // Create a slugified version of the item name for comparison
              const itemSlug = item.item.toLowerCase().replace(/\s+/g, '-');
              
              // Check if any part of the ID matches the item slug
              for (const part of idParts) {
                if (itemSlug.includes(part) || part.includes(itemSlug)) {
                  console.log("Found matching item by name part:", item);
                  bestMatch = item;
                  break;
                }
              }
              
              if (bestMatch) break;
            }
          }
          
          // If we still can't find a match, just pick the first verified item
          if (!bestMatch) {
            bestMatch = allItems.find(item => item.verificationStatus === 'verified');
            console.log("Using first verified item as fallback:", bestMatch);
          }
          
          return bestMatch;
        };

        const matchedItem = findItemFromMapId(navigateState.selectedItemId);
        
        if (matchedItem) {
          console.log("Setting distribute item:", matchedItem);
          setDistributeItem(matchedItem);
          
          // Switch to the appropriate view tab
          setActiveView(matchedItem.type === 'regular' ? 'regular' : 'in-kind');
        } else {
          console.log("No matching item found for ID:", navigateState.selectedItemId);
        }
      } else {
        // Handle standard redirection (not from map)
        try {
          const itemId = parseInt(navigateState.selectedItemId);
          const itemType = navigateState.itemType || 'regular';
          const items = itemType === 'regular' ? regularItems : inkindItems;
          const item = items.find(i => i.id === itemId);
          
          if (item) {
            console.log("Setting distribute item by direct ID:", item);
            setDistributeItem(item);
          }
        } catch (error) {
          console.error("Error parsing item ID:", error);
        }
      }
    }
  }, [navigateState, regularItems.length, inkindItems.length]); // Depend on array lengths, not contents

  // Make sure this effect runs with the needed dependencies
  useEffect(() => {
    fetchItems();
  }, []);

  // Add a direct check for localStorage data
  useEffect(() => {
    // Check if we have distribute item data in localStorage
    const distributeDataString = localStorage.getItem('distributeItemData');
    if (distributeDataString) {
      try {
        const distributeData = JSON.parse(distributeDataString);
        console.log("Found distribute data in localStorage:", distributeData);
        
        // Only use data that is less than 10 seconds old to prevent stale data issues
        const now = new Date().getTime();
        if (distributeData.timestamp && (now - distributeData.timestamp < 10000)) {
          // Remove the data from localStorage to prevent it being used again
          localStorage.removeItem('distributeItemData');
          
          // Find the matching item
          const findMatchingItem = () => {
            // Try to find by numeric ID first
            if (distributeData.itemId) {
              const numericId = parseInt(distributeData.itemId);
              if (!isNaN(numericId)) {
                const regularItem = regularItems.find(item => item.id === numericId);
                if (regularItem) return regularItem;
                
                const inkindItem = inkindItems.find(item => item.id === numericId);
                if (inkindItem) return inkindItem;
              }
            }
            
            // If no match by ID, try to find by name and category
            if (distributeData.itemName) {
              // First try exact name match
              const allItems = [...regularItems, ...inkindItems];
              const exactNameMatch = allItems.find(
                item => item.item.toLowerCase() === distributeData.itemName.toLowerCase()
              );
              if (exactNameMatch) return exactNameMatch;
              
              // If no exact match, try category + partial name match
              if (distributeData.category && distributeData.category !== 'all') {
                const categoryItems = allItems.filter(
                  item => item.category.toLowerCase().includes(distributeData.category.toLowerCase())
                );
                
                if (categoryItems.length > 0) {
                  // Try to find a name that contains the item name
                  const nameMatch = categoryItems.find(
                    item => item.item.toLowerCase().includes(distributeData.itemName.toLowerCase())
                  );
                  if (nameMatch) return nameMatch;
                  
                  // If still no match, just return the first item in the category
                  return categoryItems[0];
                }
              }
              
              // If still no match, just pick any item with matching name part
              const partialNameMatch = allItems.find(
                item => item.item.toLowerCase().includes(distributeData.itemName.toLowerCase()) ||
                       distributeData.itemName.toLowerCase().includes(item.item.toLowerCase())
              );
              if (partialNameMatch) return partialNameMatch;
            }
            
            // Last resort: just pick the first verified item
            return [...regularItems, ...inkindItems].find(
              item => item.verificationStatus === 'verified'
            );
          };
          
          const matchedItem = findMatchingItem();
          if (matchedItem) {
            console.log("Found matching item:", matchedItem);
            setDistributeItem(matchedItem);
            setActiveView(matchedItem.type === 'regular' ? 'regular' : 'in-kind');
          }
        } else {
          console.log("Distribute data is too old, ignoring");
          localStorage.removeItem('distributeItemData');
        }
      } catch (error) {
        console.error("Error parsing distribute data from localStorage:", error);
        localStorage.removeItem('distributeItemData');
      }
    }
  }, [regularItems.length, inkindItems.length]); // Only depend on these two state variables

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
            <button 
              className={`inventory-tab-button ${activeView === 'expiring' ? 'active' : ''}`}
              onClick={() => setActiveView('expiring')}
            >
              Expiring Items
            </button>
          </div>
        
        </div>
      </div>

      <div className="inventory-tables-container">
        {activeView === 'expiring' && renderExpiringItems()} {/* Add this line before other tables */}
        {activeView === 'pending' ? (
          renderVerificationQueue()
        ) : (
          activeView === 'expiring' ? null : renderInventoryTable(activeView as 'regular' | 'in-kind')
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
              {viewItem.expirationDate && (
                <p><strong>Expiration Date:</strong> {new Date(viewItem.expirationDate).toLocaleDateString()}</p>
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
