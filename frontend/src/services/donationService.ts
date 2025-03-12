import axios from 'axios';
import api from '../config/axios'; // Import your configured API client

// Define the API base URL based on the environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';
const API_PATH = '/api/donations';

class DonationService {
  /**
   * Get all donations
   */
  async getDonations() {
    try {
      // Use the pre-configured api instance that has the correct baseURL
      const response = await api.get('/donations');
      return response.data;
    } catch (error) {
      console.error('Error fetching donations:', error);
      throw new Error('Failed to fetch donations');
    }
  }

  /**
   * Add a new donation
   */
  async addDonation(formData: FormData) {
    try {
      const response = await api.post('/donations', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error adding donation:', error);
      throw new Error('Failed to add donation');
    }
  }

  /**
   * Delete a donation
   */
  async deleteDonation(id: number) {
    try {
      // Use the api instance with the correct base URL
      const response = await api.delete(`/donations/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting donation:', error);
      throw new Error('Failed to delete donation');
    }
  }

  /**
   * Verify a donation
   */
  async verifyDonation(id: number) {
    try {
      const response = await api.put(`/donations/${id}/verify`);
      return response.data;
    } catch (error) {
      console.error('Error verifying donation:', error);
      throw new Error('Failed to verify donation');
    }
  }

  /**
   * Reject a donation
   */
  async rejectDonation(id: number, reason: string) {
    try {
      const response = await api.put(`/donations/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error rejecting donation:', error);
      throw new Error('Failed to reject donation');
    }
  }
}

export default new DonationService();
