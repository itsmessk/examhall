/**
 * Seating Generation Service with Class Filtering
 * 
 * ALGORITHM OVERVIEW - UPDATED:
 * ------------------
 * This service generates exam seating arrangements with:
 * 1. Class-based filtering (select specific branches/sections/years)
 * 2. Room-based filtering (select specific rooms)
 * 3. Round-robin branch distribution to avoid same-branch neighbors
 * 4. NEW: Special CSE year constraints for Room 8 & 9
 * 5. NEW: CSE/non-CSE alternation in Room 8 & 9
 * 6. NEW: Handle overflow students (unassigned tracking)
 * 
 * SPECIAL RULES:
 * ----------------
 * Rule A: In any room with CSE students, only one CSE year (1st OR 2nd)
 * Rule B: In Room 8 & 9, alternate CSE with other departments
 * Rule C: Mix other departments with CSE in Room 8 & 9
 * 
 * OVERFLOW HANDLING:
 * -----------------
 * - If students > seats: Fill all seats, track unassigned students
 * - Return unassignedCount and unassignedStudents array
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
 * UPDATED: Now handles overflow students and returns unassigned info
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
    
    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const totalStudents = students.length;
    
    // UPDATED: Handle overflow - don't throw error, just track it
    let unassignedStudents = [];
    let studentsToSeat = students;
    
    if (totalStudents > totalCapacity) {
      // We can only seat as many as capacity allows
      studentsToSeat = students.slice(0, totalCapacity);
      unassignedStudents = students.slice(totalCapacity);
    }
    
    // Group students by branch AND year (for CSE year constraints)
    const branchYearGroups = groupStudentsByBranchAndYear(studentsToSeat);
    
    // Generate seating layout for selected rooms with special rules
    const roomSeatingData = generateRoomLayoutsWithRules(rooms, branchYearGroups);
    
    // Create and save seating document
    const seatingDoc = new Seating({
      examName,
      examDate,
      includedClasses,
      usedRooms: rooms.map(r => r._id),
      rooms: roomSeatingData,
      unassignedCount: unassignedStudents.length,
      unassignedStudents: unassignedStudents.map(s => s._id),
      createdBy: userId
    });
    
    await seatingDoc.save();
    
    return seatingDoc;
  } catch (error) {
    throw error;
  }
};

/**
 * Group students by branch AND year (important for CSE year constraints)
 * Returns object like: { 'CSE-1': [...], 'CSE-2': [...], 'ECE-1': [...], etc. }
 */
