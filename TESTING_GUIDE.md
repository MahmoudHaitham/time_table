# Testing Guide - Schedule Template Optimization

## 🧪 Test the Template System

### Prerequisites
1. Backend is running
2. Database has published terms with timetable data
3. You have admin credentials

---

## Test 1: Verify Template Creation (First Request)

### Step 1: Clear Existing Templates (Optional)
```bash
# Delete all templates for fresh test
curl -X DELETE "http://localhost:5000/api/timetable/admin/templates/5/invalidate" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Step 2: Generate Schedule (First Time - Should Create Template)
```bash
curl -X POST "http://localhost:5000/api/timetable/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "termId": "YOUR_TERM_TOKEN",
    "systemType": 180,
    "excludedDays": ["Thursday"],
    "electiveCourseIds": [301, 401],
    "preferredInstructors": []
  }'
```

**Expected:**
- ⏱️ Takes ~52 seconds (first time)
- Logs show: `DIRECT GENERATION (slow path)`
- Logs show: `💾 Saved new template to database`
- Response contains 50 schedules

### Step 3: Check Template Was Created
```bash
curl "http://localhost:5000/api/timetable/admin/templates" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "term_id": 5,
      "system_type": 180,
      "elective_course_ids": [301, 401],
      "schedule_count": 150,
      "access_count": 1,
      "last_accessed_at": "2026-01-25T..."
    }
  ],
  "total": 1
}
```

---

## Test 2: Verify Template Usage (Second Request - FAST!)

### Step 1: Generate Schedule Again (Same Preferences)
```bash
curl -X POST "http://localhost:5000/api/timetable/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "termId": "YOUR_TERM_TOKEN",
    "systemType": 180,
    "excludedDays": ["Thursday"],
    "electiveCourseIds": [301, 401],
    "preferredInstructors": []
  }'
```

**Expected:**
- ⚡ Takes ~1-2 seconds (26-52x faster!)
- Logs show: `✅ Found existing template (ID: 1)`
- Logs show: `🚀 FROM TEMPLATE (fast path)`
- Response contains 50 schedules
- **Schedules are identical to first request** (same output!)

### Step 2: Try Different Excluded Days (Still Uses Template)
```bash
curl -X POST "http://localhost:5000/api/timetable/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "termId": "YOUR_TERM_TOKEN",
    "systemType": 180,
    "excludedDays": ["Friday"],
    "electiveCourseIds": [301, 401],
    "preferredInstructors": []
  }'
```

**Expected:**
- ⚡ Takes ~1-2 seconds (FAST!)
- Logs show: `🚀 FROM TEMPLATE (fast path)`
- Different schedules (filtered for Friday instead of Thursday)
- **Uses same template, different filter**

### Step 3: Try Preferred Instructors (Still Uses Template)
```bash
curl -X POST "http://localhost:5000/api/timetable/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "termId": "YOUR_TERM_TOKEN",
    "systemType": 180,
    "excludedDays": ["Thursday"],
    "electiveCourseIds": [301, 401],
    "preferredInstructors": ["Dr. Ahmed", "Dr. Mohamed"]
  }'
```

**Expected:**
- ⚡ Takes ~1-2 seconds (FAST!)
- Logs show: `🚀 FROM TEMPLATE (fast path)`
- Schedules prioritize preferred instructors
- **Uses same template, re-scores for instructors**

---

## Test 3: Pre-Generation (Admin Feature)

### Step 1: Pre-generate Templates
```bash
curl -X POST "http://localhost:5000/api/timetable/admin/templates/generate/5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected:**
- Response: `"status": "in_progress"`
- Background job starts
- Logs show template generation progress
- Creates templates for core-only + each elective

### Step 2: Check Templates Were Created
```bash
curl "http://localhost:5000/api/timetable/admin/templates" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected:**
Multiple templates (one per elective combination):
```json
{
  "success": true,
  "data": [
    { "elective_course_ids": null, "schedule_count": 200 },
    { "elective_course_ids": [301], "schedule_count": 180 },
    { "elective_course_ids": [401], "schedule_count": 190 }
  ],
  "total": 3
}
```

---

## Test 4: Template Invalidation

### Step 1: Modify Timetable Data
(Simulate updating sessions or classes)

### Step 2: Invalidate Templates
```bash
curl -X DELETE "http://localhost:5000/api/timetable/admin/templates/5/invalidate" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected:**
```json
{
  "success": true,
  "message": "Invalidated 3 template(s) for term 5",
  "deleted_count": 3
}
```

### Step 3: Verify Templates Are Gone
```bash
curl "http://localhost:5000/api/timetable/admin/templates" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected:**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

### Step 4: Next Request Recreates Template
```bash
curl -X POST "http://localhost:5000/api/timetable/generate" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

**Expected:**
- Takes ~52 seconds (regenerates template)
- Logs show: `DIRECT GENERATION (slow path)`
- Template is saved for future use

---

## Test 5: Performance Comparison

