/**
 * Seating Generation Service with Class Filtering
 * 
 * ALGORITHM OVERVIEW - UPDATED:
 * ------------------
 * This service generates exam seating arrangements with:
 * 1. Class-based filtering (select specific branches/sections/years)
 * 2. Room-based filtering (select specific rooms)
 * 3. STRICT year separation - each room contains ONLY Year 1 OR ONLY Year 2
 * 4. NEW: CSE/non-CSE alternation in ALL rooms for proper mixing
 * 5. NEW: Smart gap distribution - evenly space empty seats instead of bottom-filling
 * 6. Handle overflow students (unassigned tracking)
 * 
 * SPECIAL RULES:
 * ----------------
 * Rule A: YEAR LOCK - Each room must contain only Year 1 OR only Year 2 students (NO MIXING)
 *         ✅ Can mix: CSE Year 1 A + CSE Year 1 B in same room
 *         ✅ Can mix: CIVIL Year 1 + EEE Year 1 in same room
 *         ❌ Cannot mix: CSE Year 1 + CSE Year 2 in same room
 *         ❌ Cannot mix: Any Year 1 + Any Year 2 in same room
 * Rule B: In ALL rooms, alternate CSE with other departments for better mixing (respecting year lock)
 * Rule C: Avoid same branch in adjacent seats when possible
 * Rule D: Smart gaps - distribute empty seats evenly throughout room
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
      rooms = await Room.find({ _id: { $in: roomIds } }).lean();
    } else {
      rooms = await Room.find().lean();
    }
    
    if (!rooms.length) {
      throw new Error('No rooms found.');
    }
    
    // Sort rooms numerically (R1, R2, R3... R10)
    rooms.sort((a, b) => {
      const numA = parseInt(a.name.replace('R', ''));
      const numB = parseInt(b.name.replace('R', ''));
      return numA - numB;
    });
    
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
 * UPDATED: Generate layouts with STRICT rules for Room 8 & 9
 * 
 * CRITICAL RULES IMPLEMENTATION:
 * ------------------------------
 * Rule A: CSE year lock per room - Any room with CSE must have ONLY ONE year (1 or 2)
 * Rule B: In R8/R9 - Alternate CSE with non-CSE (don't fill with CSE only)
 * Rule C: In R8/R9 - Mix all departments, avoid long CSE blocks
 * 
 * ALGORITHM:
 * ----------
 * 1. Separate students into CSE-Year1, CSE-Year2, and NON-CSE pools
 * 2. For each room:
 *    - If R8 or R9: Use alternating pattern (CSE → non-CSE → CSE → ...)
 *    - Lock room to CSE year when first CSE student placed
 *    - For other rooms: Fill normally but respect CSE year lock
 * 3. Track last placed student type to enforce alternation
 */
