# Database Pool Size: 100 Connections

## ✅ Changes Made

- **Maximum Connections**: Increased from 20 to 100
- **Minimum Idle**: Increased from 2 to 10 (proportionally)
- **Updated Capacity**: Now supports 200-500 concurrent students (with caching)

## ⚠️ Important Considerations

### 1. Database Provider Limits

**Check your database provider's connection limits:**

- **Neon Free Tier**: 100 connections max ✅ (matches our setting)
- **Neon Pro Tier**: 500+ connections ✅
- **Supabase Free**: 60 connections max ⚠️ (reduce to 60 if using Supabase Free)
- **Supabase Pro**: 200+ connections ✅
- **AWS RDS**: Depends on instance type (check your instance limits)
- **Self-hosted PostgreSQL**: Default is 100, can be increased in `postgresql.conf`

### 2. Memory Usage

Each connection uses memory:
- **Per connection**: ~2-5MB (depends on PostgreSQL version)
- **100 connections**: ~200-500MB total
- **Server RAM**: Ensure you have at least 1-2GB free for connections

### 3. Database Server Load

- More connections = more load on database server
- Monitor database CPU and memory usage
- Consider read replicas if database becomes a bottleneck

### 4. Connection Lifecycle

- Connections are created on-demand (up to max: 100)
- Idle connections are closed after 30 seconds
- Keep-alive prevents premature connection termination

## 📊 Expected Capacity

With 100 connections:
- **Without caching**: ~50-100 concurrent active database users
- **With caching (70% hit rate)**: ~200-500 concurrent students
- **Peak capacity**: Can handle traffic spikes better

## 🔍 Monitoring

Watch for these indicators:

1. **Connection Pool Exhaustion**
   - Logs showing "connection timeout" errors
   - High wait times for connections
   - **Solution**: Increase max or optimize queries

2. **Database Provider Limits**
   - Errors: "too many connections"
   - **Solution**: Reduce max to match provider limit

3. **Memory Usage**
   - High memory consumption
   - **Solution**: Reduce max or increase server RAM

## 🚀 Performance Impact

**Benefits:**
- ✅ Handles more concurrent users
- ✅ Better performance under load
- ✅ Reduced connection wait times

**Potential Issues:**
- ⚠️ Higher memory usage
- ⚠️ More load on database server
- ⚠️ May hit provider connection limits

## 💡 Recommendations

1. **Start with 100** and monitor
2. **Reduce if you hit provider limits** (e.g., Supabase Free → 60)
3. **Monitor connection pool usage** - if consistently <50% usage, can reduce
4. **Use caching** to reduce database load (already implemented)
5. **Consider read replicas** if database becomes bottleneck

## 🔧 Adjusting Pool Size

To change the pool size, edit `backend/src/config/data-source.ts`:

```typescript
extra: {
  max: 100,  // Change this value
  min: 10,   // Usually 10% of max
  // ... other settings
}
```

**Common Values:**
- **Small deployment**: 20-30 connections
- **Medium deployment**: 50-100 connections ✅ (current)
- **Large deployment**: 100-200 connections (with read replicas)
