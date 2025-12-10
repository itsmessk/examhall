# Testing Guide - Exam Seating Manager v2.0

## Prerequisites

1. **MongoDB** running on `localhost:27017`
2. **Backend** running on `http://localhost:5000`
3. **Frontend** running on `http://localhost:5173` (Vite)

---

## Step 1: Reset Database (Optional)

If you have old data, drop the database first:

```bash
# Using MongoDB shell
mongosh exam-seating --eval "db.dropDatabase()"

# OR using mongo (older version)
mongo exam-seating --eval "db.dropDatabase()"
```

---

## Step 2: Start Backend

```bash
cd d:\developement\examhall\backend-v2
npm run dev
```

**Expected Output:**
```
Server running on port 5000
MongoDB connected successfully
```

---

## Step 3: Seed Data

### A) Seed Rooms (if not already done)
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/rooms/seed" -Method POST -Headers @{"Content-Type"="application/json"} | ConvertTo-Json -Depth 10
```

**Expected Result:**
```json
{
  "message": "9 rooms seeded successfully",
  "rooms": [...]
}
```

### B) Seed Classes
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/classes/seed" -Method POST -Headers @{"Content-Type"="application/json"} | ConvertTo-Json -Depth 10
```

**Expected Result:**
```json
{
  "message": "14 class groups seeded successfully",
  "classes": [
    {"displayName": "CIVIL 1st Year", "branch": "CIVIL", "year": 1, "section": "A", ...},
    {"displayName": "CIVIL 2nd Year", "branch": "CIVIL", "year": 2, "section": "A", ...},
    {"displayName": "CSE 1st Year A", "branch": "CSE", "year": 1, "section": "A", ...},
    {"displayName": "CSE 1st Year B", "branch": "CSE", "year": 1, "section": "B", ...},
    {"displayName": "CSE 2nd Year A", "branch": "CSE", "year": 2, "section": "A", ...},
    {"displayName": "CSE 2nd Year B", "branch": "CSE", "year": 2, "section": "B", ...},
    ...
  ]
}
```

**✅ Verify:** Check count is **14 classes** (not 12)

### C) Seed Students
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/students/seed" -Method POST -Headers @{"Content-Type"="application/json"} | ConvertTo-Json -Depth 3
```

**Expected Result:**
```json
{
  "message": "700 students seeded successfully",
  "students": [...]
}
```

**✅ Verify:** Check count is **700 students** (not 600)

---

## Step 4: Start Frontend

```bash
cd d:\developement\examhall\frontend-v2
npm run dev
```

**Expected Output:**
```
VITE v5.x.x ready in xxx ms
➜ Local: http://localhost:5173/
```

---

## Step 5: UI Testing

### Test 1: Login/Register
1. Navigate to `http://localhost:5173/`
2. Click "Register" to create a new account
3. Register with:
   - Name: Test Admin
   - Email: admin@test.com
   - Password: admin123
   - Role: Admin
4. ✅ Should redirect to dashboard

### Test 2: View Classes
1. Click "Classes" in navbar
2. ✅ Should see classes grouped by year:
   - **CIVIL - Year 1** (Section A, 50 students)
   - **CIVIL - Year 2** (Section A, 50 students)
   - **CSE - Year 1** (Section A, 50 students) + (Section B, 50 students)
   - **CSE - Year 2** (Section A, 50 students) + (Section B, 50 students)
   - **ECE - Year 1** (Section A, 50 students)
   - ... etc
3. ✅ Total students: **700**
4. ✅ Total classes: **14**
5. ✅ Branches: **6** (CIVIL, CSE, ECE, EEE, IT, MECH)

### Test 3: View Rooms
1. Click "Rooms" in navbar
2. ✅ Should see 9 rooms (R1-R9)
3. ✅ Total capacity: **540 seats**

### Test 4: Generate Seating (Key Test)
1. Click "New Seating" in navbar
2. Fill exam details:
   - Exam Name: `Mid Sem 1`
   - Exam Date: `2024-02-15` (any date)
3. Click "Select All" for **Classes**
4. ✅ Check student count shows **700 selected**
5. Click "Select All" for **Rooms** (should be pre-selected)
6. ✅ Check total seats shows **540 available**
7. Click "Generate Seating"
8. **⚠️ IMPORTANT:** Should see alert:
   ```
   Warning: 700 students selected but only 540 seats available.
   160 students could not be seated.
   ```
9. Click OK on alert
10. ✅ Should navigate to seating detail page (not blocked)

### Test 5: Verify Seating Layout
1. On seating detail page, verify:
   - ✅ Total students: **540** (not 700)
   - ✅ Rooms filled: **9 rooms**
   - ✅ Each room shows student details (name, register number, branch, section)

2. **Check Room 8 (R8):**
   - Click "View Layout" for Room 8
   - ✅ If CSE students present, check they are ALL same year
     - Example: All "CSE Year 1" OR all "CSE Year 2" (not mixed)
   - ✅ Should see alternation: CSE → CIVIL → CSE → ECE → CSE...
   - ✅ Should NOT be completely filled with only CSE

