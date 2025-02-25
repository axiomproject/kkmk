interface DonationSubmission {
  fullName: string;
  email: string;
  contactNumber: string;
  amount: number;
  message?: string;
  proofOfPayment?: string;
  date: string;
}

const API_URL = 'http://localhost:5175/api/donations';  // Use the direct port number from your server.js

class DonationService {
  static async submitDonation(formData: FormData) {
    try {
      const response = await fetch(`${API_URL}`, {  // Remove /donations from here since it's in the base URL
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          // Don't set Content-Type when sending FormData
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit donation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting donation:', error);
      throw error;
    }
  }

  static async getDonations() {
    try {
      const response = await fetch(`${API_URL}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch donations');
      }

      const data = await response.json();
      console.log('Fetched donations:', data); // Add logging
      return data;
    } catch (error) {
      console.error('Error fetching donations:', error);
      throw error;
    }
  }

  static async verifyDonation(id: number) {
    try {
      const response = await fetch(`${API_URL}/${id}/verify`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify donation');
      }

      const data = await response.json();
      console.log('Verification response:', data);
      return data;
    } catch (error) {
      console.error('Error verifying donation:', error);
      throw error;
    }
  }

  static async rejectDonation(id: number, reason: string) {
    try {
      const response = await fetch(`${API_URL}/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to reject donation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error rejecting donation:', error);
      throw error;
    }
  }

  static async deleteDonation(id: number) {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete donation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting donation:', error);
      throw error;
    }
  }
}

export default {
  submitDonation: DonationService.submitDonation,
  getDonations: DonationService.getDonations,
  verifyDonation: DonationService.verifyDonation,
  rejectDonation: DonationService.rejectDonation,
  deleteDonation: DonationService.deleteDonation, // Use the class method directly
};
