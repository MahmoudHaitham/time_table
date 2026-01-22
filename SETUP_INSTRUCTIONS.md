# Timetable Management System - Setup Instructions

## 🚀 Complete Setup Guide

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database on neon.tech
- npm or yarn package manager

### Step 1: Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create `.env` file** in the `backend` directory:
```env
# Database Configuration (PostgreSQL on neon.tech)
DB_HOST=your-neon-host.neon.tech
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_NAME=your-database-name
DB_SSL=true

# Server Configuration
PORT=5000
HOST=localhost
NODE_ENV=development

# CORS Configuration
CLIENT_URL=http://localhost:8000
ALLOWED_ORIGINS=http://localhost:8000,http://localhost:3000
```

4. **Start the backend server**
```bash
npm run dev
```

The backend should now be running on `http://localhost:5000`

### Step 2: Frontend Setup

1. **Install frontend dependencies** (if not already installed)
```bash
npm install
```

2. **Create `.env.local` file** in the root directory (if needed):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

3. **Start the frontend development server**
```bash
npm run dev
```

The frontend should now be running on `http://localhost:8000`

### Step 3: Access the Admin Interface

Navigate to: `http://localhost:8000/admin/timetable`

## 📋 Initial Setup Workflow

### 1. Create Courses
- Go to `/admin/timetable/courses`
- Click "Create Course"
- Add course code, name, and mark as elective if needed
- Repeat for all courses

### 2. Create a Term
- Go to `/admin/timetable`
- Click "Create New Term"
- Enter term number (e.g., "2024-2025-1")

### 3. Create Classes
- Open the term you created
- Click "Add Class"
- Enter class code (e.g., "4_1", "4_2")

### 4. Assign Courses to Classes
- Open a class from the term
- Click "Assign Courses"
- Select courses to assign to this class

### 5. Create Components (Atomic Bundles)
- For each assigned course, click "Create Components"
- Select component types:
  - **L (Lecture)** - Mandatory
  - **S (Section)** - Optional
  - **LB (Lab)** - Optional
- Remember: If a course has S or LB, it MUST have L

### 6. Build the Timetable
- Switch to "Timetable Grid" tab
- Click on cells (day × slot) to add sessions
- Fill in room and instructor details
- System will prevent collisions and enforce max 4 sessions per day

### 7. Configure Electives
- Return to term details
- Go to "Electives" tab
- Select which elective courses are available for this term

### 8. Validate and Publish
- Click "Validate" button
- Review validation results
- Fix any errors if needed
- Click "Publish" when validation passes

## 🔍 Verification

### Backend Health Check
Visit: `http://localhost:5000/health`

Should return:
```json
{
  "status": "ok",
  "uptime": <number>,
  "timestamp": "<ISO timestamp>"
}
```

### Database Connection
Check backend console for:
```
✅ Connected to DB: <your-database-name>
```

## 🐛 Troubleshooting

### Backend won't start
- Check `.env` file exists and has correct values
- Verify database credentials
- Ensure port 5000 is not in use
- Check Node.js version (18+)

### Frontend can't connect to backend
- Verify backend is running on port 5000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS settings in backend `.env`
- Verify `CLIENT_URL` matches frontend URL

### Database connection errors
- Verify neon.tech credentials
- Ensure `DB_SSL=true` for neon.tech
- Check database is accessible
- Verify network connectivity

### Validation errors
- Ensure all courses have at least one Lecture (L) component
- Check for collisions (same day + slot)
- Verify max 4 sessions per day per class
- Check slot ranges (1-8)

## 📚 API Endpoints Reference

All endpoints are prefixed with `/api`:

- **Terms**: `/api/terms`
- **Classes**: `/api/terms/:termId/classes`
- **Courses**: `/api/courses`
- **Class Courses**: `/api/classes/:classId/courses`
- **Components**: `/api/class-courses/:id/components`
- **Sessions**: `/api/components/:componentId/sessions`
- **Electives**: `/api/terms/:termId/electives`

See `backend/README.md` for detailed API documentation.

## ✅ System Ready!

Once setup is complete, you can:
- Manage academic terms
- Create and organize classes
- Assign courses to classes
- Build timetables visually
- Validate and publish terms
- Configure electives

The system is production-ready and follows all business rules and validation requirements.

