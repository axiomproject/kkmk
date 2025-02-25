const createEvent = async (req, res) => {
  try {
    const {
      title,
      date,
      location,
      latitude,
      longitude,
      // ... other fields
    } = req.body;

    // Log the received data for debugging
    console.log('Received event data:', {
      title,
      latitude,
      longitude,
      location
    });

    const event = await prisma.event.create({
      data: {
        title,
        date,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        // ... other fields
      },
    });

    res.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      date,
      location,
      latitude,
      longitude,
      // ... other fields
    } = req.body;

    // Log the received data for debugging
    console.log('Updating event data:', {
      id,
      title,
      latitude,
      longitude,
      location
    });

    const event = await prisma.event.update({
      where: { id: parseInt(id) },
      data: {
        title,
        date,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        // ... other fields
      },
    });

    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};
