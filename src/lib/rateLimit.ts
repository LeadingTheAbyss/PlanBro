import { redis } from './redis';

export async function checkRateLimit(ip: string, limit: number = 5, windowInSeconds: number = 3600): Promise<{ success: boolean; current: number; limit: number; remaining: number }> {
  const windowKey = `ratelimit:${ip}`;
  
  try {
    const current = await redis.incr(windowKey);
    if (current === 1) {
      await redis.expire(windowKey, windowInSeconds);
    }
    
    return {
      success: current <= limit,
      current,
      limit,
      remaining: Math.max(0, limit - current)
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open if Redis is down
    return { success: true, current: 0, limit, remaining: limit };
  }
}
