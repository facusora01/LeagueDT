"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    queue = [];
    isProcessing = false;
    // Riot API Development limits
    // 20 requests every 1 seconds
    // 100 requests every 2 minutes (120 seconds)
    shortTermBucket = 20;
    shortTermIntervalMs = 1000;
    longTermBucket = 100;
    longTermIntervalMs = 120 * 1000;
    currentShortTermTokens = 20;
    currentLongTermTokens = 100;
    constructor() {
        this.startRefilling();
    }
    startRefilling() {
        setInterval(() => {
            this.currentShortTermTokens = this.shortTermBucket;
            this.processQueue();
        }, this.shortTermIntervalMs);
        setInterval(() => {
            this.currentLongTermTokens = this.longTermBucket;
            this.processQueue();
        }, this.longTermIntervalMs);
    }
    async execute(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                execute: fn,
                resolve,
                reject
            });
            this.processQueue();
        });
    }
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0)
            return;
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
                }
                catch (error) {
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
                    }
                    else {
                        item.reject(error);
                    }
                }
            }
        }
        this.isProcessing = false;
    }
}
exports.RateLimiter = RateLimiter;
