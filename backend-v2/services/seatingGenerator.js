/**
 * Seating Generation Service with Class Filtering
 * 
 * ALGORITHM OVERVIEW:
 * ------------------
 * This service generates exam seating arrangements with:
 * 1. Class-based filtering (select specific branches/sections/years)
 * 2. Room-based filtering (select specific rooms)
 * 3. Round-robin branch distribution to avoid same-branch neighbors
 * 
 * SEATING STRATEGY:
 * ----------------
 * - For 60-capacity rooms: 6 rows × 10 columns layout
 * - For 45-capacity rooms: 5 rows × 9 columns layout
 * - Students picked in round-robin from different branches
 * - Checks left neighbor to avoid same-branch adjacency
 * 
 * CAPACITY HANDLING:
 * -----------------
 * - If students < total seats: some seats remain empty
 * - If students > total seats: only first N students get seats (others unassigned)
 * - Students are sorted by registerNumber for fairness
 * 
 * TIME COMPLEXITY: O(n) where n = number of students
 * SPACE COMPLEXITY: O(n) for storing branch queues and layouts
 */

const Student = require('../models/Student');
const Room = require('../models/Room');
const ClassGroup = require('../models/ClassGroup');
const Seating = require('../models/Seating');

/**
 * Main function to generate seating arrangement with class/room filtering
 */
const generateSeating = async (examName, examDate, classIds, roomIds, userId) => {
  try {
    // Fetch selected classes
    let classFilter = {};
    let includedClasses = [];
    
    if (classIds && classIds.length > 0) {
      const selectedClasses = await ClassGroup.find({ _id: { $in: classIds } });
      
      // Build filter for students
      const orConditions = selectedClasses.map(cls => ({
        branch: cls.branch,
        section: cls.section,
        year: cls.year
      }));
      
      classFilter = { $or: orConditions };
      
      // Store class info for seating record
      includedClasses = selectedClasses.map(cls => ({
        classId: cls._id,
        branch: cls.branch,
        section: cls.section,
        year: cls.year,
        displayName: cls.displayName
      }));
    }
    
    // Fetch students based on class filter
    const students = await Student.find(classFilter).sort({ registerNumber: 1 }).lean();
    
    if (!students.length) {
      throw new Error('No students found for selected classes.');
    }
    
    // Fetch rooms
    let rooms;
    if (roomIds && roomIds.length > 0) {
      rooms = await Room.find({ _id: { $in: roomIds } }).sort({ name: 1 }).lean();
    } else {
      rooms = await Room.find().sort({ name: 1 }).lean();
    }
    
    if (!rooms.length) {
      throw new Error('No rooms found.');
    }
    
    // Group students by branch
    const branchGroups = groupStudentsByBranch(students);
    
    // Generate seating layout for selected rooms
    const roomSeatingData = generateRoomLayouts(rooms, branchGroups);
    
    // Create and save seating document
    const seatingDoc = new Seating({
      examName,
      examDate,
      includedClasses,
      usedRooms: rooms.map(r => r._id),
      rooms: roomSeatingData,
      createdBy: userId
    });
    
    await seatingDoc.save();
    
    return seatingDoc;
  } catch (error) {
    throw error;
  }
};

/**
 * Group students by branch into separate arrays
 */
const groupStudentsByBranch = (students) => {
  const groups = {};
  
  students.forEach(student => {
    if (!groups[student.branch]) {
      groups[student.branch] = [];
    }
    groups[student.branch].push(student);
  });
  
  return groups;
};

/**
 * Generate layouts for all rooms using round-robin branch distribution
 * NEW: Distributes students EVENLY across all rooms first, then fills each room
 */
