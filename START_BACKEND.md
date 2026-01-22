# 🚀 Quick Start: Backend Database Setup

## ⚠️ CRITICAL: Backend Must Run Separately!

The **frontend** (Next.js) and **backend** (Express) are **TWO separate servers**:

- **Frontend**: Port 8000 (already running ✅)
- **Backend**: Port 5000 (needs to be started) ⚠️

**The backend creates the database tables!**

---

## 📋 Quick Setup (3 Steps)

### Step 1: Install Backend Dependencies

Open a **NEW PowerShell terminal** and run:

```powershell
cd "C:\Users\Mahmoud Hitham\Desktop\Potfolio\backend"
npm install
```

Wait for installation to complete.

### Step 2: Configure Database

Make sure `backend\.env` file exists and has your neon.tech credentials:

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

### Step 3: Start Backend Server

In the **same terminal** (backend folder), run:

```powershell
npm run dev
```

**You should see:**
```
🚀 Initializing Database Connection...
✅ Connected to DB: your-database-name
📊 Database synchronization: ENABLED
📋 Entities registered:
   - Term (table: terms)
   - Class (table: classes)
   ...
🟢 Server running at: http://localhost:5000
```

**This is when tables are created!** ✅

---

## ✅ Verify It's Working

1. **Backend console** shows "✅ Connected to DB"
2. **Backend console** shows "🟢 Server running at: http://localhost:5000"
3. **Visit**: `http://localhost:5000/health` (should return JSON)
4. **Check neon.tech dashboard** - tables should appear

---

## 🐛 Troubleshooting

### "Cannot find module" error
→ Run `npm install` in the backend folder

### "Cannot connect to database" error
→ Check `.env` file has correct credentials

### Port 5000 already in use
→ Change `PORT=5001` in `.env` file

### Tables not created
→ Make sure `NODE_ENV=development` in `.env`

---

## 📝 Summary

**You need TWO terminals running:**

1. **Terminal 1**: Frontend (`npm run dev` or `yarn dev`) → Port 8000 ✅
2. **Terminal 2**: Backend (`cd backend && npm run dev`) → Port 5000 ⚠️

**Only when BOTH are running will the system work!**

