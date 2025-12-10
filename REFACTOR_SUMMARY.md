# Exam Seating Manager - Real-World Refactor Summary

## Overview
Updated the exam seating system to match real-world requirements with 1st/2nd year structure, special CSE room rules, and overflow handling.

---

## Changes Made

### 1. **Backend - Seating Model** (`backend-v2/models/Seating.js`)
**Status:** ✅ UPDATED

**New Fields Added:**
```javascript
unassignedCount: {
  type: Number,
  default: 0
},
unassignedStudents: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Student'
}]
```

**Purpose:** Track students who couldn't be seated when capacity is exceeded (700 students, 540 seats).

---

### 2. **Backend - Class Seeding** (`backend-v2/routes/classRoutes.js`)
**Status:** ✅ UPDATED

**Key Changes:**
- Changed from Year 3 only → **1st & 2nd Year**
- CSE department now has **2 sections (A & B)** per year
- All other departments (CIVIL, ECE, EEE, IT, MECH) have **1 section (A)** per year
- Total classes: **14** (was 12)
  - CSE: 1st Year A, 1st Year B, 2nd Year A, 2nd Year B = 4 classes
  - Others: Each dept × 2 years × 1 section = 10 classes

**New Display Names:**
- "CIVIL 1st Year" instead of "CIVIL A - Year 3"
- "CSE 1st Year A" and "CSE 1st Year B" for CSE sections

---

### 3. **Backend - Student Seeding** (`backend-v2/routes/studentRoutes.js`)
**Status:** ✅ UPDATED

**Key Changes:**
- Total students: **700** (was 600)
  - CSE: 4 sections × 50 = 200 students
  - Others: 10 sections × 50 = 500 students
- New register number format: `<year><branch><section><number>`
  - Example: `1CSEA001` = 1st year, CSE, Section A, Student 001
  - Example: `2ECE A025` = 2nd year, ECE, Section A, Student 025

---

### 4. **Backend - Seating Generator Service** (`backend-v2/services/seatingGenerator.js`)
**Status:** ✅ UPDATED

**Major Algorithm Changes:**

#### a) New Rules Documented:
```
Rule A: CSE year must not be mixed inside one room
- Once Room X has CSE 1st Year students, no CSE 2nd Year students in Room X
- Applies to ALL rooms, not just R8/R9

Rule B: Don't keep CSE blocks continuously in Room 8 & 9
- Alternate between CSE and non-CSE students
- Prevents entire room filled with only CSE

Rule C: Mix other departments with CSE in those rooms
- CIVIL, ECE, EEE, IT, MECH should also appear in Room 8 & 9
- Creates better distribution

Rule D: Overflow Handling
- When students > seats, first N students seated, rest tracked as unassigned
- No error thrown, graceful degradation
```

#### b) New Functions:

**`groupStudentsByBranchAndYear(students)`** - NEW
- Groups students by `${branch}-${year}` keys
- Returns: `{ 'CSE-1': [...], 'CSE-2': [...], 'ECE-1': [...] }`
- Enables year-based filtering for CSE constraints

**`generateRoomLayoutsWithRules(rooms, branchYearGroups)`** - NEW
- Replaces old `generateRoomLayouts()`
- Identifies Room 8 & 9 by name check
- Maintains `roomCSEYearLock` object to track CSE year per room
- Separates students into 3 queues:
  - `CSE-1`: CSE 1st year students
  - `CSE-2`: CSE 2nd year students  
  - `NON-CSE`: All other departments
- Calls `getNextStudentWithRules()` with special parameters

**`getNextStudentWithRules(queues, roomCSEYearLock, roomIdx, isSpecialRoom, leftNeighbor, row, studentsPlaced)`** - NEW
- Replaces old `getNextStudent()`
- **Rule A Implementation:** Checks if room has CSE year lock, filters accordingly
- **Rule B Implementation:** In R8/R9, prefers non-CSE if last student was CSE
- **Rule C Implementation:** Avoids filling R8/R9 with only CSE by alternation
- **Adjacent Conflict:** Still avoids same branch in adjacent seats
- Fallback mechanism ensures students always placed even if constraints conflict

#### c) Updated Main Function:

**`generateSeating(examName, examDate, classes, rooms)`**
```javascript
// UPDATED: Handle overflow gracefully
if (totalStudents > totalCapacity) {
  studentsToSeat = students.slice(0, totalCapacity);
  unassignedStudents = students.slice(totalCapacity);
  // Don't throw error anymore
}

// UPDATED: Group by branch AND year
const branchYearGroups = groupStudentsByBranchAndYear(studentsToSeat);

// UPDATED: Generate with special rules
const roomSeatingData = generateRoomLayoutsWithRules(rooms, branchYearGroups);

// UPDATED: Save unassigned info
seatingDoc.unassignedCount = unassignedStudents.length;
seatingDoc.unassignedStudents = unassignedStudents.map(s => s._id);
```

---

### 5. **Frontend - Classes Page** (`frontend-v2/src/pages/ClassesPage.jsx`)
**Status:** ✅ UPDATED

**Changes:**
- Grouping changed from `branch` to `branch-year` combination
- Display format: "CSE - Year 1" instead of just "CSE"
- Shows sections within each year group
- Better organization for 1st/2nd year structure

---

### 6. **Frontend - New Seating Page** (`frontend-v2/src/pages/NewSeatingPage.jsx`)
**Status:** ✅ UPDATED

**Changes:**

#### a) Class Selection Display:
- Groups by branch and year: "CSE - Year 1", "ECE - Year 2", etc.
- Checkbox labels: "Section A (50 students)" instead of just "A (50 students)"
- Better clarity on which year and section being selected

