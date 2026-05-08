type QueueItem = {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

export class RateLimiter {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  
  // Riot API Development limits
  // 20 requests every 1 seconds
  // 100 requests every 2 minutes (120 seconds)
  private shortTermBucket = 20;
  private shortTermIntervalMs = 1000;
  
  private longTermBucket = 100;
  private longTermIntervalMs = 120 * 1000;

  private currentShortTermTokens = 20;
  private currentLongTermTokens = 100;

  constructor() {
    this.startRefilling();
  }

  private startRefilling() {
    setInterval(() => {
      this.currentShortTermTokens = this.shortTermBucket;
      this.processQueue();
    }, this.shortTermIntervalMs);

    setInterval(() => {
      this.currentLongTermTokens = this.longTermBucket;
      this.processQueue();
    }, this.longTermIntervalMs);
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: fn,
        resolve,
        reject
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    if (this.currentShortTermTokens <= 0 || this.currentLongTermTokens <= 0) {
      return; // Must wait for next interval refill
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.currentShortTermTokens > 0 && this.currentLongTermTokens > 0) {
      const item = this.queue.shift();
      if (item) {
        this.currentShortTermTokens--;
        this.currentLongTermTokens--;

        try {
          // Execute asynchronously but await before starting next to respect rate limits sequentially if needed
          // Or execute in parallel if tokens allow. Here we do sequential to be safer.
          const result = await item.execute();
          item.resolve(result);
        } catch (error: any) {
          // Handle 429 Too Many Requests locally
          if (error.response && error.response.status === 429) {
            // Put it back in front of the queue
            this.queue.unshift(item);
            
            // Extract Retry-After header if present
            const retryAfter = error.response.headers['retry-after'];
            if (retryAfter) {
              const secondsToWait = parseInt(retryAfter, 10);
              // In a real scenario, we'd pause the queue for `secondsToWait`
              this.currentShortTermTokens = 0; // Force wait
            }
            break;
          } else {
            item.reject(error);
          }
        }
      }
    }

    this.isProcessing = false;
  }
}
