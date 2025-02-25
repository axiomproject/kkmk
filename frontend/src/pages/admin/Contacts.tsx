import React, { useState, useEffect } from 'react';
import api from '../../config/axios'; // Replace axios import
import '../../styles/Bank.css'; // Reuse Bank styles

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  message: string;
  created_at: string;
}

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch contacts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await api.get('/contacts');
        setContacts(response.data);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      }
    };

    fetchContacts();
    const interval = setInterval(fetchContacts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await api.delete(`/contacts/${id}`);
        setContacts(contacts.filter(contact => contact.id !== id));
        alert('Contact deleted successfully');
      } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Failed to delete contact');
      }
    }
  };

  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setShowModal(true);
  };

  return (
    <div className="bank-container">
      <div className="bank-header">
        <h1 className="bank-title">Contact Support</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card total">
          <h3 className="stat-title">Total Messages</h3>
          <p className="stat-value">{contacts.length}</p>
        </div>
        <div className="stat-card monthly">
          <h3 className="stat-title">This Month</h3>
          <p className="stat-value">
            {contacts.filter(contact => {
              const date = new Date(contact.created_at);
              const now = new Date();
              return date.getMonth() === now.getMonth() && 
                     date.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
      </div>

      <div className="bank-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <td>{new Date(contact.created_at).toLocaleDateString()}</td>
                <td>{`${contact.first_name} ${contact.last_name}`}</td>
                <td>{contact.email}</td>
                <td>{contact.phone}</td>
                <td>
                  <div className="action-button-bank">
                    <button 
                      className="verify-button"
                      onClick={() => handleViewDetails(contact)}
                    >
                      View
                    </button>
                    <button 
                      className="reject-button"
                      onClick={() => handleDelete(contact.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Contact Details Modal */}
      {showModal && selectedContact && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Contact Details</h2>
              <button className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-group">
                <label>Full Name:</label>
                <p>{`${selectedContact.first_name} ${selectedContact.last_name}`}</p>
              </div>
              <div className="detail-group">
                <label>Email:</label>
                <p>{selectedContact.email}</p>
              </div>
              <div className="detail-group">
                <label>Phone:</label>
                <p>{selectedContact.phone}</p>
              </div>
              <div className="detail-group">
                <label>Message:</label>
                <p>{selectedContact.message}</p>
              </div>
              <div className="detail-group">
                <label>Submitted On:</label>
                <p>{new Date(selectedContact.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
