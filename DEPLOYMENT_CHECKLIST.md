# Deployment Checklist - Schedule Template Optimization

## ✅ Pre-Deployment

### 1. Code Review
- [ ] All new files created and added to git
- [ ] No console.log statements (only console.error/warn/info)
- [ ] TypeScript compiles without errors
- [ ] No linter errors

### 2. Database Preparation
- [ ] Backup production database
- [ ] Review migration script: `backend/migrations/add_schedule_templates.sql`
- [ ] Test migration on development database first

### 3. Configuration Check
- [ ] `synchronize: false` in production (data-source.ts)
- [ ] Database connection settings correct
- [ ] Environment variables set

---

## 🚀 Deployment Steps

### Step 1: Stop Backend (Optional - Zero Downtime)
```bash
# If using Docker
docker compose -f docker-compose.prod.yml stop backend

# Or keep running for zero downtime (new code backward compatible)
```

### Step 2: Pull Latest Code
```bash
cd ~/portfolio
git pull origin deploy
```

### Step 3: Run Database Migration
```bash
# Connect to PostgreSQL
psql -h localhost -U your_user -d your_database

# Run migration
\i backend/migrations/add_schedule_templates.sql

# Verify table exists
\dt schedule_templates
\d schedule_templates

# Exit
\q
```

**OR** if using TypeORM with synchronize:
```bash
# Tables auto-created on startup (development only!)
# Check logs after starting backend
```

### Step 4: Rebuild Backend
```bash
# Using Docker
docker compose -f docker-compose.prod.yml build backend

# Or direct build
cd backend
npm run build
```

### Step 5: Start Backend
```bash
# Using Docker
docker compose -f docker-compose.prod.yml up -d backend

# Or direct start
cd backend
npm start
```

### Step 6: Verify Backend Started
```bash
# Check logs
docker logs portfolio-backend --tail 100

# OR
pm2 logs backend

# Look for:
# ✅ "Database connection established"
# ✅ "Server running on port 5000"
# ✅ No TypeORM errors about missing table
```

### Step 7: Test Health Endpoint
```bash
curl http://localhost:5000/health
# Expected: {"status":"ok"}
```

---

## 🧪 Post-Deployment Verification

### Test 1: Template System Works
```bash
# Generate schedule (first time - will be slow but creates template)
curl -X POST "http://localhost:5000/api/timetable/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "termId": "VALID_TERM_TOKEN",
    "systemType": 180,
    "excludedDays": ["Thursday"],
    "electiveCourseIds": [],
    "preferredInstructors": []
  }'

# Check logs for:
# "🎯 Using template system for optimized generation..."
# "💾 Saved new template to database"
```

### Test 2: Template Reuse Works (FAST!)
```bash
# Run same request again - should be MUCH faster
curl -X POST "http://localhost:5000/api/timetable/generate" \
  -H "Content-Type: application/json" \
  -d '{ ... same data ... }'

# Check logs for:
# "✅ Found existing template"
# "🚀 FROM TEMPLATE (fast path)"
# Time should be 1-2 seconds vs 52 seconds
```

### Test 3: Admin Endpoints Work
```bash
# Get admin token first
TOKEN=$(curl -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.token')

# List templates
curl "http://localhost:5000/api/timetable/admin/templates" \
  -H "Authorization: Bearer $TOKEN"

# Expected: List of templates with stats
```

### Test 4: Database Check
```bash
# Connect to database
psql -h localhost -U your_user -d your_database

# Check templates
SELECT 
  id, 
  term_id, 
  system_type, 
  schedule_count, 
  access_count,
  last_accessed_at 
FROM schedule_templates 
ORDER BY access_count DESC;

# Exit
\q
```

---

## 📊 Monitoring (First 24 Hours)

### Watch Logs for Performance
```bash
# Follow logs
docker logs -f portfolio-backend | grep -E "FROM TEMPLATE|DIRECT GENERATION|Generation completed"

# Look for:
# - "🚀 FROM TEMPLATE (fast path)" - Good! Using templates
# - "⏱️ DIRECT GENERATION (slow path)" - Expected first time
# - "Generation completed in X.XXs" - Should be 1-2s for templates
```

### Check Template Hit Rate
```bash
# Count template usage
docker logs portfolio-backend | grep "FROM TEMPLATE" | wc -l
docker logs portfolio-backend | grep "DIRECT GENERATION" | wc -l

# Hit rate should be >80% after a few hours
```

