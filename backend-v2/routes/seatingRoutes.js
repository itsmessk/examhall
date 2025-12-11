const express = require('express');
const router = express.Router();
const {
  generateSeating,
  getLatestSeating,
  getSeatingById,
  getAllSeatings
} = require('../services/seatingGenerator');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/seating/generate
 * @desc    Generate seating arrangement
 * @access  Private (Admin)
 */
router.post('/generate', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { examName, examDate, classIds, roomIds } = req.body;
    
    // Validation
    if (!examName || !examDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide examName and examDate'
      });
    }
    
    // Generate seating
    const seating = await generateSeating(
      examName,
      new Date(examDate),
      classIds || [],
      roomIds || [],
      req.user._id
    );
    
    // Build summary message
    let message = 'Seating arrangement generated successfully';
    if (seating.unassignedCount > 0) {
      message += `. Warning: ${seating.unassignedCount} students could not be assigned (insufficient seats)`;
    }
    
    res.status(201).json({
      success: true,
      message,
      data: seating
    });
  } catch (error) {
    console.error('Error generating seating:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating seating arrangement',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/seating/latest
 * @desc    Get latest seating arrangement
 * @access  Private
 */
router.get('/latest', authMiddleware, async (req, res) => {
  try {
    const seating = await getLatestSeating();
    
    if (!seating) {
      return res.status(404).json({
        success: false,
        message: 'No seating arrangement found'
      });
    }
    
    res.json({
      success: true,
      data: seating
    });
  } catch (error) {
    console.error('Error fetching latest seating:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching seating arrangement',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/seating/:id
 * @desc    Get seating arrangement by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const seating = await getSeatingById(req.params.id);
    
    if (!seating) {
      return res.status(404).json({
        success: false,
        message: 'Seating arrangement not found'
      });
    }
    
    res.json({
      success: true,
      data: seating
    });
  } catch (error) {
    console.error('Error fetching seating:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching seating arrangement',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/seating
 * @desc    Get all seating arrangements
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const seatings = await getAllSeatings();
    
    res.json({
      success: true,
      count: seatings.length,
      data: seatings
    });
  } catch (error) {
    console.error('Error fetching seatings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching seating arrangements',
      error: error.message
    });
  }
});

module.exports = router;