const generateRoomLayoutsWithRules = (rooms, branchYearGroups) => {
  const keys = Object.keys(branchYearGroups);
  
  if (keys.length === 0) {
    throw new Error('No students available for seating');
  }
  
  // Flatten and shuffle all students
  const allStudents = [];
  keys.forEach(key => {
    const shuffled = [...branchYearGroups[key]];
    shuffleArray(shuffled);
    allStudents.push(...shuffled);
  });
  
  shuffleArray(allStudents);
  
  const totalStudents = allStudents.length;
  
  // Distribute students evenly across rooms
  const studentsPerRoom = distributeStudentsAcrossRooms(totalStudents, rooms);
  
  // UPDATED: Create separate pools by YEAR and branch for strict year separation
  const year1Students = allStudents.filter(s => s.year === 1);
  const year2Students = allStudents.filter(s => s.year === 2);
  
  // Further split by CSE/non-CSE within each year
  const cseYear1Pool = year1Students.filter(s => s.branch === 'CSE');
  const nonCSEYear1Pool = year1Students.filter(s => s.branch !== 'CSE');
  const cseYear2Pool = year2Students.filter(s => s.branch === 'CSE');
  const nonCSEYear2Pool = year2Students.filter(s => s.branch !== 'CSE');
  
  // Shuffle each pool
  shuffleArray(cseYear1Pool);
  shuffleArray(nonCSEYear1Pool);
  shuffleArray(cseYear2Pool);
  shuffleArray(nonCSEYear2Pool);
  
  // Create index trackers by year and type
  const pools = {
    'Year1-CSE': { students: cseYear1Pool, index: 0 },
    'Year1-NonCSE': { students: nonCSEYear1Pool, index: 0 },
    'Year2-CSE': { students: cseYear2Pool, index: 0 },
    'Year2-NonCSE': { students: nonCSEYear2Pool, index: 0 }
  };
  
  const roomSeatingData = [];
  
  // UPDATED: Track YEAR lock per room (null, 1, or 2) - applies to ALL students
  const roomYearLock = {};
  
  for (let roomIdx = 0; roomIdx < rooms.length; roomIdx++) {
    const room = rooms[roomIdx];
    const studentsForThisRoom = studentsPerRoom[roomIdx];
    const { capacity, type, name } = room;
    
    // UPDATED: Apply alternation to ALL rooms for better mixing
    const isSpecialRoom = name === 'R8' || name === 'R9' || name === 'R10';
    
    let rows, cols;
    
    // Determine layout dimensions
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
    
    // UPDATED: Smart gap distribution - calculate which seats to fill
    const totalSeats = rows * cols;
    const emptySeats = totalSeats - studentsForThisRoom;
    const seatsToFill = calculateSeatPositions(rows, cols, studentsForThisRoom);
    
    let studentsPlaced = 0;
    let lastWasCSE = false; // Track if last student was CSE for alternation
    let seatIndex = 0;
    
    // Fill this room seat by seat using calculated positions
    outerLoop:
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const currentPosition = row * cols + col;
        
        // Check if this seat should be filled
        if (!seatsToFill.includes(currentPosition)) {
          continue; // Leave this seat empty (gap)
        }
        
        if (studentsPlaced >= studentsForThisRoom) {
          break outerLoop;
        }
        
        // UPDATED: Apply CSE alternation to ALL rooms (not just special rooms)
        const student = getNextStudentWithStrictRules(
          pools,
          roomYearLock,
          roomIdx,
          true, // Apply alternation to ALL rooms
          lastWasCSE,
          layout[row][col - 1] // left neighbor for branch conflict check
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
          lastWasCSE = (student.branch === 'CSE');
          
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
 * UPDATED: Calculate which seat positions to fill for even gap distribution
 * Instead of filling from top-left and leaving bottom-right empty,
 * this distributes students evenly throughout the room
 * 
 * STRATEGY:
 * ---------
 * - If room is full: fill all seats
 * - If room has gaps: distribute students evenly
 *   Example: 40 students in 45-seat room (5 gaps)
 *   Instead of: fill rows 1-4 completely, row 5 empty
 *   Better: spread 5 gaps across all rows evenly
 * 
 * @param rows - Number of rows in room
 * @param cols - Number of columns in room
 * @param studentsCount - Number of students to seat
 * @returns Array of seat positions (0-indexed) that should be filled
 */
/**
 * Calculate seat positions with even gap distribution
 * Example: 60 seats, 30 students = fill positions 0,2,4,6,8... (every 2nd seat)
 * 
 * ALGORITHM:
 * - If students >= seats: Fill all seats
 * - Otherwise: Calculate interval = totalSeats / studentsCount
 * - Place students at positions: 0, interval, 2*interval, 3*interval...
 * 
 * This ensures even distribution of gaps between students
 */
const calculateSeatPositions = (rows, cols, studentsCount) => {
  const totalSeats = rows * cols;
  
  if (studentsCount >= totalSeats) {
    // Fill all seats
    return Array.from({ length: totalSeats }, (_, i) => i);
  }
  
  const positions = [];
  const interval = totalSeats / studentsCount;
  
  for (let i = 0; i < studentsCount; i++) {
    const position = Math.floor(i * interval);
    positions.push(position);
  }
  
  return positions;
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
 * UPDATED: Get next student with STRICT YEAR LOCK and CSE ALTERNATION enforcement
 * 
 * RULES ENFORCED (in priority order):
 * ------------------------------------
 * 1. Rule A: YEAR LOCK - Each room contains ONLY Year 1 OR ONLY Year 2 (applies to ALL students)
 *            Once first student placed, room locked to that year
 * 2. Rule B: CSE ALTERNATION - In ALL rooms, alternate CSE with non-CSE for better mixing (within same year)
 * 3. Rule C: Avoid same branch in adjacent seats (left neighbor check)
 * 
 * PARAMETERS:
 * -----------
 * @param pools - Object with Year1-CSE, Year1-NonCSE, Year2-CSE, Year2-NonCSE pools
 * @param roomYearLock - Object tracking which year (1 or 2) is locked per room
 * @param roomIdx - Current room index
 * @param applyAlternation - Boolean, true to apply CSE/non-CSE alternation
 * @param lastWasCSE - Boolean, true if previous student was CSE
 * @param leftNeighbor - Previous seat in same row (for branch conflict check)
 * 
 * RETURN:
 * -------
 * Student object or null if no suitable student found
 */
const getNextStudentWithStrictRules = (
  pools,
  roomYearLock,
  roomIdx,
  applyAlternation,
  lastWasCSE,
  leftNeighbor
) => {
  const leftBranch = leftNeighbor ? leftNeighbor.branch : null;
  const yearLock = roomYearLock[roomIdx]; // undefined, 1, or 2
  
  // ============================================================
  // RULE A: STRICT YEAR LOCK - Room locked to Year 1 or Year 2
  // ============================================================
  
  if (yearLock) {
    // Room already locked to a specific year - only use that year's pools
    const csePool = pools[`Year${yearLock}-CSE`];
    const nonCSEPool = pools[`Year${yearLock}-NonCSE`];
    
    // ============================================================
    // RULE B: CSE ALTERNATION - Alternate CSE with non-CSE for better mixing
    // ============================================================
    if (applyAlternation) {
      // If last student was CSE, prefer non-CSE next
      if (lastWasCSE) {
        const nonCSEStudent = getStudentFromPool(nonCSEPool, leftBranch);
        if (nonCSEStudent) return nonCSEStudent;
        
        // If no non-CSE available, try CSE
        const cseStudent = getStudentFromPool(csePool, leftBranch);
        if (cseStudent) return cseStudent;
      } else {
        // Last was non-CSE, prefer CSE next
        const cseStudent = getStudentFromPool(csePool, leftBranch);
        if (cseStudent) return cseStudent;
        
        // If no CSE available, try non-CSE
        const nonCSEStudent = getStudentFromPool(nonCSEPool, leftBranch);
        if (nonCSEStudent) return nonCSEStudent;
      }
    } else {
      // Regular room - try CSE first, then non-CSE (within locked year)
      const cseStudent = getStudentFromPool(csePool, leftBranch);
      if (cseStudent) return cseStudent;
      
      const nonCSEStudent = getStudentFromPool(nonCSEPool, leftBranch);
      if (nonCSEStudent) return nonCSEStudent;
    }
    
    // No students available in locked year
    return null;
  }
  
  // ============================================================
  // No year lock yet - place first student and lock room to that year
  // ============================================================
  
  if (applyAlternation) {
    // Special room - try to start with alternating pattern
    if (!lastWasCSE) {
      // Try Year 1 CSE first
      const y1Cse = getStudentFromPool(pools['Year1-CSE'], leftBranch);
      if (y1Cse) {
        roomYearLock[roomIdx] = 1;
        return y1Cse;
      }
      
      // Try Year 2 CSE
      const y2Cse = getStudentFromPool(pools['Year2-CSE'], leftBranch);
      if (y2Cse) {
        roomYearLock[roomIdx] = 2;
        return y2Cse;
      }
    }
    
    // Try non-CSE (Year 1 first)
    const y1NonCse = getStudentFromPool(pools['Year1-NonCSE'], leftBranch);
    if (y1NonCse) {
      roomYearLock[roomIdx] = 1;
      return y1NonCse;
    }
    
    const y2NonCse = getStudentFromPool(pools['Year2-NonCSE'], leftBranch);
    if (y2NonCse) {
      roomYearLock[roomIdx] = 2;
      return y2NonCse;
    }
  } else {
    // Regular room - try Year 1 pools first, then Year 2
    const y1Cse = getStudentFromPool(pools['Year1-CSE'], leftBranch);
    if (y1Cse) {
      roomYearLock[roomIdx] = 1;
      return y1Cse;
    }
    
    const y1NonCse = getStudentFromPool(pools['Year1-NonCSE'], leftBranch);
    if (y1NonCse) {
      roomYearLock[roomIdx] = 1;
      return y1NonCse;
    }
    
    const y2Cse = getStudentFromPool(pools['Year2-CSE'], leftBranch);
    if (y2Cse) {
      roomYearLock[roomIdx] = 2;
      return y2Cse;
    }
    
    const y2NonCse = getStudentFromPool(pools['Year2-NonCSE'], leftBranch);
    if (y2NonCse) {
      roomYearLock[roomIdx] = 2;
      return y2NonCse;
    }
  }
  
  // No students available
  return null;
};

// REMOVED: getCSEStudentRespectingLock - Year lock now applies to ALL students, not just CSE

/**
 * HELPER: Get student from pool, avoiding left neighbor's branch if possible
 * Returns student object or null
 */
const getStudentFromPool = (pool, leftBranch) => {
  if (pool.index >= pool.students.length) {
    return null; // Pool exhausted
  }
  
  // Try to avoid same branch as left neighbor
  if (leftBranch) {
    // Look ahead in pool for different branch
    for (let i = pool.index; i < Math.min(pool.index + 5, pool.students.length); i++) {
      const student = pool.students[i];
      if (student.branch !== leftBranch) {
        // Swap to front
        if (i !== pool.index) {
          [pool.students[pool.index], pool.students[i]] = [pool.students[i], pool.students[pool.index]];
        }
        pool.index++;
        return student;
      }
    }
  }
  
  // No different branch found, or no left neighbor - take next student
  const student = pool.students[pool.index];
  pool.index++;
  return student;
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
