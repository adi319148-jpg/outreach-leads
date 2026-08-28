export class RateLimiter {
  private timestamps: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 30, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public async acquire(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldest) + 50;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.acquire();
    }

    this.timestamps.push(Date.now());
  }
}

export const placesRateLimiter = new RateLimiter(20, 60000); // 20 req/min
export const youtubeRateLimiter = new RateLimiter(30, 60000); // 30 req/min
export const aiRateLimiter = new RateLimiter(15, 60000); // 15 req/min
