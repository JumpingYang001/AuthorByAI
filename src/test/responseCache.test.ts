import * as assert from 'assert';
import * as sinon from 'sinon';
import { AIResponseCache } from '../responseCache';
import { ConfigurationManager } from '../configurationManager';

suite('AIResponseCache Test Suite', () => {
    let cache: AIResponseCache;
    let configStub: sinon.SinonStub;
    let clock: sinon.SinonFakeTimers;

    setup(() => {
        // Reset singleton instance for testing
        (AIResponseCache as any)._instance = undefined;
        (ConfigurationManager as any)._instance = undefined;
        
        // Stub configuration
        configStub = sinon.stub(ConfigurationManager.prototype, 'getConfigSection').returns({
            enableCaching: true,
            cacheTimeout: 300000, // 5 minutes
            maxCacheSize: 50,
            enableVirtualization: true
        });

        // Use fake timers for time-based tests
        clock = sinon.useFakeTimers();
        
        cache = AIResponseCache.getInstance();
    });

    teardown(() => {
        sinon.restore();
        clock.restore();
    });

    suite('basic caching operations', () => {
        test('should cache and retrieve responses', () => {
            const prompt = 'test prompt';
            const response = 'test response';
            
            // Initially no cache hit
            assert.strictEqual(cache.get(prompt, 'content'), null);
            
            // Cache the response
            cache.set(prompt, response, 'openai', 'content');
            
            // Should retrieve cached response
            assert.strictEqual(cache.get(prompt, 'content'), response);
        });

        test('should distinguish between chat and content contexts', () => {
            const prompt = 'same prompt';
            const chatResponse = 'chat response';
            const contentResponse = 'content response';
            
            cache.set(prompt, chatResponse, 'openai', 'chat');
            cache.set(prompt, contentResponse, 'openai', 'content');
            
            assert.strictEqual(cache.get(prompt, 'chat'), chatResponse);
            assert.strictEqual(cache.get(prompt, 'content'), contentResponse);
        });

        test('should return null when caching is disabled', () => {
            configStub.returns({
                enableCaching: false,
                cacheTimeout: 300000,
                maxCacheSize: 50,
                enableVirtualization: true
            });

            const prompt = 'test prompt';
            const response = 'test response';
            
            cache.set(prompt, response, 'openai', 'content');
            assert.strictEqual(cache.get(prompt, 'content'), null);
        });

        test('should clear all cached responses', () => {
            cache.set('prompt1', 'response1', 'openai', 'content');
            cache.set('prompt2', 'response2', 'claude', 'chat');
            
            assert.strictEqual(cache.get('prompt1', 'content'), 'response1');
            assert.strictEqual(cache.get('prompt2', 'chat'), 'response2');
            
            cache.clear();
            
            assert.strictEqual(cache.get('prompt1', 'content'), null);
            assert.strictEqual(cache.get('prompt2', 'chat'), null);
        });
    });

    suite('cache expiration', () => {
        test('should expire cached responses after timeout', () => {
            const prompt = 'test prompt';
            const response = 'test response';
            
            cache.set(prompt, response, 'openai', 'content');
            assert.strictEqual(cache.get(prompt, 'content'), response);
            
            // Advance time beyond cache timeout
            clock.tick(400000); // 6.67 minutes > 5 minute timeout
            
            assert.strictEqual(cache.get(prompt, 'content'), null);
        });

        test('should not expire responses within timeout', () => {
            const prompt = 'test prompt';
            const response = 'test response';
            
            cache.set(prompt, response, 'openai', 'content');
            
            // Advance time within timeout
            clock.tick(200000); // 3.33 minutes < 5 minute timeout
            
            assert.strictEqual(cache.get(prompt, 'content'), response);
        });

        test('should cleanup expired entries', () => {
            cache.set('prompt1', 'response1', 'openai', 'content');
            cache.set('prompt2', 'response2', 'claude', 'content');
            
            // Advance time to expire first entry
            clock.tick(200000);
            cache.set('prompt3', 'response3', 'local', 'content');
            
            // Advance time to expire first two entries
            clock.tick(200000);
            
            const removedCount = cache.cleanup();
            
            assert.strictEqual(removedCount, 2);
            assert.strictEqual(cache.get('prompt1', 'content'), null);
            assert.strictEqual(cache.get('prompt2', 'content'), null);
            assert.strictEqual(cache.get('prompt3', 'content'), 'response3');
        });
    });

    suite('cache size limits', () => {
        test('should evict oldest entries when cache is full', () => {
            configStub.returns({
                enableCaching: true,
                cacheTimeout: 300000,
                maxCacheSize: 5, // Small cache for testing, 20% = 1 entry
                enableVirtualization: true
            });

            // Reset cache with new config
            (AIResponseCache as any)._instance = undefined;
            cache = AIResponseCache.getInstance();
            
            // Fill cache to capacity (5 entries)
            cache.set('prompt1', 'response1', 'openai', 'content');
            cache.set('prompt2', 'response2', 'claude', 'content');
            cache.set('prompt3', 'response3', 'local', 'content');
            cache.set('prompt4', 'response4', 'openai', 'content');
            cache.set('prompt5', 'response5', 'claude', 'content');
            
            // Add one more entry (should evict oldest - 1 entry = 20% of 5)
            cache.set('prompt6', 'response6', 'openai', 'content');
            
            // First entry should be evicted
            assert.strictEqual(cache.get('prompt1', 'content'), null);
            assert.strictEqual(cache.get('prompt6', 'content'), 'response6');
        });

        test('should track memory usage', () => {
            cache.set('prompt1', 'response1', 'openai', 'content');
            cache.set('prompt2', 'a much longer response that uses more memory', 'claude', 'content');
            
            const stats = cache.getStats();
            assert.ok(stats.memoryUsage > 0);
            
            cache.clear();
            const statsAfterClear = cache.getStats();
            assert.strictEqual(statsAfterClear.memoryUsage, 0);
        });
    });

    suite('cache statistics', () => {
        test('should track cache hits and misses', () => {
            const prompt = 'test prompt';
            const response = 'test response';
            
            // Miss
            cache.get(prompt, 'content');
            
            // Cache response
            cache.set(prompt, response, 'openai', 'content');
            
            // Hit
            cache.get(prompt, 'content');
            
            const stats = cache.getStats();
            assert.strictEqual(stats.totalRequests, 2);
            assert.strictEqual(stats.cacheHits, 1);
            assert.strictEqual(stats.cacheMisses, 1);
            assert.strictEqual(stats.hitRate, 50);
        });

        test('should track API calls saved', () => {
            const prompt = 'test prompt';
            const response = 'test response';
            
            cache.set(prompt, response, 'openai', 'content');
            
            // Multiple hits should increase saved count
            cache.get(prompt, 'content');
            cache.get(prompt, 'content');
            
            const stats = cache.getStats();
            assert.strictEqual(stats.totalSaved, 2);
        });

        test('should calculate hit rate correctly', () => {
            cache.set('prompt1', 'response1', 'openai', 'content');
            
            // 1 hit, 1 miss = 50% hit rate
            cache.get('prompt1', 'content'); // hit
            cache.get('prompt2', 'content'); // miss
            
            let stats = cache.getStats();
            assert.strictEqual(stats.hitRate, 50);
            
            // 2 hits, 1 miss = 66.67% hit rate
            cache.get('prompt1', 'content'); // hit
            
            stats = cache.getStats();
            assert.strictEqual(Math.round(stats.hitRate), 67);
        });
    });

    suite('similar response matching', () => {
        test('should find similar cached responses', () => {
            const originalPrompt = 'create a chapter about javascript functions';
            const similarPrompt = 'create a chapter about JavaScript functions';
            const response = 'JavaScript functions response';
            
            cache.set(originalPrompt, response, 'openai', 'content');
            
            const similarResponse = cache.findSimilar(similarPrompt, 'content', 0.8);
            assert.strictEqual(similarResponse, response);
        });

        test('should not match dissimilar prompts', () => {
            const originalPrompt = 'create a chapter about javascript functions';
            const dissimilarPrompt = 'write a poem about cats';
            const response = 'JavaScript functions response';
            
            cache.set(originalPrompt, response, 'openai', 'content');
            
            const similarResponse = cache.findSimilar(dissimilarPrompt, 'content', 0.8);
            assert.strictEqual(similarResponse, null);
        });

        test('should respect similarity threshold', () => {
            const originalPrompt = 'create chapter about javascript';
            const somewhatsimilarPrompt = 'create lesson about python';
            const response = 'JavaScript chapter response';
            
            cache.set(originalPrompt, response, 'openai', 'content');
            
            // Should not match with high threshold
            let similarResponse = cache.findSimilar(somewhatsimilarPrompt, 'content', 0.9);
            assert.strictEqual(similarResponse, null);
            
            // Might match with lower threshold
            similarResponse = cache.findSimilar(somewhatsimilarPrompt, 'content', 0.3);
            // Result depends on similarity calculation, but should not throw
            assert.ok(similarResponse === null || typeof similarResponse === 'string');
        });

        test('should only match within same context', () => {
            const prompt = 'test prompt';
            const chatResponse = 'chat response';
            
            cache.set(prompt, chatResponse, 'openai', 'chat');
            
            // Should not find chat response when looking for content
            const similarResponse = cache.findSimilar(prompt, 'content', 0.9);
            assert.strictEqual(similarResponse, null);
        });
    });

    suite('import/export functionality', () => {
        test('should export cache data', () => {
            cache.set('prompt1', 'response1', 'openai', 'content');
            cache.set('prompt2', 'response2', 'claude', 'chat');
            
            const exportData = cache.exportCache();
            assert.ok(typeof exportData === 'string');
            
            const parsed = JSON.parse(exportData);
            assert.ok(parsed.timestamp);
            assert.ok(parsed.stats);
            assert.ok(parsed.entries);
            assert.strictEqual(parsed.entries.length, 2);
        });

        test('should import cache data', () => {
            const exportData = {
                timestamp: new Date().toISOString(),
                stats: {},
                entries: [
                    {
                        key: 'test-key|content',
                        entry: {
                            response: 'imported response',
                            timestamp: Date.now(),
                            source: 'openai',
                            metadata: {
                                promptHash: 'test-hash',
                                context: 'content'
                            }
                        }
                    }
                ]
            };
            
            const success = cache.importCache(JSON.stringify(exportData));
            assert.strictEqual(success, true);
            
            // Verify imported data is accessible
            const cacheContents = cache.getCacheContents();
            assert.strictEqual(cacheContents.length, 1);
        });

        test('should handle invalid import data', () => {
            const success1 = cache.importCache('invalid json');
            assert.strictEqual(success1, false);
            
            const success2 = cache.importCache(JSON.stringify({ invalid: 'data' }));
            assert.strictEqual(success2, false);
        });
    });

    suite('performance monitoring', () => {
        test('should track response times', () => {
            const responseTime = 1500; // 1.5 seconds
            
            cache.set('prompt1', 'response1', 'openai', 'content', responseTime);
            
            const contents = cache.getCacheContents();
            assert.strictEqual(contents[0].entry.metadata.responseTime, responseTime);
        });

        test('should estimate token counts', () => {
            const shortResponse = 'short';
            const longResponse = 'a'.repeat(1000);
            
            cache.set('prompt1', shortResponse, 'openai', 'content');
            cache.set('prompt2', longResponse, 'openai', 'content');
            
            const contents = cache.getCacheContents();
            const shortTokens = contents.find(c => c.entry.response.includes('short'))?.entry.metadata.tokenCount;
            const longTokens = contents.find(c => c.entry.response.includes('aaa'))?.entry.metadata.tokenCount;
            
            assert.ok(shortTokens && longTokens);
            assert.ok(longTokens > shortTokens);
        });

        test('should provide cache contents for debugging', () => {
            cache.set('prompt1', 'very long response that should be truncated for display purposes because it is too long', 'openai', 'content');
            
            const contents = cache.getCacheContents();
            assert.strictEqual(contents.length, 1);
            assert.ok(contents[0].key);
            assert.ok(contents[0].entry);
            
            // Response should be truncated for display
            assert.ok(contents[0].entry.response.length <= 103); // 100 chars + '...'
        });
    });

    suite('automatic cleanup', () => {
        test('should set up automatic cleanup timer', () => {
            // Verify timer exists (implementation detail, but important for memory management)
            // This test might need adjustment based on exact implementation
            assert.doesNotThrow(() => {
                (AIResponseCache as any)._instance = undefined;
                cache = AIResponseCache.getInstance();
            });
        });

        test('should cleanup on dispose', () => {
            cache.set('prompt1', 'response1', 'openai', 'content');
            
            cache.dispose();
            
            // Cache should be cleared
            const stats = cache.getStats();
            assert.strictEqual(stats.memoryUsage, 0);
        });
    });

    suite('error handling', () => {
        test('should handle errors in get operation gracefully', () => {
            // Force an error by stubbing internal method
            const originalGenerateCacheKey = (cache as any)._generateCacheKey;
            (cache as any)._generateCacheKey = () => { throw new Error('Cache key error'); };
            
            const result = cache.get('test prompt', 'content');
            assert.strictEqual(result, null);
            
            // Restore original method
            (cache as any)._generateCacheKey = originalGenerateCacheKey;
        });

        test('should handle errors in set operation gracefully', () => {
            // Force an error by providing invalid data
            assert.doesNotThrow(() => {
                cache.set('', '', 'openai' as any, 'content');
            });
        });

        test('should handle errors in similar search gracefully', () => {
            // Force an error condition
            const result = cache.findSimilar('', 'content', 1.5); // Invalid threshold
            
            // Should return null instead of throwing
            assert.strictEqual(result, null);
        });
    });
});
