
const express = require('express');
const router = express.Router();
const axios = require('axios');
const authenticateToken = require('../middleware/authenticateToken');

// Reverse geocoding endpoint (convert coordinates to address)
router.get('/reverse', authenticateToken, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Make request to OpenStreetMap's Nominatim API
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse`, {
        params: {
          format: 'json',
          lat: lat,
          lon: lon,
          addressdetails: 1,
          'accept-language': 'en'
        },
        headers: {
          'User-Agent': 'KKMKApp/1.0', // Required by OSM policy
        }
      }
    );

    // Add delay to respect OpenStreetMap's usage policy
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extract and format address
    const address = response.data.display_name;
    
    res.json({ address });
  } catch (error) {
    console.error('Error in geocoding:', error);
    res.status(500).json({ 
      error: 'Failed to get address information',
      details: error.message
    });
  }
});

module.exports = router;