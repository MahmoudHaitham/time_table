# Timetable Management System - Backend

Full-stack University Timetable Management System backend built with Express.js, TypeORM, and PostgreSQL.

## 🚀 Features

- **Terms Management**: Create and manage academic terms
- **Classes Management**: Organize classes per term (e.g., 4_1, 4_2)
- **Courses Management**: Manage courses with elective/required classification
- **Atomic Course Bundles**: Courses are atomic bundles (L + S + LB must exist together)
- **Timetable Sessions**: Create sessions with day, slot, room, and instructor
- **Validation Engine**: Comprehensive validation before publishing
- **Electives Management**: Configure allowed electives per term

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database (hosted on neon.tech)
- npm or yarn

## 🔧 Setup

1. **Install Dependencies**

```bash
cd backend
npm install
```

2. **Configure Environment Variables**

Create a `.env` file in the `backend` directory:

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

3. **Build the Project**

```bash
npm run build
```

4. **Run the Server**

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## 📚 API Endpoints

### Terms
- `POST /api/terms` - Create a new term
- `GET /api/terms` - Get all terms
- `GET /api/terms/:id` - Get term by ID
- `PUT /api/terms/:id` - Update term
- `POST /api/terms/:id/publish` - Publish term (requires validation)
- `POST /api/terms/:id/validate` - Validate term

### Classes
- `POST /api/terms/:termId/classes` - Create a class for a term
- `GET /api/terms/:termId/classes` - Get all classes for a term

### Courses
- `POST /api/courses` - Create a new course
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID
- `PUT /api/courses/:id` - Update course

### Class Courses
- `POST /api/classes/:classId/courses` - Assign courses to a class
- `GET /api/classes/:classId/courses` - Get all courses for a class

### Components
- `POST /api/class-courses/:id/components` - Create components for a class-course (atomic bundle)
- `GET /api/class-courses/:id/components` - Get all components for a class-course

### Sessions
- `POST /api/components/:componentId/sessions` - Create a session
- `GET /api/components/:componentId/sessions` - Get all sessions for a component
- `PUT /api/sessions/:id` - Update a session
- `DELETE /api/sessions/:id` - Delete a session

### Electives
- `POST /api/terms/:termId/electives` - Set allowed electives for a term
- `GET /api/terms/:termId/electives` - Get allowed electives for a term

## 🗄️ Database Schema

The system uses the following normalized schema:

- **terms**: Academic terms
- **classes**: Classes per term
- **courses**: Course catalog
- **class_courses**: Many-to-many relationship between classes and courses
- **course_components**: Components (L, S, LB) for each class-course
- **sessions**: Timetable sessions (day, slot, room, instructor)
- **electives_allowed**: Allowed electives per term

## 🔒 Business Rules

1. **Atomic Bundles**: A course is an atomic bundle. If it has L + S + LB, they must always exist together.
2. **Mandatory Lecture**: Every course must have at least one Lecture (L) component.
3. **Slot Range**: Slots must be between 1 and 8.
4. **Max Sessions per Day**: Maximum 4 sessions per day per class.
5. **No Collisions**: No two sessions can have the same day + slot in the same class.
6. **Validation Required**: Terms must pass validation before publishing.

## 🧪 Validation

The validation engine checks for:
- Missing Lecture components
- Incomplete bundles
- Invalid slot ranges
- Day overload (more than 4 sessions per day)
- Collisions (same day + slot)
- Empty components

## 📝 Notes

- The database connection pattern matches the reference project (AASTExamSystem)
- Uses TypeORM for database operations
- SSL is enabled for neon.tech PostgreSQL connections
- CORS is configured for frontend integration
- Production-ready error handling and validation