### Measure Without Template
```bash
# Clear templates
curl -X DELETE "http://localhost:5000/api/timetable/admin/templates/5/invalidate" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Time the request
time curl -X POST "http://localhost:5000/api/timetable/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "termId": "YOUR_TERM_TOKEN",
    "systemType": 180,
    "excludedDays": ["Thursday"],
    "electiveCourseIds": [301],
    "preferredInstructors": []
  }'
```

**Expected:** ~52 seconds

### Measure With Template
```bash
# Run same request again
time curl -X POST "http://localhost:5000/api/timetable/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "termId": "YOUR_TERM_TOKEN",
    "systemType": 180,
    "excludedDays": ["Thursday"],
    "electiveCourseIds": [301],
    "preferredInstructors": []
  }'
```

**Expected:** ~1-2 seconds (**26-52x faster!**)

---

## Test 6: Output Consistency

### Verify Same Results
Generate schedules twice and compare:

```bash
# First request (creates template)
curl -X POST "http://localhost:5000/api/timetable/generate" \
  -H "Content-Type: application/json" \
  -d '{ ... }' > result1.json

# Clear templates
curl -X DELETE "http://localhost:5000/api/timetable/admin/templates/5/invalidate" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Second request (regenerates)
curl -X POST "http://localhost:5000/api/timetable/generate" \
  -H "Content-Type: application/json" \
  -d '{ ... }' > result2.json

# Compare
diff result1.json result2.json
```

**Expected:** Files are identical (same schedules, same order)

---

## Test 7: Template Cleanup

### Step 1: Create Old Templates
(Manually set `last_accessed_at` to 31 days ago in database)

```sql
UPDATE schedule_templates 
SET last_accessed_at = NOW() - INTERVAL '31 days'
WHERE id = 1;
```

### Step 2: Run Cleanup
```bash
curl -X POST "http://localhost:5000/api/timetable/admin/templates/cleanup?daysOld=30" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected:**
```json
{
  "success": true,
  "message": "Cleaned up 1 old template(s)",
  "deleted_count": 1
}
```

---

## Test 8: Error Handling

### Test 1: Template System Fails
(Stop database temporarily)

```bash
curl -X POST "http://localhost:5000/api/timetable/generate" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

**Expected:**
- Logs show: `⚠️ Template system failed, falling back to direct generation`
- Request still succeeds (fallback works)
- Takes ~52 seconds

### Test 2: Invalid Template Data
(Corrupt template JSON in database)

**Expected:**
- System detects corruption
- Falls back to direct generation
- Regenerates valid template

---

## 📊 Success Criteria

✅ **Template Creation**
- First request creates template
- Template appears in admin list
- `schedule_count` > 0

✅ **Template Usage**
- Second request is 26-52x faster
- Logs show "FROM TEMPLATE"
- Same output as direct generation

✅ **Pre-generation**
- Admin can trigger pre-generation
- Background job completes
- Multiple templates created

✅ **Invalidation**
- Templates deleted on command
- Next request regenerates

✅ **Filtering**
- Different excluded days = different results
- Preferred instructors = re-ranked results
- All use same template (fast!)

✅ **Consistency**
- Template results = direct generation results
- No data loss or corruption
- Schedules are identical

✅ **Error Handling**
- System never crashes
- Always falls back to direct generation
- Errors logged but don't affect users

---

## 🐛 Common Issues

### Templates Not Being Used
**Check:**
1. Table exists: `SELECT * FROM schedule_templates;`
2. Elective IDs match exactly
3. System type matches

### Slow Performance
**Check:**
1. Template has enough schedules (`schedule_count` > 50)
2. Database indexes exist
3. JSONB column not too large

### Different Results
**Check:**
1. Scoring logic is identical
2. Sorting is consistent
3. No randomization in filtering

---

## 📈 Performance Metrics to Monitor

1. **Template Hit Rate**: Should be ~90%
   - Check: Count "FROM TEMPLATE" vs "DIRECT GENERATION" in logs

2. **Average Response Time**: Should be 1-2 seconds
   - Measure: Time 100 requests with templates

3. **Template Usage**: Popular templates accessed often
   - Check: `access_count` in database

4. **Storage**: Templates use reasonable space
   - Check: Table size with `pg_total_relation_size('schedule_templates')`

---

## ✅ Final Validation

Run this complete test suite:

```bash
# 1. Clear templates
curl -X DELETE ".../invalidate"

# 2. First request (slow - creates template)
time curl -X POST ".../generate" -d '{ ... }'
# Expected: ~52s

# 3. Second request (fast - uses template)
time curl -X POST ".../generate" -d '{ ... }'
# Expected: ~1-2s

# 4. Different preferences (fast - uses same template)
time curl -X POST ".../generate" -d '{ "excludedDays": ["Friday"] }'
# Expected: ~1-2s

# 5. Verify templates exist
curl ".../admin/templates"
# Expected: At least 1 template

# SUCCESS! 🎉
```

If all tests pass, the template optimization is working correctly! 🚀
