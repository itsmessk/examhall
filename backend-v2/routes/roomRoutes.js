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
    
    // Create R1-R6 with 60 capacity
    for (let i = 1; i <= 6; i++) {
      rooms.push({
        name: `R${i}`,
        capacity: 60,
        type: '60'
      });
    }
    
    // Create R7 with 45 capacity
    rooms.push({
      name: 'R7',
      capacity: 45,
      type: '45'
    });
    
    // Create R8-R10 with 45 capacity
    for (let i = 8; i <= 10; i++) {
      rooms.push({
        name: `R${i}`,
        capacity: 45,
        type: '45'
      });
    }
    
    // Create R11-R16 with 60 capacity
    for (let i = 11; i <= 16; i++) {
      rooms.push({
        name: `R${i}`,
        capacity: 60,
        type: '60'
      });
    }
    
    // Create R17-R20 with 45 capacity
    for (let i = 17; i <= 20; i++) {
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
    // UPDATED: Natural sorting for R1, R2, ... R10 (not string sort)
    const rooms = await Room.find().lean();
    
    // Custom sort to handle R1-R10 properly
    rooms.sort((a, b) => {
      const numA = parseInt(a.name.replace('R', ''));
      const numB = parseInt(b.name.replace('R', ''));
      return numA - numB;
    });
    
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
