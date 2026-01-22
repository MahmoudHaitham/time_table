# System Capacity Analysis

## Current Configuration

### Database Connection Pool
- **Maximum Connections**: 100
- **Minimum Idle**: 10
- **Idle Timeout**: 30 seconds

### Rate Limits (Per User/IP)
- **General API**: 100 requests/minute
- **Timetable Queries**: 50 requests/minute  
- **Schedule Generation**: 10 requests/minute (CPU-intensive)
- **Public Endpoints**: 200 requests/minute

### Caching
- **Max Cache Entries**: 1,000
- **Cache TTL**: 5-30 minutes depending on data type

### Schedule Generation
- **Max Combinations**: 5-15 million (depending on excluded days)
- **CPU-Intensive**: Can take 5-30 seconds per request

## Current Capacity Estimate

### **Conservative Estimate: 200-500 Concurrent Students**

**Breakdown:**

1. **Database Connection Pool (100 connections)**
   - Each student typically makes 2-3 concurrent requests during active use
   - With caching, ~60-70% of requests don't hit the database
   - **Effective capacity**: ~50-100 students actively using database simultaneously
   - **With caching**: ~200-500 students browsing/viewing (most requests cached)

2. **Rate Limits**
   - Per-user limits prevent any single user from overwhelming the system
   - Multiple users can operate simultaneously without interfering
   - **No global bottleneck** from rate limiting

3. **Schedule Generation Bottleneck**
   - CPU-intensive operation (5-30 seconds per request)
   - Limited to 10 requests/minute per user
   - **Capacity**: ~10-20 concurrent schedule generations (if all users generate at once)

4. **Memory & Caching**
   - Cache size: 1,000 entries
   - Each entry: ~10-50KB average
   - **Total cache memory**: ~10-50MB (very manageable)

## Bottlenecks Identified

### 1. **Database Connection Pool (PRIMARY BOTTLENECK)**
- **Current**: 20 connections
- **Impact**: Limits concurrent database operations
- **Mitigation**: Caching reduces database load significantly

### 2. **Schedule Generation (CPU Bottleneck)**
- **Current**: Single-threaded, CPU-intensive
- **Impact**: Can slow down server if many users generate schedules simultaneously
- **Mitigation**: Rate limiting (10/minute per user) prevents abuse

### 3. **No Global Rate Limit**
- **Current**: Only per-user limits
- **Impact**: If 1000 users all hit at once, could overwhelm server
- **Mitigation**: Caching handles most requests

## Scaling Recommendations

### For 100-300 Concurrent Students (Current Target)

**✅ Current configuration supports this** with 100 connection pool:

1. **Database Pool**: Already set to 100 connections ✅

2. **Add Global Rate Limiting** (optional):
   ```typescript
   // Global limit: 1000 requests/minute across all users
   global: rateLimiter.createLimiter(1000, 60 * 1000)
   ```

3. **Increase Cache Size**:
   ```typescript
   maxSize: 2000  // Increase from 1000
   ```

### For 500-1000 Concurrent Students

**Required Changes:**

1. **Database Pool**: Increase to 50-100 connections
2. **Add Load Balancer**: Distribute requests across multiple server instances
3. **Database Scaling**: Consider read replicas for read-heavy operations
4. **Cache Layer**: Consider Redis for distributed caching
5. **Schedule Generation**: Move to background jobs/queue system

### For 1000+ Concurrent Students

**Required Architecture:**

1. **Horizontal Scaling**: Multiple server instances behind load balancer
2. **Database**: Read replicas + connection pooling (PgBouncer)
3. **Caching**: Redis cluster for distributed caching
4. **Queue System**: Background job queue for schedule generation (Bull/BullMQ)
5. **CDN**: For static assets
6. **Monitoring**: APM tools to identify bottlenecks

## Performance Characteristics

### Typical Request Patterns

**Light Usage (Browsing):**
- View timetable: ~50-100ms (cached)
- View courses: ~50-100ms (cached)
- **Database impact**: Low (mostly cache hits)

**Medium Usage (Selecting Preferences):**
- Load courses: ~100-200ms (may hit DB)
- Load instructors: ~100-300ms (may hit DB)
- **Database impact**: Medium

**Heavy Usage (Generating Schedules):**
- Generate schedules: ~5-30 seconds (CPU-intensive)
- **Database impact**: High (multiple queries)
- **CPU impact**: Very High

### Request Distribution (Typical)
- **80%**: Light requests (cached) - ~50ms response time
- **15%**: Medium requests - ~200ms response time  
- **5%**: Heavy requests (schedule generation) - ~10s response time

## Monitoring Recommendations

### Key Metrics to Track

1. **Database Connection Pool**
   - Active connections
   - Idle connections
   - Connection wait time
   - Connection errors

2. **Response Times**
   - P50, P95, P99 response times
   - Endpoint-specific metrics

3. **Cache Hit Rate**
   - Should be >70% for optimal performance

4. **Schedule Generation**
   - Average generation time
   - Concurrent generations
   - Queue length (if using queue)

5. **Error Rates**
   - 503 errors (database unavailable)
   - 429 errors (rate limit exceeded)
   - 500 errors (server errors)

## Current Capacity Summary

| Metric | Current Value | Capacity |
|--------|--------------|----------|
| **Database Connections** | 100 | ~200-500 concurrent users (with caching) |
| **Rate Limit (per user)** | 100 req/min | No global bottleneck |
| **Cache Size** | 1,000 entries | Handles ~80% of requests |
| **Schedule Generation** | 10/min per user | ~10-20 concurrent generations |
| **Overall Capacity** | - | **200-500 concurrent students** |

## Recommendations for Production

1. **Monitor database connection pool usage**
2. **Set up alerts** for:
   - Connection pool exhaustion (>80% usage)
   - High error rates (>1%)
   - Slow response times (P95 > 2s)
3. **Pool size is set to 100** - supports high concurrent load ✅
4. **Add global rate limiting** if you expect sudden traffic spikes
5. **Implement queue system** for schedule generation if >200 concurrent users expected
