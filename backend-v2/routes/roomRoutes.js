const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/rooms/seed
 * @desc    Seed database with room data
 * @access  Private (Admin)
 */
router.post('/seed', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Clear existing rooms
    await Room.deleteMany({});
    
    const rooms = [];
    
    // Create 6 rooms with 60 capacity (R1-R6)
    for (let i = 1; i <= 6; i++) {
      rooms.push({
        name: `R${i}`,
        capacity: 60,
        type: '60'
      });
    }
    
    // Create 4 rooms with 45 capacity (R7-R10)
    for (let i = 7; i <= 10; i++) {
      rooms.push({
        name: `R${i}`,
        capacity: 45,
        type: '45'
      });
    }
    
    // Insert all rooms
    await Room.insertMany(rooms);
    
    res.status(201).json({
      success: true,
      message: `Successfully seeded ${rooms.length} rooms`,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Error seeding rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding rooms',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/rooms
 * @desc    Get all rooms
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ name: 1 });
    
    res.json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rooms',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/rooms/:id
 * @desc    Get single room
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching room',
      error: error.message
    });
  }
});

module.exports = router;
