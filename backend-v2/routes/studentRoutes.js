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
    
    // UPDATED: New student structure with custom class strengths
    // FIRST 6 CLASSES (CIVIL + CSE): 80 students each = 480 students
    // REMAINING 8 CLASSES (ECE, EEE, IT, MECH): 55 students each = 440 students
    // Total: 920 students
    
    const students = [];
    
    // Get all class groups
    const classGroups = await ClassGroup.find();
    const classGroupMap = {};
    
    classGroups.forEach(cg => {
      const key = `${cg.branch}-${cg.section}-${cg.year}`;
      classGroupMap[key] = cg._id;
    });
    
    // UPDATED: Define department configuration with custom student counts
    const deptConfig = [
      { branch: 'CIVIL', sections: ['A'], studentsPerSection: 80 },  // UPDATED: Class size changed to 80
      { branch: 'CSE', sections: ['A', 'B'], studentsPerSection: 80 },  // UPDATED: Class size changed to 80
      { branch: 'ECE', sections: ['A'], studentsPerSection: 55 },  // UPDATED: Class size changed to 55
      { branch: 'EEE', sections: ['A'], studentsPerSection: 55 },  // UPDATED: Class size changed to 55
      { branch: 'IT', sections: ['A'], studentsPerSection: 55 },  // UPDATED: Class size changed to 55
      { branch: 'MECH', sections: ['A'], studentsPerSection: 55 }  // UPDATED: Class size changed to 55
    ];
    
    const years = [1, 2];
    
    // Generate students for each dept/year/section
    deptConfig.forEach(({ branch, sections, studentsPerSection }) => {
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
