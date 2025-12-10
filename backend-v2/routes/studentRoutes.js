const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const ClassGroup = require('../models/ClassGroup');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/students/seed
 * @desc    Seed database with student data - UPDATED for new structure
 * @access  Private (Admin)
 */
router.post('/seed', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Clear existing students
    await Student.deleteMany({});
    
    // UPDATED: New student structure
    // CSE: A & B sections for years 1 & 2 (200 students)
    // Others: A section only for years 1 & 2 (50 students each = 500 students)
    // Total: 700 students
    
    const students = [];
    
    // Get all class groups
    const classGroups = await ClassGroup.find();
    const classGroupMap = {};
    
    classGroups.forEach(cg => {
      const key = `${cg.branch}-${cg.section}-${cg.year}`;
      classGroupMap[key] = cg._id;
    });
    
    // Define department configuration
    const deptConfig = [
      { branch: 'CIVIL', sections: ['A'] },
      { branch: 'CSE', sections: ['A', 'B'] },  // Only CSE has 2 sections
      { branch: 'ECE', sections: ['A'] },
      { branch: 'EEE', sections: ['A'] },
      { branch: 'IT', sections: ['A'] },
      { branch: 'MECH', sections: ['A'] }
    ];
    
    const years = [1, 2];
    const studentsPerSection = 50;
    
    // Generate students for each dept/year/section
    deptConfig.forEach(({ branch, sections }) => {
      years.forEach(year => {
        sections.forEach(section => {
          for (let i = 1; i <= studentsPerSection; i++) {
            const registerNumber = `${year}${branch}${section}${String(i).padStart(3, '0')}`;
            const name = `${branch} ${section} Student ${i}`;
            const classGroupKey = `${branch}-${section}-${year}`;
            
            students.push({
              registerNumber,
              name,
              branch,
              section,
              year,
              classGroup: classGroupMap[classGroupKey] || null
            });
          }
        });
      });
    });
    
    // Insert all students
    await Student.insertMany(students);
    
    res.status(201).json({
      success: true,
      message: `Successfully seeded ${students.length} students`,
      count: students.length
    });
  } catch (error) {
    console.error('Error seeding students:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding students',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/students
 * @desc    Get all students (with optional filters)
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { branch, section, year, classGroup } = req.query;
    const filter = {};
    
    if (branch) filter.branch = branch;
    if (section) filter.section = section;
    if (year) filter.year = parseInt(year);
    if (classGroup) filter.classGroup = classGroup;
    
    const students = await Student.find(filter)
      .populate('classGroup')
      .sort({ registerNumber: 1 });
    
    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/students/:id
 * @desc    Get single student
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('classGroup');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student',
      error: error.message
    });
  }
});

module.exports = router;