3. **Check Room 9 (R9):**
   - Same verification as Room 8
   - ✅ CSE year consistency
   - ✅ Department alternation
   - ✅ Mixed departments present

---

## Step 6: Backend Verification

### Check Database Directly
```bash
mongosh exam-seating
```

**Query 1: Count Documents**
```javascript
db.classgroups.countDocuments() // Should be 14
db.students.countDocuments()    // Should be 700
db.rooms.countDocuments()       // Should be 9
db.seatings.countDocuments()    // Should be 1 (after generation)
```

**Query 2: Check Unassigned Students**
```javascript
db.seatings.find({}, { unassignedCount: 1, examName: 1 })
```

**Expected:**
```json
{
  "_id": ObjectId("..."),
  "examName": "Mid Sem 1",
  "unassignedCount": 160  // ✅ Should be 160
}
```

**Query 3: Verify CSE Sections**
```javascript
db.classgroups.find({ branch: "CSE" }, { displayName: 1, section: 1, year: 1 })
```

**Expected:**
```json
[
  { "displayName": "CSE 1st Year A", "branch": "CSE", "year": 1, "section": "A" },
  { "displayName": "CSE 1st Year B", "branch": "CSE", "year": 1, "section": "B" },
  { "displayName": "CSE 2nd Year A", "branch": "CSE", "year": 2, "section": "A" },
  { "displayName": "CSE 2nd Year B", "branch": "CSE", "year": 2, "section": "B" }
]
```

**Query 4: Check Student Register Numbers**
```javascript
db.students.find({ branch: "CSE", year: 1, section: "A" }).limit(3)
```

**Expected:**
```json
[
  { "registerNumber": "1CSEA001", "branch": "CSE", "year": 1, "section": "A", ... },
  { "registerNumber": "1CSEA002", "branch": "CSE", "year": 1, "section": "A", ... },
  { "registerNumber": "1CSEA003", "branch": "CSE", "year": 1, "section": "A", ... }
]
```

---

## Step 7: Advanced Testing

### Test Scenario 1: Partial Selection
1. Generate new seating
2. Select only **CSE 1st Year A** (50 students)
3. Select only **Room 1** (60 seats)
4. Generate
5. ✅ Should succeed without overflow warning
6. ✅ Room 1 should have 50 students seated, 10 empty seats

### Test Scenario 2: Exact Capacity
1. Generate new seating
2. Select 9 classes (total ~450 students)
3. Select 7-8 rooms (approx 450 seats)
4. Generate
5. ✅ Should succeed without warning
6. ✅ All students seated, minimal empty seats

### Test Scenario 3: CSE Year Constraint
1. After seating generation, check any room with CSE students
2. Use MongoDB query:
   ```javascript
   db.seatings.findOne(
     { "rooms.layout": { $elemMatch: { $elemMatch: { branch: "CSE" } } } },
     { "rooms.$": 1 }
   )
   ```
3. ✅ Verify all CSE students in that room are same year

---

## Common Issues & Fixes

### Issue 1: "Cannot connect to MongoDB"
**Fix:** Ensure MongoDB is running
```bash
# Windows
net start MongoDB

# Check status
mongosh --eval "db.version()"
```

### Issue 2: "Port 5000 already in use"
**Fix:** Change port in `.env` file
```
PORT=5001
```
Also update frontend proxy in `vite.config.js`

### Issue 3: Old data showing (12 classes, 600 students)
**Fix:** Drop database and reseed
```bash
mongosh exam-seating --eval "db.dropDatabase()"
# Then run seed commands again
```

### Issue 4: Alert not showing on overflow
**Fix:** Check browser console for errors, ensure:
- Backend returns `unassignedCount` in response
- Frontend `NewSeatingPage.jsx` has updated `handleSubmit()`

### Issue 5: CSE years mixed in same room
**Fix:** Check `seatingGenerator.js` has:
- `groupStudentsByBranchAndYear()` grouping correctly
- `roomCSEYearLock` being maintained
- `getNextStudentWithRules()` checking year lock

---

## Success Criteria ✅

Your refactor is successful if:

- [x] 14 classes created (4 CSE, 10 others)
- [x] 700 students created
- [x] Class page shows year-based grouping
- [x] New seating page shows "Section A", "Section B" labels
- [x] Overflow alert appears when selecting all classes
- [x] Seating still generated despite overflow
- [x] 540 students seated, 160 tracked as unassigned
- [x] Room 8 & 9 have CSE year consistency
- [x] Room 8 & 9 show CSE/non-CSE alternation
- [x] No adjacent same-branch conflicts (or minimal)

---

## Performance Benchmarks

Expected generation times:
- 100 students: < 1 second
- 540 students: 1-2 seconds
- 700 students (with overflow): 2-3 seconds

If generation takes > 5 seconds, check:
- MongoDB connection speed
- `shuffleArray()` implementation
- Excessive constraint checking in `getNextStudentWithRules()`

---

**Testing Complete!** 🎉

If all tests pass, your refactor is production-ready for the new class structure and special room rules.
