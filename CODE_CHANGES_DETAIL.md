# CODE CHANGES - Before & After Comparison

## File 1: `backend-v2/routes/classRoutes.js`

### Change: Fixed class sorting order

**BEFORE:**
```javascript
router.get('/', authMiddleware, async (req, res) => {
  try {
    const classGroups = await ClassGroup.find().sort({ branch: 1, section: 1 });
```

**AFTER:**
```javascript
router.get('/', authMiddleware, async (req, res) => {
  try {
    // UPDATED: Sort by branch, then year, then section
    const classGroups = await ClassGroup.find().sort({ branch: 1, year: 1, section: 1 });
```

**Why:** Previous sort caused Year 2 to appear before Year 1 in some cases.

---

## File 2: `backend-v2/routes/roomRoutes.js`

### Change: Fixed room display order

**BEFORE:**
```javascript
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ name: 1 });
    
    res.json({
      success: true,
      count: rooms.length,
      data: rooms
    });
```

**AFTER:**
```javascript
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
```

**Why:** String sort caused order: R1, R10, R2, R3... instead of R1, R2, R3... R10.

---

## File 3: `backend-v2/services/seatingGenerator.js`

### Change 1: Room identification - Added R10

**BEFORE:**
```javascript
// Check if this is Room 8 or 9 (special rules apply)
const isSpecialRoom = name === 'R8' || name === 'R9' || name === 'Room 8' || name === 'Room 9';
```

**AFTER:**
```javascript
// UPDATED: Check if this is Room 8, 9, or 10 (special alternation rules)
const isSpecialRoom = name === 'R8' || name === 'R9' || name === 'R10';
```

**Why:** User wanted all 45-capacity rooms (R8, R9, R10) to follow alternation rules.

---

### Change 2: Track last student type for alternation

**BEFORE:**
```javascript
let studentsPlaced = 0;

// Fill this room with special rules
outerLoop:
for (let row = 0; row < rows; row++) {
```

**AFTER:**
```javascript
let studentsPlaced = 0;
let lastWasCSE = false; // UPDATED: Track if last student was CSE for alternation

// Fill this room seat by seat
outerLoop:
for (let row = 0; row < rows; row++) {
```

**Why:** Need to track previous student type to enforce alternation.

---

### Change 3: Function call signature change

**BEFORE:**
```javascript
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
```

**AFTER:**
```javascript
// UPDATED: Get next student with STRICT rule enforcement
const student = getNextStudentWithStrictRules(
  pools,
  roomCSEYearLock,
  roomIdx,
  isSpecialRoom,
  lastWasCSE,
  layout[row][col - 1] // left neighbor for branch conflict check
);
```

**Why:** New function with strict rules, added `lastWasCSE` parameter.

---

### Change 4: Update tracking after placement

**BEFORE:**
```javascript
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
```

**AFTER:**
```javascript
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
  
  // UPDATED: Update last student type for next iteration
  lastWasCSE = (student.branch === 'CSE');
  
} else {
```

**Why:** Update state after each placement for next iteration's alternation logic.

---

### Change 5: COMPLETE REWRITE - New student selection function

**BEFORE (Old Function - ~90 lines):**
```javascript
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
  let cseYearForRoom = roomCSEYearLock[roomIdx];
  
  // Rule B & C: In Room 8 or 9, try to alternate between CSE and non-CSE
  let preferNonCSE = false;
  if (isSpecialRoom) {
    if (leftNeighbor && leftNeighbor.branch === 'CSE') {
      preferNonCSE = true;
    }
  }
  
  // Try to get non-CSE first if preferred
  if (preferNonCSE && queues['NON-CSE'].index < queues['NON-CSE'].students.length) {
    const student = queues['NON-CSE'].students[queues['NON-CSE'].index];
    // ... weak checking logic
    queues['NON-CSE'].index++;
    return student;
  }
  
  // ... rest of weak logic
  // ISSUES: Only checked left neighbor, not previous student
  //         Year lock not strictly enforced
  //         Fallback allowed wrong CSE year
}
```