const generateRoomLayouts = (rooms, branchGroups) => {
  const branches = Object.keys(branchGroups);
  
  if (branches.length === 0) {
    throw new Error('No students available for seating');
  }
  
  // Flatten all students into a single array
  const allStudents = [];
  branches.forEach(branch => {
    allStudents.push(...branchGroups[branch]);
  });
  
  const totalStudents = allStudents.length;
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  
  if (totalStudents > totalCapacity) {
    throw new Error(`Not enough seats: ${totalStudents} students but only ${totalCapacity} seats available`);
  }
  
  // Calculate how many students should go in each room (distribute evenly)
  const studentsPerRoom = distributeStudentsAcrossRooms(totalStudents, rooms);
  
  // Shuffle students for randomization while maintaining branch groups
  const shuffledByBranch = {};
  branches.forEach(branch => {
    shuffledByBranch[branch] = [...branchGroups[branch]];
    shuffleArray(shuffledByBranch[branch]);
  });
  
  // Create queues for round-robin distribution
  const branchQueues = {};
  const branchIndices = {};
  
  branches.forEach(branch => {
    branchQueues[branch] = shuffledByBranch[branch];
    branchIndices[branch] = 0;
  });
  
  let currentBranchIndex = 0;
  const roomSeatingData = [];
  
  // Fill each room with its allocated number of students
  for (let roomIdx = 0; roomIdx < rooms.length; roomIdx++) {
    const room = rooms[roomIdx];
    const studentsForThisRoom = studentsPerRoom[roomIdx];
    const { capacity, type } = room;
    let rows, cols;
    
    // Determine layout dimensions based on capacity
    if (type === '60' || capacity === 60) {
      rows = 6;
      cols = 10;
    } else if (type === '45' || capacity === 45) {
      rows = 5;
      cols = 9;
    } else {
      // Custom capacity
      cols = 10;
      rows = Math.ceil(capacity / cols);
    }
    
    // Initialize 2D layout with nulls
    const layout = Array(rows).fill(null).map(() => Array(cols).fill(null));
    
    let studentsPlaced = 0;
    
    // Fill the layout with allocated students
    outerLoop:
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (studentsPlaced >= studentsForThisRoom) {
          break outerLoop;
        }
        
        // Get student from current branch with conflict avoidance
        const student = getNextStudent(
          branchQueues,
          branchIndices,
          branches,
          currentBranchIndex,
          layout[row][col - 1] // Previous seat in same row
        );
        
        if (student) {
          layout[row][col] = {
            studentId: student._id,
            registerNumber: student.registerNumber,
            name: student.name,
            branch: student.branch,
            section: student.section,
            year: student.year
          };
          
          studentsPlaced++;
          // Move to next branch for round-robin
          currentBranchIndex = (currentBranchIndex + 1) % branches.length;
        } else {
          // No more students available
          break outerLoop;
        }
      }
    }
    
    roomSeatingData.push({
      roomId: room._id,
      roomName: room.name,
      layout
    });
  }
  
  return roomSeatingData;
};

/**
 * Distribute students evenly across rooms
 * Returns array of student counts per room
 */
const distributeStudentsAcrossRooms = (totalStudents, rooms) => {
  const numRooms = rooms.length;
  const studentsPerRoom = [];
  
  // Calculate base students per room and remainder
  const basePerRoom = Math.floor(totalStudents / numRooms);
  let remainder = totalStudents % numRooms;
  
  // Distribute students, giving priority to larger rooms for the extra students
  for (let i = 0; i < numRooms; i++) {
    let count = basePerRoom;
    
    // Add one extra student to some rooms to account for remainder
    if (remainder > 0) {
      count++;
      remainder--;
    }
    
    // Don't exceed room capacity
    count = Math.min(count, rooms[i].capacity);
    
    studentsPerRoom.push(count);
  }
  
  return studentsPerRoom;
};

/**
 * Shuffle array in place (Fisher-Yates algorithm)
 */
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

/**
 * Get next student using round-robin with conflict avoidance
 * Tries to avoid placing same-branch student adjacent to left neighbor
 */
const getNextStudent = (branchQueues, branchIndices, branches, startIndex, leftNeighbor) => {
  const maxAttempts = branches.length;
  let attempts = 0;
  let currentIndex = startIndex;
  
  // Try to find a student from a different branch than left neighbor
  while (attempts < maxAttempts) {
    const branch = branches[currentIndex];
    const queue = branchQueues[branch];
    const index = branchIndices[branch];
    
    // Check if this branch has students available
    if (index < queue.length) {
      const student = queue[index];
      
      // Check if placing this student creates a conflict with left neighbor
      const hasConflict = leftNeighbor && leftNeighbor.branch === student.branch;
      
      if (!hasConflict) {
        // No conflict - use this student
        branchIndices[branch]++;
        return student;
      }
    }
    
    // Try next branch
    currentIndex = (currentIndex + 1) % branches.length;
    attempts++;
  }
  
  // If all branches tried and conflicts exist, pick next available student anyway
  // (Accept occasional conflicts when unavoidable)
  for (let i = 0; i < branches.length; i++) {
    const branch = branches[(startIndex + i) % branches.length];
    const queue = branchQueues[branch];
    const index = branchIndices[branch];
    
    if (index < queue.length) {
      branchIndices[branch]++;
      return queue[index];
    }
  }
  
  return null; // No students left
};

/**
 * Check if there are more students available in any branch
 */
const hasMoreStudents = (branchQueues, branchIndices) => {
  for (const branch in branchQueues) {
    if (branchIndices[branch] < branchQueues[branch].length) {
      return true;
    }
  }
  return false;
};

/**
 * Get latest seating arrangement
 */
const getLatestSeating = async () => {
  try {
    const seating = await Seating.findOne()
      .sort({ createdAt: -1 })
      .populate('usedRooms')
      .populate('includedClasses.classId')
      .populate('createdBy', 'name email');
    
    return seating;
  } catch (error) {
    throw error;
  }
};

/**
 * Get seating by ID
 */
const getSeatingById = async (id) => {
  try {
    const seating = await Seating.findById(id)
      .populate('usedRooms')
      .populate('includedClasses.classId')
      .populate('createdBy', 'name email');
    
    return seating;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all seatings
 */
const getAllSeatings = async () => {
  try {
    const seatings = await Seating.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .select('examName examDate includedClasses createdAt createdBy');
    
    return seatings;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateSeating,
  getLatestSeating,
  getSeatingById,
  getAllSeatings
};
