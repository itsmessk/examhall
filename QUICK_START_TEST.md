# QUICK START - Testing the Fixed App

## 1. Reset Database (Important!)
```powershell
mongosh exam-seating --eval "db.dropDatabase()"
```

## 2. Start Backend
```powershell
cd d:\developement\examhall\backend-v2
npm run dev
```
Wait for: "Server running on port 5000"

## 3. Start Frontend (New Terminal)
```powershell
cd d:\developement\examhall\frontend-v2
npm run dev
```
Wait for: "Local: http://localhost:5173/"

## 4. Open Browser
Navigate to: `http://localhost:5173/`

## 5. Register/Login
- Click "Register"
- Name: Admin Test
- Email: admin@test.com
- Password: admin123
- Role: **Admin** (important!)
- Click Register

## 6. Initialize Data (Dashboard)
On dashboard, click these buttons in order:
1. **"Seed Classes"** → Should see "14 classes seeded"
2. **"Seed Students"** → Should see "700 students seeded"
3. **"Seed Rooms"** → Should see "10 rooms seeded"

## 7. Verify Classes Page
- Click "Classes" in navbar
- **Should see:**
  - CIVIL - Year 1 (Section A, 50 students)
  - CIVIL - Year 2 (Section A, 50 students)
  - CSE - Year 1 (Section A, 50 students) (Section B, 50 students)
  - CSE - Year 2 (Section A, 50 students) (Section B, 50 students)
  - ECE - Year 1 (Section A, 50 students)
  - ECE - Year 2 (Section A, 50 students)
  - EEE - Year 1 (Section A, 50 students)
  - EEE - Year 2 (Section A, 50 students)
  - IT - Year 1 (Section A, 50 students)
  - IT - Year 2 (Section A, 50 students)
  - MECH - Year 1 (Section A, 50 students)
  - MECH - Year 2 (Section A, 50 students)
- **Total: 14 classes, 700 students**

## 8. Generate Seating (THE MAIN TEST)
- Click "New Seating" in navbar
- Exam Name: "Mid Semester Exam"
- Exam Date: Pick any date
- Click **"Select All"** button under "Select Classes"
  - Should show: **"700 Total Students"**
- Keep all rooms selected (default)
  - Should show: **"585 Total Seats"**
- Click **"Generate Seating"** button

## 9. VERIFY OVERFLOW WARNING
**CRITICAL:** Should see alert:
```
Warning: 700 students selected but only 585 seats available.
115 students could not be seated.
```
- Click OK
- **Should navigate to seating detail page** (not blocked!)

## 10. VERIFY ROOM 8 RULES
- On seating detail page, find "R8"
- Click "View Layout" or expand R8
- **CHECK #1 - CSE Year Lock:**
  - Find all CSE students in R8
  - All should be **same year** (all Year 1 OR all Year 2)
  - Example: CSE Y1 A, CSE Y1 B, CSE Y1 A (OK)
  - **NOT OK:** CSE Y1 A, CSE Y2 A (MIXED YEARS - THIS IS BUG!)
  
- **CHECK #2 - Alternation:**
  - Read seats row by row
  - Should see pattern like: CSE → CIVIL → CSE → ECE → CSE → IT
  - **NOT:** CSE CSE CSE CSE (continuous CSE block)
  
- **CHECK #3 - Mixed Departments:**
  - R8 should have CIVIL, ECE, EEE, IT, or MECH mixed with CSE
  - **NOT:** Only CSE students in entire room

## 11. VERIFY ROOM 9 (Same Checks)
- Click "View Layout" for R9
- **CHECK:** Same 3 rules as R8

## 12. VERIFY ROOM 10 (Same Checks)
- Click "View Layout" for R10
- **CHECK:** Same 3 rules as R8/R9

## 13. VERIFY OTHER ROOMS (R1-R7)
- Check any room R1 through R7
- **CSE Year Lock:** Should still be enforced
- **Alternation:** NOT required (normal distribution)
- **Expected:** May see CSE blocks (this is OK for R1-R7)

