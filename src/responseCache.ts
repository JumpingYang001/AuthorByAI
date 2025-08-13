import { ConfigurationManager } from './configurationManager';
import { ErrorHandler } from './errorHandler';

/**
 * Cache entry interface
 */
interface CacheEntry {
    response: string;
    timestamp: number;
    source: 'openai' | 'claude' | 'local' | 'template' | 'fallback';
    metadata: {
        promptHash: string;
        context: 'chat' | 'content';
        tokenCount?: number;
        responseTime?: number;
    };
}

/**
 * Cache statistics interface
 */
interface CacheStats {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    totalSaved: number; // Estimated API calls saved
    memoryUsage: number; // Approximate memory usage in bytes
    lastCleanup: number;
}

/**
 * AI Response Cache for improving performance and reducing API costs
 */
export class AIResponseCache {
    private static _instance: AIResponseCache;
    private cache = new Map<string, CacheEntry>();
    private configManager: ConfigurationManager;
    private stats: CacheStats = {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        totalSaved: 0,
        memoryUsage: 0,
        lastCleanup: Date.now()
    };

    private constructor() {
        this.configManager = ConfigurationManager.getInstance();
        this._startCleanupTimer();
    }

    public static getInstance(): AIResponseCache {
        if (!AIResponseCache._instance) {
            AIResponseCache._instance = new AIResponseCache();
        }
        return AIResponseCache._instance;
    }

    /**
     * Get cached response for a prompt
     */
    public get(prompt: string, context: 'chat' | 'content' = 'content'): string | null {
        const config = this.configManager.getConfigSection('performance');
        
        // Check if caching is enabled
        if (!config.enableCaching) {
            return null;
        }

        this.stats.totalRequests++;
        
        try {
            const cacheKey = this._generateCacheKey(prompt, context);
            const entry = this.cache.get(cacheKey);
            
            if (entry && this._isValidEntry(entry, config.cacheTimeout)) {
                this.stats.cacheHits++;
                this.stats.totalSaved++;
                this._updateHitRate();
                
                console.log(`Cache HIT for prompt: ${prompt.substring(0, 50)}...`);
                return entry.response;
            }
            
            // Remove expired entry if it exists
            if (entry && !this._isValidEntry(entry, config.cacheTimeout)) {
                this.cache.delete(cacheKey);
                console.log(`Removed expired cache entry for: ${prompt.substring(0, 50)}...`);
            }
            
            this.stats.cacheMisses++;
            this._updateHitRate();
            
            console.log(`Cache MISS for prompt: ${prompt.substring(0, 50)}...`);
            return null;
        } catch (error) {
            console.error('Error getting from cache:', error);
            return null;
        }
    }

