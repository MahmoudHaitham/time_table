/**
 * Simple in-memory cache for timetable data
 * Optimized for high concurrency (100-300 users)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number = 1000; // Maximum cache entries
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Delete cached data
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Export singleton instance
export const cache = new MemoryCache();

/**
 * Cache key generators
 */
export const cacheKeys = {
  termTimetable: (termId: number) => `timetable:term:${termId}`,
  classTimetable: (classId: number) => `timetable:class:${classId}`,
  publishedTerms: () => `timetable:terms:published`,
  coreCourses: (termId: number) => `courses:core:term:${termId}`,
  electiveCourses: (termId: number) => `courses:elective:term:${termId}`,
  schedule: (termId: number, excludedDays: string, electiveIds: string, excludedCoreIds: string = "none") => 
    `schedule:term:${termId}:excluded:${excludedDays}:electives:${electiveIds}:excludedCore:${excludedCoreIds}`,
};

/**
 * Cache TTL constants (in milliseconds)
 */
export const CACHE_TTL = {
  TERM_TIMETABLE: 10 * 60 * 1000, // 10 minutes - timetable data changes infrequently
  CLASS_TIMETABLE: 10 * 60 * 1000, // 10 minutes
  PUBLISHED_TERMS: 5 * 60 * 1000, // 5 minutes
  COURSES: 10 * 60 * 1000, // 10 minutes
  SCHEDULES: 30 * 60 * 1000, // 30 minutes - generated schedules can be cached longer
};