## 14. VERIFY ROOM ORDER IN UI
When creating new seating, room checkboxes should show:
```
☑ R1 (60 seats)
☑ R2 (60 seats)
☑ R3 (60 seats)
☑ R4 (60 seats)
☑ R5 (60 seats)
☑ R6 (60 seats)
☑ R7 (60 seats)
☑ R8 (45 seats)
☑ R9 (45 seats)
☑ R10 (45 seats)
```
**NOT:** R1, R10, R2, R3... (string sort - this is bug!)

---

## SUCCESS CRITERIA ✅

If all these are true, the fix is working:

- [ ] 14 classes created (not 12)
- [ ] 700 students created (not 600)
- [ ] Year 1 and Year 2 display correctly
- [ ] CSE shows A & B sections, others show only A
- [ ] Rooms display R1-R10 in order (not R1, R10, R2...)
- [ ] Overflow warning appears when selecting all classes
- [ ] Seating is generated despite overflow
- [ ] R8 has CSE year consistency (all Year 1 OR all Year 2)
- [ ] R8 has CSE/non-CSE alternation pattern
- [ ] R8 has mixed departments (not CSE-only)
- [ ] R9 follows same rules as R8
- [ ] R10 follows same rules as R8/R9
- [ ] Other rooms (R1-R7) still enforce CSE year lock

---

## TROUBLESHOOTING

### "Still showing 12 classes"
**Fix:** Database not reset. Run:
```powershell
mongosh exam-seating --eval "db.dropDatabase()"
```
Then re-seed from dashboard.

### "Rooms show R1, R10, R2..."
**Fix:** Backend code not updated. Check:
```powershell
cd d:\developement\examhall\backend-v2
git status
```
Make sure `routes/roomRoutes.js` has the natural sort code.

### "R8 has mixed CSE years"
**Fix:** Seating generator not updated. Check:
```powershell
cd d:\developement\examhall\backend-v2
cat services/seatingGenerator.js | grep "getNextStudentWithStrictRules"
```
Should see the new function. If not, backend code not updated.

### "No alternation in R8"
**Fix:** Check if `lastWasCSE` is being tracked. In `seatingGenerator.js`, line ~234 should have:
```javascript
lastWasCSE = (student.branch === 'CSE');
```

### "Seating fails with error"
**Fix:** Check backend console for error. Common issues:
- MongoDB not running: `net start MongoDB`
- Port 5000 in use: Change PORT in .env
- Missing .env file: Create with MONGO_URI and JWT_SECRET

---

## QUICK VERIFICATION QUERIES

If you want to check database directly:

```javascript
// In mongosh
use exam-seating

// Count classes (should be 14)
db.classgroups.countDocuments()

// Count students (should be 700)
db.students.countDocuments()

// Count rooms (should be 10)
db.rooms.countDocuments()

// View room order
db.rooms.find({}, {name: 1, capacity: 1}).sort({name: 1})

// Check CSE sections (should be 4)
db.classgroups.find({branch: "CSE"}, {displayName: 1, year: 1, section: 1})

// After seating generation - check overflow
db.seatings.findOne({}, {unassignedCount: 1, examName: 1})
```

Expected outputs:
```
db.classgroups.countDocuments() → 14
db.students.countDocuments() → 700
db.rooms.countDocuments() → 10
db.seatings.findOne(...) → { unassignedCount: 115, examName: "..." }
```

---

## NEXT STEPS AFTER SUCCESSFUL TEST

1. **Commit Changes:**
   ```powershell
   cd d:\developement\examhall
   git add .
   git commit -m "Fix: Implement strict CSE rules, room ordering, and overflow handling"
   ```

2. **Backup Database:**
   ```powershell
   mongodump --db exam-seating --out backup-$(Get-Date -Format "yyyyMMdd")
   ```

3. **Deploy to Production:**
   - Update environment variables
   - Run database migrations
   - Test with production data

---

**Happy Testing! 🚀**

If any check fails, refer to FINAL_FIX_SUMMARY.md for detailed algorithm explanation.
