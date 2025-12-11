# Multi-Session Seating Feature

## Overview

The Exam Seating Manager now supports **automatic multi-session seating** when the number of students exceeds available room capacity. This ensures all students can be seated across multiple exam shifts without manual intervention.

## Features

### 1. **Multi-Session Mode (Default)**
- Automatically creates multiple exam sessions/shifts when students > available seats
- Each session uses the same rooms with full capacity
- All students are guaranteed seating across all sessions
- CSE year separation rules apply independently per session

**Example:** 920 students, 725 seats → Creates 2 sessions (Session 1: 725 students, Session 2: 195 students)

### 2. **Single Session Mode (Legacy)**
- Fills available seats only
- Tracks overflow students who couldn't be seated
- Non-blocking warning displayed
- Useful when overflow is expected to be handled manually

### 3. **Expand Rooms Mode**
- Virtually increases room capacity by adding seats
- Maximum expansion: 50% of original capacity per room
- Falls back to multi-session if still insufficient
- Use only when physically feasible (extra chairs available)

## API Changes

### POST `/api/seating/generate`

**New Request Body:**
```json
{
  "examName": "Mid Sem 1",
  "examDate": "2025-12-12",
  "classIds": ["..."],
  "roomIds": ["..."],
  "mode": "multi" | "single" | "expand_rooms",
  "expandOptions": {
    "addSeatsPerRoom": 10
  }
}
```

**Response (Multi-Session):**
```json
{
  "success": true,
  "message": "Generated 2 sessions. Total students: 920, Seats per session: 725",
  "data": {
    "_id": "...",
    "examName": "Mid Sem 1",
    "mode": "multi",
    "totalStudents": 920,
    "totalSeats": 725,
    "sessionsNeeded": 2,
    "sessions": [
      {
        "sessionNumber": 1,
        "studentCount": 725,
        "roomLayouts": [...],
        "unassignedCount": 0
      },
      {
        "sessionNumber": 2,
        "studentCount": 195,
        "roomLayouts": [...],
        "unassignedCount": 0
      }
    ]
  }
}
```

### GET `/api/seating/:id/session/:sessionNumber`

Retrieve specific session data for efficient rendering.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "examName": "Mid Sem 1",
    "mode": "multi",
    "totalStudents": 920,
    "sessionsNeeded": 2,
    "currentSession": {
      "sessionNumber": 1,
      "studentCount": 725,
      "roomLayouts": [...]
    }
  }
}
```

## Frontend Changes

### New Seating Page (`NewSeatingPage.jsx`)

**Mode Selector Added:**
- Radio buttons for: Multi-session (default), Single session, Expand rooms
- Numeric input for seats to add per room (expand mode only)
- Visual feedback with descriptions for each mode

**Updated API Call:**
```javascript
const payload = {
  examName,
  examDate,
  classIds: selectedClasses,
  roomIds: selectedRooms,
  mode,
  expandOptions: mode === 'expand_rooms' ? { addSeatsPerRoom } : undefined
};

const response = await generateSeating(payload);
```

### Seating Detail Page (`SeatingDetailPage.jsx`)

**Session Selector:**
- Tab-style selector showing all sessions
- Displays student count per session
- Switches room layouts when session changes
- Banner showing multi-session summary

**Info Banners:**
- Multi-session: "2 sessions created. Total: 920 students, 725 seats per session"
- Expand mode: "Room capacities expanded by 10 seats. Total seats: 795"

## Backend Implementation

### Key Files Modified

1. **`models/Seating.js`** - Extended schema:
   - `mode` (single/multi/expand_rooms)
   - `totalStudents`, `totalSeats`, `sessionsNeeded`
   - `sessions[]` array with session data
   - `expandApplied`, `expandOptions`

2. **`services/seatingGenerator.js`** - New functions:
   - `generateSeatingPlan()` - Main orchestrator
   - `partitionStudentsIntoSessions()` - Split students
   - `expandRoomCapacities()` - Virtual capacity expansion
   - `generateSingleSession()` - Legacy mode handler

3. **`routes/seatingRoutes.js`** - Updated endpoints:
   - POST `/api/seating/generate` with mode validation
   - GET `/api/seating/:id/session/:n` for session retrieval

## Rules Preserved

✅ **Year Separation:** Each room contains ONLY Year 1 OR Year 2 (enforced per session)  
✅ **CSE Alternation:** CSE/non-CSE alternation in all rooms (per session)  
✅ **Room Ordering:** Numeric sort (R1, R2...R10)  
✅ **Smart Gaps:** Even distribution of empty seats  
✅ **Branch Conflict:** Avoid same branch in adjacent seats  

## Testing

### Test Scenario 1: Multi-Session (920 students, 10 rooms = 725 seats)
1. Select all 14 classes (920 students)
2. Select all 10 rooms (725 seats)
3. Choose "Multi-session" mode
4. Generate seating
5. **Expected:** 2 sessions created, Session 1 full (725), Session 2 partial (195)

### Test Scenario 2: Expand Rooms
1. Select classes with 800 students
2. Select rooms with 725 seats
3. Choose "Expand rooms" mode with +10 seats/room
4. Generate seating
5. **Expected:** 1 session, 825 total seats, all students seated

### Test Scenario 3: Single Session with Overflow
1. Select all classes (920 students)
2. Select all rooms (725 seats)
3. Choose "Single session" mode
4. Generate seating
5. **Expected:** 1 session, 725 seated, 195 unassigned (warning shown)

## Console Logs

The backend logs key information during generation:

```
[MULTI-SESSION] Total students: 920, Seats per session: 725, Sessions needed: 2
[SESSION 1] Seating 725 students
[SESSION 2] Seating 195 students
[MULTI-SESSION] Successfully created 2 sessions
```

## Migration Notes

- **Backward Compatible:** Old single-session seatings still work
- **Default Mode:** `multi` (recommended for all new seatings)
- **Legacy Data:** Existing seatings use `rooms[]` field, new ones use `sessions[]`
- **Frontend Detection:** Checks `seating.mode === 'multi'` to render session selector

## Best Practices

1. **Use Multi-Session by default** - Guarantees all students are seated
2. **Expand Rooms carefully** - Only when physically feasible (extra chairs available)
3. **Single Session** - Use only when overflow is expected and handled manually
4. **Session Planning** - Consider exam scheduling when multiple sessions are created

## Known Limitations

1. Room expansion capped at 50% of original capacity (safety limit)
2. Sessions use same room configuration (cannot mix different room sets per session)
3. Expand mode falls back to multi if still insufficient capacity

---

**Version:** 2.0  
**Last Updated:** December 2025  
**Author:** Exam Seating Manager Team