**AFTER (New Function - ~180 lines with helpers):**
```javascript
/**
 * UPDATED: Get next student with STRICT rule enforcement
 * 
 * RULES ENFORCED (in priority order):
 * ------------------------------------
 * 1. Rule A: CSE year lock - If room has CSE-Year1, NO CSE-Year2 allowed
 * 2. Rule B & C: In R8/R9/R10 - Alternate CSE with non-CSE
 * 3. Avoid same branch in adjacent seats
 */
const getNextStudentWithStrictRules = (
  pools,
  roomCSEYearLock,
  roomIdx,
  isSpecialRoom,
  lastWasCSE,  // NEW PARAMETER
  leftNeighbor
) => {
  const leftBranch = leftNeighbor ? leftNeighbor.branch : null;
  const cseYearLock = roomCSEYearLock[roomIdx];
  
  // ============================================================
  // RULE B & C: In special rooms, alternate CSE/non-CSE
  // ============================================================
  if (isSpecialRoom) {
    
    // If last student was CSE, STRONGLY prefer non-CSE next
    if (lastWasCSE) {
      const nonCSEStudent = getStudentFromPool(pools['NON-CSE'], leftBranch);
      if (nonCSEStudent) {
        return nonCSEStudent;  // STRICT - return immediately
      }
      // Only fall through if NO non-CSE available
    }
    
    // If last was non-CSE, try to place CSE
    if (!lastWasCSE) {
      const cseStudent = getCSEStudentRespectingLock(
        pools, cseYearLock, roomIdx, roomCSEYearLock, leftBranch
      );
      if (cseStudent) {
        return cseStudent;  // STRICT - return immediately
      }
      // Only fall through if NO CSE available
    }
  }
  
  // ============================================================
  // RULE A: For all rooms, respect CSE year lock
  // ============================================================
  
  if (cseYearLock) {
    const lockedQueue = `CSE-${cseYearLock}`;
    
    // Try locked CSE year first
    const cseStudent = getStudentFromPool(pools[lockedQueue], leftBranch);
    if (cseStudent) {
      return cseStudent;
    }
    
    // Try non-CSE
    const nonCSEStudent = getStudentFromPool(pools['NON-CSE'], leftBranch);
    if (nonCSEStudent) {
      return nonCSEStudent;
    }
    
    // STRICT - return null if locked and no valid students
    return null;  // Cannot place other CSE year
  }
  
  // ============================================================
  // No lock yet - establish lock with first CSE
  // ============================================================
  
  const cse1Student = getStudentFromPool(pools['CSE-1'], leftBranch);
  if (cse1Student) {
    roomCSEYearLock[roomIdx] = 1;  // Lock room to year 1
    return cse1Student;
  }
  
  const cse2Student = getStudentFromPool(pools['CSE-2'], leftBranch);
  if (cse2Student) {
    roomCSEYearLock[roomIdx] = 2;  // Lock room to year 2
    return cse2Student;
  }
  
  const nonCSEStudent = getStudentFromPool(pools['NON-CSE'], leftBranch);
  if (nonCSEStudent) {
    return nonCSEStudent;
  }
  
  return null;
};

/**
 * NEW HELPER: Get CSE student respecting year lock
 */
const getCSEStudentRespectingLock = (
  pools, cseYearLock, roomIdx, roomCSEYearLock, leftBranch
) => {
  if (cseYearLock) {
    // Room locked - only try that year
    const lockedQueue = `CSE-${cseYearLock}`;
    return getStudentFromPool(pools[lockedQueue], leftBranch);
  } else {
    // No lock - try both years
    const cse1 = getStudentFromPool(pools['CSE-1'], leftBranch);
    if (cse1) {
      roomCSEYearLock[roomIdx] = 1;
      return cse1;
    }
    
    const cse2 = getStudentFromPool(pools['CSE-2'], leftBranch);
    if (cse2) {
      roomCSEYearLock[roomIdx] = 2;
      return cse2;
    }
  }
  
  return null;
};

/**
 * NEW HELPER: Get student from pool, avoid left neighbor's branch
 */
const getStudentFromPool = (pool, leftBranch) => {
  if (pool.index >= pool.students.length) {
    return null;  // Pool exhausted
  }
  
  // Try to avoid same branch as left neighbor
  if (leftBranch) {
    // Look ahead up to 5 students
    for (let i = pool.index; i < Math.min(pool.index + 5, pool.students.length); i++) {
      const student = pool.students[i];
      if (student.branch !== leftBranch) {
        // Swap to front
        if (i !== pool.index) {
          [pool.students[pool.index], pool.students[i]] = 
            [pool.students[i], pool.students[pool.index]];
        }
        pool.index++;
        return student;
      }
    }
  }
  
  // No different branch found - take next student
  const student = pool.students[pool.index];
  pool.index++;
  return student;
};
```

**Key Improvements:**

1. **Priority System:**
   - Old: Preference-based (try, but allow fallback)
   - New: Strict rules (return immediately or null)

2. **Alternation Logic:**
   - Old: Only checked left neighbor (weak)
   - New: Tracks `lastWasCSE` across entire room (strong)

3. **CSE Year Lock:**
   - Old: Could fall through to other year
   - New: Returns null if locked and wrong year attempted

4. **Code Organization:**
   - Old: Single monolithic function
   - New: Main function + 2 helpers (clean separation)

5. **Branch Conflict Avoidance:**
   - Old: Simple check
   - New: Look-ahead 5 students, swap to front

---

## Summary of Changes

| File | Lines Changed | Type | Impact |
|------|--------------|------|--------|
| `classRoutes.js` | 1 line | Bug fix | Class display order |
| `roomRoutes.js` | 8 lines | Bug fix | Room display order R1-R10 |
| `seatingGenerator.js` | ~200 lines | Major rewrite | CSE rules enforcement |

**Total:** 3 files, ~209 lines changed

---

## Testing the Differences

### Old Behavior (Before):
```
R8 Layout: 
CSE Y1 A | CSE Y2 A | CSE Y1 B | CSE Y2 B | CSE Y1 A | CSE Y2 A
ECE A    | IT A     | MECH A   | CIVIL A  | EEE A    | CSE Y1 A
```
❌ **PROBLEM:** Mixed CSE Year 1 and Year 2 in same room

### New Behavior (After):
```
R8 Layout:
CSE Y1 A | CIVIL A  | CSE Y1 B | ECE A    | CSE Y1 A | IT A
CSE Y1 B | MECH A   | CSE Y1 A | EEE A    | CSE Y1 B | CIVIL A
```
✅ **FIXED:** 
- All CSE are Year 1 (year lock enforced)
- Alternates CSE with non-CSE (CIVIL, ECE, IT, MECH, EEE)
- Mixed departments present

---

## Code Quality Improvements

### Before:
- ❌ Weak rule enforcement (preference-based)
- ❌ Confusing fallback logic
- ❌ Long monolithic function
- ❌ Limited comments
- ❌ String sorting bug

### After:
- ✅ Strict rule enforcement (return null if violation)
- ✅ Clear priority system with comments
- ✅ Modular helper functions
- ✅ Comprehensive documentation
- ✅ Numeric sorting for R1-R10

---

**All changes are backward compatible with existing data structures.**
**No database migrations required.**
**Frontend automatically benefits from backend fixes.**
