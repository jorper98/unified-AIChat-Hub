// src/lib/rate-limit.ts

// Simple in-memory rate limiter for self-hosted applications.
// Limitations: Resets on server restart, not suitable for distributed multi-instance deployments (requires Redis).

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number, 
  windowMs: number
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimits.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimits.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { success: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { success: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown-ip';
}
