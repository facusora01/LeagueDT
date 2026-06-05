"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiCache = void 0;
class ApiCache {
    store = new Map();
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }
    set(key, value, ttlMs) {
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    }
    has(key) {
        return this.get(key) !== null;
    }
    invalidate(key) {
        this.store.delete(key);
    }
    invalidatePrefix(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix))
                this.store.delete(key);
        }
    }
    clear() {
        this.store.clear();
    }
}
exports.ApiCache = ApiCache;
