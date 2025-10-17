// ============================================
// 4. RATE LIMITING (lib/rate-limit.ts)
// ============================================
interface RateLimitConfig {
  interval: number; // milliseconds
  uniqueTokenPerInterval: number;
}

class RateLimiter {
  private cache: Map<string, number[]>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.cache = new Map();
    this.config = config;
  }

  check(identifier: string, limit: number): { success: boolean; remaining: number } {
    const now = Date.now();
    const tokenKey = identifier;
    
    // Get existing requests
    const requests = this.cache.get(tokenKey) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(
      timestamp => now - timestamp < this.config.interval
    );

    if (validRequests.length >= limit) {
      return {
        success: false,
        remaining: 0
      };
    }

    // Add current request
    validRequests.push(now);
    this.cache.set(tokenKey, validRequests);

    return {
      success: true,
      remaining: limit - validRequests.length
    };
  }

  reset(identifier: string): void {
    this.cache.delete(identifier);
  }
}

export const apiRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500
});