#### b) Overflow Warning:
```javascript
// UPDATED: Show alert when capacity exceeded
if (unassignedCount && unassignedCount > 0) {
  alert(`Warning: ${selectedStudentCount} students selected but only ${totalSeats} seats available. ${unassignedCount} students could not be seated.`);
}
// Still navigates to seating view (not blocked)
```

**User Experience:**
- User selects all classes → sees warning about overflow
- Still proceeds to view generated seating
- Can identify which students were seated vs unassigned

---

## Testing Checklist

### Backend Testing:
1. ✅ Seed classes: `POST http://localhost:5000/api/classes/seed`
   - Verify 14 classes created
   - Check CSE has A & B sections
   - Check others have only A section

2. ✅ Seed students: `POST http://localhost:5000/api/students/seed`
   - Verify 700 students created
   - Check register numbers have correct format
   - Verify CSE has 200 students, others have 500

3. ⏳ Generate seating: `POST http://localhost:5000/api/seating/generate`
   ```json
   {
     "examName": "Mid Sem 1",
     "examDate": "2024-02-15",
     "classes": ["<all 14 class IDs>"],
     "rooms": ["<all 9 room IDs>"]
   }
   ```
   - Verify 540 students seated (9 rooms × 60 seats)
   - Check `unassignedCount` = 160
   - Check `unassignedStudents` array has 160 IDs

4. ⏳ Verify Room 8 & 9:
   - Check only ONE CSE year per room (either all year 1 or all year 2)
   - Check CSE and non-CSE students alternate
   - Check mixed departments present

### Frontend Testing:
1. ⏳ Classes Page (`/classes`):
   - Verify display shows "CIVIL - Year 1", "CSE - Year 1", etc.
   - Check CSE shows both Section A and B
   - Check others show only Section A

2. ⏳ New Seating Page (`/seating/new`):
   - Verify class checkboxes grouped by year
   - Select all classes → check student count shows 700
   - Check total seats shows 540 (all rooms selected)
   - Generate seating → verify alert shows "160 students could not be seated"
   - Verify navigation to seating detail page still works

3. ⏳ Seating Detail Page:
   - Verify Room 8 layout shows CSE year consistency
   - Check CSE/non-CSE alternation visible
   - Verify total students seated = 540

---

## Architecture Preserved

**No major rewrites** - Modified existing architecture:
- ✅ Same models, routes, controllers structure
- ✅ Same React pages and components
- ✅ Same authentication flow
- ✅ Same API endpoints and contracts
- ✅ Added fields/functions, didn't remove old ones

**Backward Compatibility Notes:**
- Old `getNextStudent()` function kept in code (marked as OLD)
- Old `groupStudentsByBranch()` replaced but logic pattern preserved
- Seating model extended (added fields, didn't change existing)

---

## Environment Setup Reminder

**Backend:** `.env` file should have:
```
MONGO_URI=mongodb://localhost:27017/exam-seating
JWT_SECRET=<your-secret>
PORT=5000
```

**Frontend:** Vite config proxies `/api` to `http://localhost:5000`

---

## Next Steps for Production

1. **Database Reset:**
   ```bash
   # Drop old data to reseed with new structure
   mongo exam-seating --eval "db.dropDatabase()"
   ```

2. **Reseed Data:**
   - POST `/api/classes/seed` → Creates 14 classes
   - POST `/api/students/seed` → Creates 700 students
   - POST `/api/rooms/seed` → Creates 9 rooms (if not done)

3. **Test Generation:**
   - Generate seating with all classes selected
   - Verify overflow warning appears
   - Check Room 8 & 9 layouts manually

4. **UI Enhancements (Future):**
   - Show unassigned students list in seating detail
   - Export unassigned students to CSV
   - Add filter to view only unassigned students
   - Room capacity warnings before generation

---

## Files Modified Summary

| File | Status | Description |
|------|--------|-------------|
| `backend-v2/models/Seating.js` | ✅ UPDATED | Added unassigned fields |
| `backend-v2/routes/classRoutes.js` | ✅ UPDATED | 1st/2nd year, CSE 2 sections |
| `backend-v2/routes/studentRoutes.js` | ✅ UPDATED | 700 students, new format |
| `backend-v2/services/seatingGenerator.js` | ✅ UPDATED | New algorithm with CSE rules |
| `frontend-v2/src/pages/ClassesPage.jsx` | ✅ UPDATED | Year-based grouping |
| `frontend-v2/src/pages/NewSeatingPage.jsx` | ✅ UPDATED | Year labels, overflow alert |
| `REFACTOR_SUMMARY.md` | ✅ NEW | This document |

**Total:** 6 files modified + 1 new documentation file

---

## Developer Notes

### Code Comments Added:
- All major changes marked with `// UPDATED` or `// NEW`
- Algorithm rules documented in header comments
- Function purposes explained clearly

### Design Decisions:
1. **Why 3 queues instead of round-robin?**
   - Need to filter CSE by year (Rule A)
   - Easier to prefer non-CSE in R8/R9 (Rule B)
   - Simpler alternation logic (Rule C)

2. **Why lock per room instead of global?**
   - Rule A applies per-room, not globally
   - Different rooms can have different CSE years
   - More flexible if room count changes

3. **Why not throw error on overflow?**
   - Real-world scenario: must handle gracefully
   - User requested warning, not blocking
   - Partial seating better than no seating

### Known Limitations:
- Alternation in R8/R9 is "best effort" (if only CSE students left, fills with CSE)
- CSE year lock applies to entire room (can't mix within room even if space left)
- Overflow students chosen by order (first 540 seated, last 160 not) - no prioritization logic

---

**Last Updated:** 2024-01-XX  
**Version:** 2.0 (Real-World Refactor)  
**Status:** Ready for Testing