### Monitor Database
```bash
# Template count
psql -c "SELECT COUNT(*) FROM schedule_templates;"

# Template sizes
psql -c "SELECT 
  id, 
  term_id, 
  system_type, 
  schedule_count,
  pg_size_pretty(pg_column_size(base_schedules)) as size 
FROM schedule_templates 
ORDER BY pg_column_size(base_schedules) DESC 
LIMIT 10;"

# Most used templates
psql -c "SELECT 
  id, 
  term_id, 
  system_type, 
  access_count,
  last_accessed_at 
FROM schedule_templates 
ORDER BY access_count DESC 
LIMIT 10;"
```

---

## 🚨 Rollback Plan

### If Template System Fails

**Symptoms:**
- All requests showing errors
- No schedules generated
- Backend crashes

**Rollback Steps:**

#### Option 1: Disable Templates (Quick Fix)
```typescript
// In timetableViewController.ts
// Comment out template logic, use direct generation:

// **NEW: Use template system**
// Comment this out temporarily:
/*
const templateResult = await getOrCreateScheduleTemplate(...);
*/

// Use this instead:
const schedules = generateScheduleCombinations(
  coreCoursesWithSessions,
  electiveCoursesWithSessions,
  excludedDays,
  preferredInstructors
);
schedules.sort((a, b) => b.score - a.score);
const topSchedules = schedules.slice(0, 50);
```

Rebuild and restart backend.

#### Option 2: Full Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin deploy

# Rebuild and restart
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend
```

#### Option 3: Drop Table (Last Resort)
```sql
-- Only if table causes issues
DROP TABLE IF EXISTS schedule_templates CASCADE;
```

System will fall back to direct generation automatically.

---

## 🎯 Success Metrics

### Week 1 Goals
- ✅ 90% template hit rate
- ✅ Average response time <3 seconds
- ✅ No crashes or errors
- ✅ At least 20 templates created

### Week 2 Goals
- ✅ Template hit rate remains >85%
- ✅ Popular templates have high `access_count`
- ✅ Database size reasonable (<100MB for templates)
- ✅ Students report faster loading

### Performance Benchmarks
| Metric | Target | How to Measure |
|--------|--------|----------------|
| Template hit rate | >90% | Logs analysis |
| Avg response time | 1-3s | Log timestamps |
| Template creation | <60s | Monitor first requests |
| Database growth | <10MB/week | `pg_database_size` |

---

## 🔧 Maintenance

### Daily
- [ ] Check error logs for template failures
- [ ] Monitor response times

### Weekly
- [ ] Review template usage statistics
- [ ] Check database size
- [ ] Pre-generate templates for new terms

### Monthly
- [ ] Cleanup old templates (>30 days unused)
- [ ] Analyze most-used elective combinations
- [ ] Review and optimize template sizes

---

## 📞 Troubleshooting Contact

### If Issues Occur:

1. **Check logs first:**
   ```bash
   docker logs portfolio-backend --tail 500
   ```

2. **Check database:**
   ```sql
   SELECT * FROM schedule_templates LIMIT 5;
   ```

3. **Try fallback:**
   - System automatically falls back to direct generation
   - Slower but functional

4. **Report issues:**
   - Include error logs
   - Include request that failed
   - Include database state

---

## ✅ Deployment Complete!

If all tests pass:
- [x] Backend running
- [x] Templates table exists
- [x] Templates being created
- [x] Templates being used (fast responses)
- [x] Admin endpoints work
- [x] No errors in logs

**Status:** 🎉 **DEPLOYED SUCCESSFULLY** 🎉

Students can now generate schedules in 1-2 seconds instead of 52 seconds!

---

## 📚 Next Steps

### Optional Enhancements (Future)

1. **Pre-generate Popular Combinations**
   ```bash
   # Run weekly for active terms
   curl -X POST "http://localhost:5000/api/timetable/admin/templates/generate/:termId"
   ```

2. **Setup Monitoring Alerts**
   - Alert if template hit rate < 70%
   - Alert if avg response time > 10s
   - Alert if database size > 500MB

3. **Enable Redis Caching** (Future Enhancement)
   - Store templates in Redis
   - Even faster than database
   - Shared across backend instances

4. **Automatic Template Refresh**
   - Regenerate when timetable changes detected
   - Schedule nightly template optimization
   - Remove unused templates automatically
