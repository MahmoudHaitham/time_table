# Database Setup Guide

## ⚠️ IMPORTANT: Backend Must Be Running Separately

The database tables are created by the **backend server**, not the frontend. You need to run **TWO separate processes**:

1. **Backend Server** (creates database tables)
2. **Frontend Server** (Next.js app)

## 🚀 Step-by-Step Setup

### Step 1: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Database (.env file)

Make sure `backend/.env` has your neon.tech credentials:

```env
DB_HOST=your-neon-host.neon.tech
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_NAME=your-database-name
DB_SSL=true
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:8000
```

### Step 3: Start Backend Server (THIS CREATES TABLES)

Open a **NEW terminal window** and run:

```bash
cd backend
npm run dev
```

You should see:
```
🚀 Initializing Database Connection...
✅ Connected to DB: your-database-name
📊 Database synchronization: ENABLED (tables will be auto-created from entities)
📋 Entities registered:
   - Term (table: terms)
   - Class (table: classes)
   - Course (table: courses)
   - ClassCourse (table: class_courses)
   - CourseComponent (table: course_components)
   - Session (table: sessions)
   - ElectivesAllowed (table: electives_allowed)
✅ Tables will be automatically created/updated based on entities
🟢 Server running at: http://localhost:5000
```

**This is when tables are created!** The backend connects to PostgreSQL and TypeORM automatically creates all tables.

### Step 4: Start Frontend Server (Separate Terminal)

In a **different terminal**, run:

```bash
npm run dev
# or
yarn dev
```

This starts the Next.js frontend on port 8000.

## 🔍 Verify Tables Were Created

After starting the backend, you can verify tables were created by:

1. **Check backend console** - Should show "✅ Connected to DB"
2. **Check neon.tech dashboard** - Go to your database and check the tables
3. **Test API endpoint** - Visit `http://localhost:5000/health`

## 🐛 Troubleshooting

### Tables Not Created?

1. **Check backend is running** - Must see "🟢 Server running" message
2. **Check .env file** - Verify database credentials are correct
3. **Check NODE_ENV** - Should be `development` (not `production`)
4. **Check database connection** - Backend console should show connection success
5. **Check for errors** - Look for any error messages in backend console

### Common Errors

**Error: "Cannot connect to database"**
- Check DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME in .env
- Verify DB_SSL=true for neon.tech
- Check internet connection

**Error: "synchronize is disabled"**
- Make sure NODE_ENV=development (not production)
- Check backend/.env file

**Tables exist but empty**
- This is normal! Tables are created empty
- You need to add data through the admin interface

## ✅ Success Checklist

- [ ] Backend dependencies installed (`npm install` in backend folder)
- [ ] `.env` file created in `backend/` folder with correct credentials
- [ ] Backend server started (`npm run dev` in backend folder)
- [ ] Backend console shows "✅ Connected to DB"
- [ ] Backend console shows "📊 Database synchronization: ENABLED"
- [ ] Backend console shows list of entities
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 8000 (separate terminal)
- [ ] Can access `http://localhost:5000/health`
- [ ] Can access `http://localhost:8000/admin/timetable`

## 📝 Important Notes

- **Backend and Frontend are separate** - They run on different ports (5000 vs 8000)
- **Tables are created by backend** - Only when backend starts with `synchronize: true`
- **Development mode** - `NODE_ENV=development` enables auto table creation
- **Production mode** - `NODE_ENV=production` disables auto table creation (for safety)

---

**Remember: The backend server MUST be running for the database to work!**

