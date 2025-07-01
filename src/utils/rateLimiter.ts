
// Client-side rate limiting utility
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get existing requests for this key
    const keyRequests = this.requests.get(key) || [];
    
    // Filter out requests outside the window
    const validRequests = keyRequests.filter(time => time > windowStart);
    
    // Check if we've exceeded the limit
    if (validRequests.length >= config.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  getRemainingRequests(key: string, config: RateLimitConfig): number {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const keyRequests = this.requests.get(key) || [];
    const validRequests = keyRequests.filter(time => time > windowStart);
    
    return Math.max(0, config.maxRequests - validRequests.length);
  }

  getResetTime(key: string, config: RateLimitConfig): number {
    const keyRequests = this.requests.get(key) || [];
    if (keyRequests.length === 0) return 0;
    
    const oldestRequest = Math.min(...keyRequests);
    return oldestRequest + config.windowMs;
  }
}

export const rateLimiter = new RateLimiter();

// Rate limit configurations
export const RATE_LIMITS = {
  API_CALLS: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
  AUTH_ATTEMPTS: { maxRequests: 5, windowMs: 300000 }, // 5 attempts per 5 minutes
  PAYMENT_ATTEMPTS: { maxRequests: 3, windowMs: 600000 }, // 3 attempts per 10 minutes
  FORM_SUBMISSIONS: { maxRequests: 10, windowMs: 60000 }, // 10 submissions per minute
};