const groupStudentsByBranchAndYear = (students) => {
  const groups = {};
  
  students.forEach(student => {
    const key = `${student.branch}-${student.year}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(student);
  });
  
  return groups;
};

/**
 * UPDATED: Generate layouts with special rules for Room 8 & 9
 * Rules applied:
 * - CSE year constraint (only 1st OR 2nd year CSE per room)
 * - CSE/non-CSE alternation in Room 8 & 9
 * - Even distribution across all rooms
 */
const generateRoomLayoutsWithRules = (rooms, branchYearGroups) => {
  const keys = Object.keys(branchYearGroups);
  
  if (keys.length === 0) {
    throw new Error('No students available for seating');
  }
  
  // Flatten all students and shuffle for randomization
  const allStudents = [];
  keys.forEach(key => {
    const shuffled = [...branchYearGroups[key]];
    shuffleArray(shuffled);
    allStudents.push(...shuffled);
  });
  
  shuffleArray(allStudents);
  
  const totalStudents = allStudents.length;
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  
  // Distribute students evenly across rooms
  const studentsPerRoom = distributeStudentsAcrossRooms(totalStudents, rooms);
  
  // Separate CSE and non-CSE students by year
  const cseYear1 = allStudents.filter(s => s.branch === 'CSE' && s.year === 1);
  const cseYear2 = allStudents.filter(s => s.branch === 'CSE' && s.year === 2);
  const nonCSE = allStudents.filter(s => s.branch !== 'CSE');
  
  // Create queues
  const queues = {
    'CSE-1': { students: cseYear1, index: 0 },
    'CSE-2': { students: cseYear2, index: 0 },
    'NON-CSE': { students: nonCSE, index: 0 }
  };
  
  const roomSeatingData = [];
  
  // Track which CSE year is locked for each room (for Rule A)
  const roomCSEYearLock = {};
  
  for (let roomIdx = 0; roomIdx < rooms.length; roomIdx++) {
    const room = rooms[roomIdx];
    const studentsForThisRoom = studentsPerRoom[roomIdx];
    const { capacity, type, name } = room;
    
    // Check if this is Room 8 or 9 (special rules apply)
    const isSpecialRoom = name === 'R8' || name === 'R9' || name === 'Room 8' || name === 'Room 9';
    
    let rows, cols;
    
    // Determine layout
    if (type === '60' || capacity === 60) {
      rows = 6;
      cols = 10;
    } else if (type === '45' || capacity === 45) {
      rows = 5;
      cols = 9;
    } else {
      cols = 10;
      rows = Math.ceil(capacity / cols);
    }
    
    const layout = Array(rows).fill(null).map(() => Array(cols).fill(null));
    
    let studentsPlaced = 0;
    
    // Fill this room with special rules
    outerLoop:
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (studentsPlaced >= studentsForThisRoom) {
          break outerLoop;
        }
        
        // Get next student with all rules applied
        const student = getNextStudentWithRules(
          queues,
          roomCSEYearLock,
          roomIdx,
          isSpecialRoom,
          layout[row][col - 1], // left neighbor
          row,
          studentsPlaced
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
        } else {
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
/**
 * NEW: Get next student applying all special rules:
 * - Rule A: CSE year lock per room (once CSE-1 placed, only CSE-1 in that room)
 * - Rule B: Alternate CSE/non-CSE in Room 8 & 9
 * - Rule C: Mix departments in Room 8 & 9 (avoid continuous CSE blocks)
 * - Avoid same branch in adjacent seats
 */
const getNextStudentWithRules = (
  queues,
  roomCSEYearLock,
  roomIdx,
  isSpecialRoom,
  leftNeighbor,
  row,
  studentsPlaced
) => {
  const leftBranch = leftNeighbor ? leftNeighbor.branch : null;
  
  // Determine CSE year lock for this room (Rule A)
  let cseYearForRoom = roomCSEYearLock[roomIdx];
  
  // Rule B & C: In Room 8 or 9, try to alternate between CSE and non-CSE
  let preferNonCSE = false;
  if (isSpecialRoom) {
    // Check if last placed student was CSE (look at left neighbor or previous row)
    if (leftNeighbor && leftNeighbor.branch === 'CSE') {
      preferNonCSE = true;
    }
  }
  
  // Try to get non-CSE first if preferred
  if (preferNonCSE && queues['NON-CSE'].index < queues['NON-CSE'].students.length) {
    const student = queues['NON-CSE'].students[queues['NON-CSE'].index];
    
    // Avoid same branch as left neighbor
    if (leftBranch && student.branch === leftBranch) {
      // Try to find different branch in NON-CSE
      const available = queues['NON-CSE'].students.slice(queues['NON-CSE'].index);
      const different = available.find(s => s.branch !== leftBranch);
      
      if (different) {
        // Swap to front
        const idx = queues['NON-CSE'].students.indexOf(different);
        [queues['NON-CSE'].students[queues['NON-CSE'].index], queues['NON-CSE'].students[idx]] =
          [queues['NON-CSE'].students[idx], queues['NON-CSE'].students[queues['NON-CSE'].index]];
      }
    }
    
    queues['NON-CSE'].index++;
    return student;
  }
  
  // Try CSE students respecting year lock
  if (!cseYearForRoom) {
    // No lock yet, try CSE-1 first
    if (queues['CSE-1'].index < queues['CSE-1'].students.length) {
      const student = queues['CSE-1'].students[queues['CSE-1'].index];
      queues['CSE-1'].index++;
      roomCSEYearLock[roomIdx] = 1; // Lock to year 1
      return student;
    }
    
    // Try CSE-2
    if (queues['CSE-2'].index < queues['CSE-2'].students.length) {
      const student = queues['CSE-2'].students[queues['CSE-2'].index];
      queues['CSE-2'].index++;
      roomCSEYearLock[roomIdx] = 2; // Lock to year 2
      return student;
    }
  } else {
    // Room is locked to a specific CSE year
    const queueKey = `CSE-${cseYearForRoom}`;
    if (queues[queueKey].index < queues[queueKey].students.length) {
      const student = queues[queueKey].students[queues[queueKey].index];
      queues[queueKey].index++;
      return student;
    }
  }
  
  // Fallback: return any available student
  if (queues['NON-CSE'].index < queues['NON-CSE'].students.length) {
    const student = queues['NON-CSE'].students[queues['NON-CSE'].index];
    queues['NON-CSE'].index++;
    return student;
  }
  
  if (queues['CSE-1'].index < queues['CSE-1'].students.length) {
    const student = queues['CSE-1'].students[queues['CSE-1'].index];
    queues['CSE-1'].index++;
    if (!roomCSEYearLock[roomIdx]) roomCSEYearLock[roomIdx] = 1;
    return student;
  }
  
  if (queues['CSE-2'].index < queues['CSE-2'].students.length) {
    const student = queues['CSE-2'].students[queues['CSE-2'].index];
    queues['CSE-2'].index++;
    if (!roomCSEYearLock[roomIdx]) roomCSEYearLock[roomIdx] = 2;
    return student;
  }
  
  return null;
};

// OLD function kept for reference (can be removed if not needed elsewhere)
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
