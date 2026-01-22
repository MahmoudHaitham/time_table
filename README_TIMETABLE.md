# University Timetable Management System

A complete, production-ready University Timetable Management System built with Next.js, Express.js, TypeORM, and PostgreSQL.

## 🎯 System Overview

This system provides a comprehensive solution for managing university timetables, including:

- **Admin-managed academic terms**
- **Multiple classes per term** (e.g., 4_1, 4_2)
- **Courses with atomic bundles** (Lecture, Section, Lab)
- **Student timetable generation logic** (foundation)
- **Clean Admin UI** for visual management
- **Safe publishing workflow** with validation

## 🏗️ Architecture

### Backend (`/backend`)
- Express.js REST API
- TypeORM for database operations
- PostgreSQL on neon.tech
- Comprehensive validation engine
- Production-ready error handling

### Frontend (`/app/admin/timetable`)
- Next.js 15 with App Router
- React components with TypeScript
- Modern UI with Tailwind CSS
- Real-time validation feedback

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
DB_HOST=your-neon-host.neon.tech
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_NAME=your-database-name
DB_SSL=true
PORT=5000
CLIENT_URL=http://localhost:8000
```

Start backend:
```bash
npm run dev
```

### 2. Frontend Setup

The frontend is integrated into the Next.js portfolio project. Ensure the backend is running, then:

```bash
npm run dev
```

Navigate to: `http://localhost:8000/admin/timetable`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── data-source.ts      # Database configuration
│   ├── entities/               # TypeORM entities
│   │   ├── Term.ts
│   │   ├── Class.ts
│   │   ├── Course.ts
│   │   ├── ClassCourse.ts
│   │   ├── CourseComponent.ts
│   │   ├── Session.ts
│   │   └── ElectivesAllowed.ts
│   ├── controllers/            # Request handlers
│   ├── routes/                 # Express routes
│   ├── services/               # Business logic
│   │   └── validationService.ts
│   ├── middleware/             # Express middleware
│   ├── app.ts                  # Express app setup
│   └── server.ts               # Server entry point

app/admin/timetable/
├── page.tsx                    # Terms dashboard
├── terms/[id]/page.tsx         # Term details
├── classes/[id]/page.tsx       # Class editor with timetable grid
└── courses/page.tsx            # Courses management

lib/api/
└── timetable.ts                # API client functions
```

## 🔑 Key Features

### 1. Atomic Course Bundles
Courses are treated as atomic bundles. If a course has L + S + LB, they must always exist together. The system enforces this rule strictly.

### 2. Validation Engine
Before publishing a term, the system validates:
- All courses have at least one Lecture (L)
- No incomplete bundles
- Slot ranges are valid (1-8)
- Max 4 sessions per day per class
- No collisions (same day + slot)

### 3. Timetable Grid Editor
Visual grid editor for managing sessions:
- Click cells to add sessions
- Live collision detection
- Day limit enforcement
- Component-based organization

### 4. Electives Management
Configure which elective courses are available per term with a simple checkbox interface.

## 📊 Database Schema

The system uses a normalized PostgreSQL schema:

- **terms**: Academic terms with publish status
- **classes**: Classes per term (e.g., 4_1, 4_2)
- **courses**: Course catalog
- **class_courses**: Many-to-many relationship
- **course_components**: Components (L, S, LB) for each class-course
- **sessions**: Timetable sessions with day, slot, room, instructor
- **electives_allowed**: Allowed electives per term

## 🔌 API Integration

The frontend uses a centralized API client (`lib/api/timetable.ts`) that provides:

- `termsAPI`: Term management
- `classesAPI`: Class management
- `coursesAPI`: Course management
- `classCoursesAPI`: Course assignment
- `componentsAPI`: Component management
- `sessionsAPI`: Session management
- `electivesAPI`: Electives configuration

## 🎨 UI Pages

1. **Terms Dashboard** (`/admin/timetable`)
   - List all terms
   - Create new terms
   - View publish status

2. **Term Details** (`/admin/timetable/terms/[id]`)
   - Manage classes
   - Configure electives
   - View validation results
   - Publish term

3. **Class Editor** (`/admin/timetable/classes/[id]`)
   - Assign courses
   - Create components (atomic bundles)
   - Visual timetable grid editor
   - Manage sessions

4. **Courses Management** (`/admin/timetable/courses`)
   - Create/edit courses
   - Mark as elective/required
   - View all courses

## 🔒 Security & Validation

- Input validation on all endpoints
- Business rule enforcement
- Collision detection
- Day limit enforcement
- Pre-publish validation

## 📝 Environment Variables

### Backend (.env)
```
DB_HOST=your-neon-host.neon.tech
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_NAME=your-database-name
DB_SSL=true
PORT=5000
CLIENT_URL=http://localhost:8000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 🧪 Testing the System

1. **Create a Term**
   - Navigate to `/admin/timetable`
   - Click "Create New Term"
   - Enter term number (e.g., "2024-2025-1")

2. **Create Classes**
   - Open term details
   - Click "Add Class"
   - Enter class code (e.g., "4_1")

3. **Assign Courses**
   - Open class editor
   - Click "Assign Courses"
   - Select courses to assign

4. **Create Components**
   - For each assigned course, click "Create Components"
   - Select component types (L is mandatory, S/LB optional)

5. **Build Timetable**
   - Switch to "Timetable Grid" tab
   - Click cells to add sessions
   - Fill in room and instructor details

6. **Validate & Publish**
   - Return to term details
   - Click "Validate"
   - Review validation results
   - Click "Publish" if validation passes

## 🐛 Troubleshooting

### Database Connection Issues
- Verify `.env` file has correct neon.tech credentials
- Ensure `DB_SSL=true` for neon.tech
- Check database is accessible

### CORS Errors
- Verify `CLIENT_URL` matches your frontend URL
- Check `ALLOWED_ORIGINS` includes frontend origin

### Validation Errors
- Review validation results in term details
- Ensure all courses have Lecture components
- Check for collisions and day limits

## 📚 Additional Resources

- Backend API documentation: `backend/README.md`
- Database schema: See TypeORM entities in `backend/src/entities/`
- Validation rules: See `backend/src/services/validationService.ts`

## 🎯 Future Enhancements

- Student timetable generation UI
- Export to PDF/Excel
- Bulk import/export
- Advanced scheduling algorithms
- Conflict resolution suggestions
- Instructor availability management

---

**Built with ❤️ for efficient university timetable management**

