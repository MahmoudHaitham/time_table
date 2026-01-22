# Schedule Caching System

This document describes the database-backed schedule caching system that stores generated schedules based on student preferences to avoid regenerating the same schedules for different students.

## 🎯 Purpose

When multiple students request schedules with the same preferences (same term, same excluded days, same elective courses), the system:
1. Checks if schedules already exist in the database
2. Returns cached schedules immediately (saving computation resources)
3. Only generates new schedules if they don't exist
4. Saves newly generated schedules for future use

## 📊 Database Schema

### ScheduleCache Entity

```typescript
{
  id: number                    // Primary key
  term_id: number              // Foreign key to terms table
  excluded_days: string         // JSON array of excluded days
  excluded_days_hash: string   // MD5 hash for quick lookup (indexed)
  elective_course_ids: string  // JSON array of elective course IDs (nullable)
  elective_course_ids_hash: string // MD5 hash for quick lookup (nullable, indexed)
  schedules: jsonb             // Full schedule data as JSON
  access_count: number         // Track usage statistics
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Indexes

- Unique composite index on `(term_id, excluded_days_hash, elective_course_ids_hash)` for fast lookups

## 🔄 Workflow

### 1. Request Flow

```
Student Request
    ↓
Check In-Memory Cache
    ↓ (miss)
Check Database Cache
    ↓ (miss)
Generate Schedules
    ↓
Save to Database
    ↓
Save to In-Memory Cache
    ↓
Return Results
```

### 2. Cache Lookup Process

1. **Normalize preferences**: Sort excluded days and elective IDs for consistency
2. **Generate hash**: Create MD5 hash of preferences for database lookup
3. **Check in-memory cache**: Fast lookup (milliseconds)
4. **Check database cache**: If in-memory miss, query database (tens of milliseconds)
5. **Generate if needed**: Only if both caches miss (seconds)

### 3. Cache Storage

- **In-Memory Cache**: Fast access, 30-minute TTL
- **Database Cache**: Persistent storage, survives server restarts
- **Access Tracking**: Increments `access_count` on each use

## 💾 Benefits

### Resource Savings
- **CPU**: Avoids expensive schedule generation computation
- **Database**: Reduces query load
- **Time**: Instant responses for cached requests

### Scalability
- **100-300 concurrent users**: Shared cache benefits all users
- **Popular preferences**: Most common preference combinations are cached
- **Database persistence**: Cache survives server restarts

## 🔧 Implementation Details

### Hash Generation

```typescript
const sortedExcludedDays = [...excludedDays].sort();
const sortedElectiveIds = electiveCourseIds ? [...electiveCourseIds].sort() : null;

const excludedDaysJson = JSON.stringify(sortedExcludedDays);
const electiveIdsJson = sortedElectiveIds ? JSON.stringify(sortedElectiveIds) : null;

const excludedDaysHash = crypto.createHash("md5").update(excludedDaysJson).digest("hex");
const electiveIdsHash = electiveIdsJson ? crypto.createHash("md5").update(electiveIdsJson).digest("hex") : null;
```

### Database Lookup

```typescript
const existingCache = await scheduleCacheRepo.findOne({
  where: {
    term_id: parsedTermId,
    excluded_days_hash: excludedDaysHash,
    elective_course_ids_hash: electiveIdsHash,
  },
});
```

### Cache Invalidation

When timetable data changes (e.g., sessions updated, courses changed), invalidate caches:

```typescript
import { invalidateTermSchedulesCache } from "../utils/cacheInvalidation";

// Invalidate all schedule caches for a term
await invalidateTermSchedulesCache(termId);
```

## 📈 Performance Impact

### Before Caching
- **First request**: 5-30 seconds (generation time)
- **Subsequent identical requests**: 5-30 seconds (regenerated each time)
- **Database queries**: 50-200+ queries per request

### After Caching
- **First request**: 5-30 seconds (generation + save)
- **Subsequent identical requests**: 50-200ms (database lookup)
- **Database queries**: 1 query (cache lookup)

### Example Scenario

**100 students with same preferences:**
- **Without cache**: 100 × 10 seconds = 1000 seconds of CPU time
- **With cache**: 1 × 10 seconds + 99 × 0.1 seconds = ~20 seconds total
- **Savings**: ~98% reduction in computation time

## 🗄️ Database Maintenance

### Cleanup Old Caches

Periodically clean up old cache entries:

```sql
-- Delete cache entries older than 90 days
DELETE FROM schedule_cache 
WHERE "updatedAt" < NOW() - INTERVAL '90 days';
```

### Monitor Cache Usage

```sql
-- Find most used cache entries
SELECT term_id, excluded_days_hash, access_count, "updatedAt"
FROM schedule_cache
ORDER BY access_count DESC
LIMIT 10;
```

## ⚠️ Important Notes

1. **Cache Consistency**: When timetable data changes, invalidate caches
2. **Storage Size**: JSONB schedules can be large; monitor database size
3. **Race Conditions**: Code handles concurrent requests with duplicate checks
4. **Cache Updates**: If schedules are regenerated, existing cache entries are updated

## 🔮 Future Enhancements

1. **Automatic Cleanup**: Scheduled job to remove old/unused caches
2. **Cache Statistics**: Dashboard showing cache hit rates
3. **Partial Cache**: Cache intermediate results for faster regeneration
4. **Distributed Cache**: Use Redis for multi-server deployments
