# Authentication System - Complete Setup

## ✅ What's Been Created

### Backend
1. **User Entity** (`backend/src/entities/User.ts`)
   - Stores admin users with registration number, password (hashed), full name, role
   - Auto-created in database when backend starts

2. **Auth Controller** (`backend/src/controllers/authController.ts`)
   - `register` - Create new admin account
   - `login` - Authenticate user
   - `getCurrentUser` - Get logged-in user info

3. **Auth Middleware** (`backend/src/middleware/auth.ts`)
   - `requireAuth` - Verify JWT token
   - `requireAdmin` - Verify admin role

4. **Auth Routes** (`backend/src/routes/authRoutes.ts`)
   - `POST /api/auth/register` - Register
   - `POST /api/auth/login` - Login
   - `GET /api/auth/me` - Get current user (protected)

### Frontend
1. **Login Page** (`/login`)
   - Beautiful login/register form matching portfolio style
   - Toggle between login and register
   - Stores JWT token in localStorage

2. **Protected Admin Routes**
   - All `/admin/timetable/*` routes require authentication
   - Redirects to `/login` if not authenticated
   - Token sent with all API requests

3. **Layouts**
   - `app/admin/layout.tsx` - Admin layout (no header/footer, has MagicBackground)
   - `app/timetable/layout.tsx` - Timetable layout (no header/footer, has MagicBackground)

4. **Styled Pages**
   - All admin and timetable pages match portfolio style
   - Glassmorphism effects
   - Gradient buttons
   - Smooth animations
   - Impressive visual design

## 🚀 How to Use

### 1. First Time Setup

**Create Admin Account:**
1. Go to `http://localhost:8000/login`
2. Click "Register" tab
3. Fill in:
   - Full Name
   - Registration Number
   - Password
4. Click "Create Account"
5. You'll be automatically logged in and redirected to admin dashboard

### 2. Login

**Login to Admin:**
1. Go to `http://localhost:8000/login`
2. Enter registration number and password
3. Click "Sign In"
4. Redirected to `/admin/timetable`

### 3. Access Routes

**Admin Routes (Protected):**
- `/admin/timetable` - Terms dashboard
- `/admin/timetable/terms/[id]` - Term details
- `/admin/timetable/classes/[id]` - Class editor
- `/admin/timetable/courses` - Courses management

**Public Routes:**
- `/timetable` - View published timetables
- `/timetable/terms/[id]` - View timetable for a term

## 🔒 Security

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens expire in 7 days
- Tokens stored in localStorage
- All admin API routes protected with `requireAuth` middleware
- Automatic redirect to login if token invalid/expired

## 📝 Environment Variables

Add to `backend/.env`:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## 🎨 Design Features

All pages now feature:
- ✅ MagicBackground component (animated canvas)
- ✅ FloatingShapes component (floating orbs)
- ✅ Glassmorphism effects (glass borders)
- ✅ Gradient buttons (cyan to blue)
- ✅ Smooth animations (Framer Motion)
- ✅ Hover effects and transitions
- ✅ No header/footer on admin/timetable pages
- ✅ Consistent portfolio styling

## 🔄 Logout

Click "Logout" button in admin dashboard to clear token and redirect to login.

---

**Status:** ✅ Complete and Ready to Use!