    /**
     * Store response in cache
     */
    public set(
        prompt: string, 
        response: string, 
        source: CacheEntry['source'], 
        context: 'chat' | 'content' = 'content',
        responseTime?: number
    ): void {
        const config = this.configManager.getConfigSection('performance');
        
        // Check if caching is enabled
        if (!config.enableCaching) {
            return;
        }

        try {
            // Check cache size limit
            if (this.cache.size >= config.maxCacheSize) {
                this._evictOldestEntries(Math.floor(config.maxCacheSize * 0.2)); // Remove 20% of oldest entries
            }

            const cacheKey = this._generateCacheKey(prompt, context);
            const entry: CacheEntry = {
                response,
                timestamp: Date.now(),
                source,
                metadata: {
                    promptHash: this._hashString(prompt),
                    context,
                    tokenCount: this._estimateTokenCount(response),
                    responseTime
                }
            };

            this.cache.set(cacheKey, entry);
            this._updateMemoryUsage();
            
            console.log(`Cached response from ${source} for prompt: ${prompt.substring(0, 50)}...`);
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'responseCache.set');
            console.error('Failed to cache response:', extensionError.message);
        }
    }

    /**
     * Clear all cached responses
     */
    public clear(): void {
        this.cache.clear();
        this.stats.memoryUsage = 0;
        console.log('Response cache cleared');
    }

    /**
     * Remove expired entries
     */
    public cleanup(): number {
        const config = this.configManager.getConfigSection('performance');
        const cutoffTime = Date.now() - config.cacheTimeout;
        let removedCount = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < cutoffTime) {
                this.cache.delete(key);
                removedCount++;
            }
        }

        this.stats.lastCleanup = Date.now();
        this._updateMemoryUsage();
        
        if (removedCount > 0) {
            console.log(`Cache cleanup: removed ${removedCount} expired entries`);
        }
        
        return removedCount;
    }

    /**
     * Get cache statistics
     */
    public getStats(): CacheStats {
        this._updateMemoryUsage();
        return { ...this.stats };
    }

    /**
     * Get cache contents for debugging
     */
    public getCacheContents(): Array<{key: string, entry: CacheEntry}> {
        return Array.from(this.cache.entries()).map(([key, entry]) => ({
            key,
            entry: {
                ...entry,
                response: entry.response.substring(0, 100) + '...' // Truncate for display
            }
        }));
    }

    /**
     * Check if cache entry has a similar prompt (fuzzy matching)
     */
    public findSimilar(prompt: string, context: 'chat' | 'content' = 'content', threshold: number = 0.8): string | null {
        const config = this.configManager.getConfigSection('performance');
        
        if (!config.enableCaching) {
            return null;
        }

        try {
            const promptWords = this._tokenizePrompt(prompt.toLowerCase());
            let bestMatch: CacheEntry | null = null;
            let bestSimilarity = 0;

            for (const [key, entry] of this.cache.entries()) {
                if (entry.metadata.context !== context) {
                    continue;
                }

                if (!this._isValidEntry(entry, config.cacheTimeout)) {
                    continue;
                }

                // Extract original prompt from cache key (simplified)
                const cachedPrompt = key.split('|')[0];
                const cachedWords = this._tokenizePrompt(cachedPrompt.toLowerCase());
                
                const similarity = this._calculateSimilarity(promptWords, cachedWords);
                
                if (similarity > bestSimilarity && similarity >= threshold) {
                    bestSimilarity = similarity;
                    bestMatch = entry;
                }
            }

            if (bestMatch) {
                console.log(`Found similar cached response with ${(bestSimilarity * 100).toFixed(1)}% similarity`);
                this.stats.cacheHits++;
                this.stats.totalSaved++;
                this._updateHitRate();
                return bestMatch.response;
            }

            return null;
        } catch (error) {
            console.error('Error finding similar cache entry:', error);
            return null;
        }
    }

    /**
     * Preemptively warm the cache with common responses
     */
    public warmCache(commonPrompts: Array<{prompt: string, context: 'chat' | 'content'}>): void {
        console.log(`Warming cache with ${commonPrompts.length} common prompts`);
        // This would be called with frequently used prompts
        // Implementation would depend on having a list of common prompts
    }

    /**
     * Export cache data for backup
     */
    public exportCache(): string {
        const exportData = {
            timestamp: new Date().toISOString(),
            stats: this.stats,
            entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
                key,
                entry
            }))
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import cache data from backup
     */
    public importCache(data: string): boolean {
        try {
            const importData = JSON.parse(data);
            
            if (!importData.entries || !Array.isArray(importData.entries)) {
                throw new Error('Invalid cache data format');
            }

            this.clear();
            
            for (const { key, entry } of importData.entries) {
                this.cache.set(key, entry);
            }

            this._updateMemoryUsage();
            console.log(`Imported ${importData.entries.length} cache entries`);
            return true;
        } catch (error) {
            console.error('Failed to import cache data:', error);
            return false;
        }
    }

    /**
     * Generate a cache key for a prompt and context
     */
    private _generateCacheKey(prompt: string, context: 'chat' | 'content'): string {
        // Normalize the prompt for consistent caching
        const normalizedPrompt = prompt.trim().toLowerCase();
        const hash = this._hashString(normalizedPrompt);
        return `${hash}|${context}`;
    }

    /**
     * Check if a cache entry is still valid
     */
    private _isValidEntry(entry: CacheEntry, cacheTimeout: number): boolean {
        return (Date.now() - entry.timestamp) < cacheTimeout;
    }

    /**
     * Simple hash function for strings
     */
    private _hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Estimate token count for response
     */
    private _estimateTokenCount(text: string): number {
        // Rough estimation: 1 token ≈ 4 characters for English text
        return Math.ceil(text.length / 4);
    }

    /**
     * Update memory usage statistics
     */
    private _updateMemoryUsage(): void {
        let totalSize = 0;
        for (const [key, entry] of this.cache.entries()) {
            totalSize += key.length + entry.response.length + 100; // Approximate overhead
        }
        this.stats.memoryUsage = totalSize;
    }

    /**
     * Update hit rate statistics
     */
    private _updateHitRate(): void {
        this.stats.hitRate = this.stats.totalRequests > 0 
            ? (this.stats.cacheHits / this.stats.totalRequests) * 100 
            : 0;
    }

    /**
     * Evict oldest cache entries when limit is reached
     */
    private _evictOldestEntries(count: number): void {
        const entries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => a.timestamp - b.timestamp);
        
        for (let i = 0; i < Math.min(count, entries.length); i++) {
            this.cache.delete(entries[i][0]);
        }
        
        console.log(`Evicted ${Math.min(count, entries.length)} oldest cache entries`);
    }

    /**
     * Tokenize prompt for similarity comparison
     */
    private _tokenizePrompt(prompt: string): string[] {
        return prompt
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    /**
     * Calculate similarity between two token arrays
     */
    private _calculateSimilarity(tokens1: string[], tokens2: string[]): number {
        const set1 = new Set(tokens1);
        const set2 = new Set(tokens2);
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * Start automatic cleanup timer
     */
    private _startCleanupTimer(): void {
        // Clean up every 5 minutes
        setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this.clear();
    }
}
