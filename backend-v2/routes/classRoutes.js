const express = require('express');
const router = express.Router();
const ClassGroup = require('../models/ClassGroup');
const Student = require('../models/Student');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/classes/seed
 * @desc    Seed class groups
 * @access  Private (Admin)
 */
router.post('/seed', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Clear existing class groups
    await ClassGroup.deleteMany({});
    
    const branches = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
    const sections = ['A', 'B'];
    const year = 3; // Default to 3rd year
    
    const classGroups = [];
    
    branches.forEach(branch => {
      sections.forEach(section => {
        classGroups.push({
          branch,
          section,
          year,
          displayName: `${branch} ${section} - Year ${year}`
        });
      });
    });
    
    await ClassGroup.insertMany(classGroups);
    
    res.status(201).json({
      success: true,
      message: `Successfully seeded ${classGroups.length} class groups`,
      count: classGroups.length,
      data: classGroups
    });
  } catch (error) {
    console.error('Error seeding classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding class groups',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/classes
 * @desc    Get all class groups with student counts
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const classGroups = await ClassGroup.find().sort({ branch: 1, section: 1 });
    
    // Get student counts for each class
    const classesWithCounts = await Promise.all(
      classGroups.map(async (classGroup) => {
        const studentCount = await Student.countDocuments({
          branch: classGroup.branch,
          section: classGroup.section,
          year: classGroup.year
        });
        
        return {
          _id: classGroup._id,
          branch: classGroup.branch,
          section: classGroup.section,
          year: classGroup.year,
          displayName: classGroup.displayName,
          studentCount
        };
      })
    );
    
    res.json({
      success: true,
      count: classesWithCounts.length,
      data: classesWithCounts
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class groups',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/classes/:id
 * @desc    Get single class group
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const classGroup = await ClassGroup.findById(req.params.id);
    
    if (!classGroup) {
      return res.status(404).json({
        success: false,
        message: 'Class group not found'
      });
    }
    
    const studentCount = await Student.countDocuments({
      branch: classGroup.branch,
      section: classGroup.section,
      year: classGroup.year
    });
    
    res.json({
      success: true,
      data: {
        ...classGroup.toObject(),
        studentCount
      }
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class group',
      error: error.message
    });
  }
});

module.exports = router;
