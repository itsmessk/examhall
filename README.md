# Exam Hall Seating Arrangement System v2.0

A production-ready MERN stack application for automatically generating intelligent exam seating arrangements with JWT authentication, role-based access control, and advanced filtering capabilities.

## Features

### Authentication & Authorization
- ✅ JWT-based authentication with secure password hashing (bcrypt)
- ✅ Role-based access control (Admin & Viewer roles)
- ✅ Protected routes and API endpoints
- ✅ Secure first-time admin setup with setup secret
- ✅ Persistent authentication with localStorage

### Seating Generation
- ✅ Intelligent round-robin algorithm for branch distribution
- ✅ Prevents same branch adjacency (students from same branch don't sit next to each other)
- ✅ Flexible class and room selection
- ✅ Support for multiple room capacities (60-seat and 45-seat rooms)
- ✅ 2D grid layout visualization
- ✅ Color-coded branch representation

### User Interface
- ✅ Modern, responsive React UI with React Router v6
- ✅ Dashboard with quick actions
- ✅ Class management and viewing
- ✅ Interactive seating arrangement creation
- ✅ Seating history with detailed views
- ✅ Print-friendly seating layouts
- ✅ Branch color coding for easy identification

### Data Management
- ✅ 6 branches (CSE, ECE, EEE, MECH, CIVIL, IT)
- ✅ 2 sections per branch (A, B)
- ✅ 50 students per section (600 total students)
- ✅ 10 rooms (6 large @ 60 seats, 4 small @ 45 seats)
- ✅ Seeding endpoints for initial data population

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** v4.18.2 - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** v8.0.0 - MongoDB ODM
- **JWT** (jsonwebtoken v9.0.2) - Authentication tokens
- **bcryptjs** v2.4.3 - Password hashing
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Frontend
- **React** 18.2 - UI library
- **React Router DOM** v6.20 - Client-side routing
- **Vite** 5.0 - Build tool and dev server
- **Axios** 1.6 - HTTP client
- **CSS3** - Styling (no external UI framework)

## Project Structure

```
examhall/
├── backend-v2/                 # Backend server
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── models/
│   │   ├── User.js            # User model with authentication
│   │   ├── Student.js         # Student model
│   │   ├── Room.js            # Room model
│   │   ├── ClassGroup.js      # Class group model
│   │   └── Seating.js         # Seating arrangement model
│   ├── middleware/
│   │   └── authMiddleware.js  # JWT authentication middleware
│   ├── routes/
│   │   ├── authRoutes.js      # Authentication endpoints
│   │   ├── studentRoutes.js   # Student management
│   │   ├── roomRoutes.js      # Room management
│   │   ├── classRoutes.js     # Class group management
│   │   └── seatingRoutes.js   # Seating generation & viewing
│   ├── services/
│   │   └── seatingGenerator.js # Seating algorithm
│   ├── .env                   # Environment variables
│   ├── .env.example           # Environment template
│   ├── package.json
│   └── server.js              # Express app entry point
│
├── frontend-v2/               # Frontend React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx     # Navigation bar
│   │   │   ├── Navbar.css
│   │   │   └── ProtectedRoute.jsx # Route guard
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Authentication context
│   │   ├── pages/
│   │   │   ├── Login.jsx      # Login page
│   │   │   ├── Login.css
│   │   │   ├── Dashboard.jsx  # Main dashboard
│   │   │   ├── Dashboard.css
│   │   │   ├── ClassesPage.jsx # View all classes
│   │   │   ├── ClassesPage.css
│   │   │   ├── NewSeatingPage.jsx # Create new seating
│   │   │   ├── NewSeatingPage.css
│   │   │   ├── SeatingListPage.jsx # View all seatings
│   │   │   ├── SeatingListPage.css
│   │   │   ├── SeatingDetailPage.jsx # View seating detail
│   │   │   └── SeatingDetailPage.css
│   │   ├── api.js             # Axios API helper
│   │   ├── App.jsx            # React Router setup
│   │   ├── App.css            # Global styles
│   │   └── main.jsx           # React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── package.json               # Root package (concurrently scripts)
└── README.md                  # This file
```

## Installation & Setup

### Prerequisites
- **Node.js** v16 or higher
- **MongoDB** (local installation or MongoDB Atlas account)
- **npm** or **yarn** package manager

### 1. Clone the Repository
```bash
git clone <repository-url>
cd examhall
```

### 2. Install Dependencies
Install all dependencies for both backend and frontend:
```bash
npm install
npm run install-all
```

### 3. Configure Environment Variables

Navigate to `backend-v2/` and create a `.env` file based on `.env.example`:

```bash
cd backend-v2
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# MongoDB connection string
MONGO_URI=mongodb://localhost:27017/examhall-v2
# or for MongoDB Atlas:
# MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/examhall-v2

# JWT Secret (use a strong random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Admin Setup Secret (for first user registration)
ADMIN_SETUP_SECRET=your_admin_setup_secret_key

# Server Port
PORT=5000
```

**Security Note:** Generate strong, random secrets for production:
```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Start MongoDB

Ensure MongoDB is running:

**Local MongoDB:**
```bash
mongod
```

**MongoDB Atlas:**
- Create a cluster at https://www.mongodb.com/cloud/atlas
- Add your IP to the whitelist
- Create a database user
- Use the connection string in `.env`

### 5. Run the Application

From the root `examhall/` directory:

```bash
npm run dev
```

This will start:
- **Backend server** on http://localhost:5000
- **Frontend dev server** on http://localhost:3000

## First-Time Setup

### 1. Register First Admin User

**Important:** The first user registration requires the `ADMIN_SETUP_SECRET` from your `.env` file.

Visit http://localhost:3000/login and register with:
- **Email:** admin@example.com (or any email)
- **Password:** your_password
- **Setup Secret:** (use the value from `ADMIN_SETUP_SECRET` in `.env`)

The first user is automatically granted the `admin` role.

### 2. Initialize System Data

After logging in as admin:

1. Go to **Dashboard**
2. Click **"Initialize System Data"** button
3. This will seed:
   - 12 class groups (6 branches × 2 sections)
   - 10 rooms (6 × 60 seats + 4 × 45 seats)
   - 600 students (50 per class group)

### 3. Generate Your First Seating Arrangement

1. Navigate to **"New Seating"** (or click from Dashboard)
2. Fill in exam details:
   - Exam Name (e.g., "Midterm Exam 2024")
   - Exam Date
3. Select classes to include (checkboxes)
4. Select rooms to use (checkboxes)
5. Review the summary (students vs available seats)
6. Click **"Generate Seating"**
7. View the generated seating arrangement

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user (first user = admin) | None |
| POST | `/api/auth/login` | Login user | None |
| GET | `/api/auth/me` | Get current user | Required |

### Students
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/students/seed` | Seed 600 students | Admin |
| GET | `/api/students?branch=CSE&section=A` | Get students with filters | Required |

### Rooms
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/rooms/seed` | Seed 10 rooms | Admin |
| GET | `/api/rooms` | Get all rooms | Required |

### Classes
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/classes/seed` | Seed 12 class groups | Admin |
| GET | `/api/classes` | Get all classes with student counts | Required |

### Seating
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/seating/generate` | Generate new seating arrangement | Admin |
| GET | `/api/seating/latest` | Get latest seating | Required |
| GET | `/api/seating/:id` | Get seating by ID | Required |
| GET | `/api/seating` | Get all seatings | Required |

### Request Examples

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}'
```

**Generate Seating:**
```bash
curl -X POST http://localhost:5000/api/seating/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -d '{
    "examName": "Final Exam 2024",
    "examDate": "2024-12-20",
    "classIds": ["<class1_id>", "<class2_id>"],
    "roomIds": ["<room1_id>", "<room2_id>"]
  }'
```

## Seating Algorithm

The seating generation algorithm follows these principles:

### 1. **Round-Robin Branch Distribution**
- Students are distributed across rooms using a round-robin approach
- Each room receives a balanced mix of all branches

### 2. **Conflict Avoidance**
- Students from the same branch are **not placed adjacent** to each other
- Adjacency includes: left, right, front, and back positions
- If conflict-free placement isn't possible, the algorithm finds the best available seat

### 3. **Room Layouts**
- **60-seat rooms:** 6 rows × 10 columns grid
- **45-seat rooms:** 5 rows × 9 columns grid
- All rooms use 2D array layout for easy visualization

### 4. **Filtering**
- Admins can select specific classes to include
- Admins can select specific rooms to use
- Only selected students are placed in selected rooms

### Example Flow:
1. Filter students by selected classes
2. Filter rooms by selected room IDs
3. Shuffle students for randomization
4. For each student:
   - Find the best room (least occupied)
   - Find the best seat (no adjacent same-branch conflict)
   - Place student and update layout
5. Store seating arrangement with metadata

## User Roles

### Admin
- Can register (with setup secret)
- Can seed data (students, rooms, classes)
- Can generate seating arrangements
- Can view all data

### Viewer
- Can register (after first admin)
- Can view classes
- Can view seating arrangements
- **Cannot** seed data or generate seatings

## Development

### Run Backend Only
```bash
npm run server
```

### Run Frontend Only
```bash
npm run client
```

### Build for Production
```bash
npm run build
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGO_URI` | MongoDB connection string | - | ✅ |
| `JWT_SECRET` | Secret for JWT signing | - | ✅ |
| `ADMIN_SETUP_SECRET` | Secret for first admin registration | - | ✅ |
| `PORT` | Backend server port | 5000 | ❌ |

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000 (backend)
npx kill-port 5000

# Kill process on port 3000 (frontend)
npx kill-port 3000
```

### MongoDB Connection Error
- Ensure MongoDB is running
- Check `MONGO_URI` in `.env`
- Verify network access (for MongoDB Atlas)

### Authentication Error "Invalid token"
- Clear localStorage in browser
- Re-login
- Check `JWT_SECRET` in `.env`

### "Cannot generate seating" Error
- Ensure you've seeded data first
- Check that selected rooms have enough seats for selected students
- Verify you're logged in as admin

## Future Enhancements

- [ ] Export seating to PDF
- [ ] Email notifications to students
- [ ] Import students from CSV
- [ ] Multiple exam sessions
- [ ] Student attendance tracking
- [ ] Room capacity management
- [ ] Historical analytics and reports
- [ ] Mobile app

## License

ISC

## Support

For issues or questions, please create an issue in the repository.

---

**Made with ❤️ using the MERN stack**
