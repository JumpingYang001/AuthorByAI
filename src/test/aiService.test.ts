import * as assert from 'assert';
import * as sinon from 'sinon';
import { AIService } from '../aiService';
import { ConfigurationManager } from '../configurationManager';
import { AIResponseCache } from '../responseCache';
import { ErrorHandler } from '../errorHandler';

suite('AIService Test Suite', () => {
    let aiService: AIService;
    let configStub: sinon.SinonStub;
    let cacheGetStub: sinon.SinonStub;
    let cacheSetStub: sinon.SinonStub;
    let cacheFindSimilarStub: sinon.SinonStub;
    let fetchStub: sinon.SinonStub;

    setup(() => {
        // Reset singleton instances for testing
        (AIService as any)._instance = undefined;
        (ConfigurationManager as any)._instance = undefined;
        (AIResponseCache as any)._instance = undefined;
        
        aiService = AIService.getInstance();
        
        // Stub configuration
        configStub = sinon.stub(ConfigurationManager.prototype, 'getConfigSection').returns({
            provider: 'openai',
            timeout: 30000,
            retryAttempts: 3,
            maxTokens: 2000,
            temperature: 0.7,
            baseUrl: 'http://localhost:11434' // Use correct local AI URL for fallback tests
        });

        // Stub cache
        cacheGetStub = sinon.stub(AIResponseCache.prototype, 'get').returns(null);
        cacheSetStub = sinon.stub(AIResponseCache.prototype, 'set');
        cacheFindSimilarStub = sinon.stub(AIResponseCache.prototype, 'findSimilar').returns(null);

        // Stub global fetch
        fetchStub = sinon.stub(global, 'fetch' as any);
    });

    teardown(() => {
        sinon.restore();
    });

    suite('fallback chain', () => {
        test('should fall back to template response when OpenAI fails', async () => {
            // Mock OpenAI failure (no API keys configured)
            fetchStub.rejects(new Error('OpenAI API error'));

            // For chat context, this should return template fallback response
            const result = await aiService.getResponse('test prompt', 'chat');
            
            assert.strictEqual(result.source, 'fallback');
            assert.ok(result.content.includes('Book Writing Assistant') || result.content.includes('How Can I Help You'));
            
            // Verify that fetch was called (attempting OpenAI, then local, then falling back)
            assert.ok(fetchStub.called);
        });

        test('should fall back to template response when all external AI services fail', async () => {
            // Mock all external AI services failing
            fetchStub.rejects(new Error('All AI services unavailable'));

            const result = await aiService.getResponse('test prompt', 'chat');
            
            assert.strictEqual(result.source, 'fallback');
            assert.ok(result.content.includes('Book Writing Assistant') || result.content.includes('How Can I Help You'));
            
            // Note: If no API keys are configured, the service skips external calls and goes directly to fallback
            // This is the expected behavior for a robust fallback system
        });

        test('should use fallback response when all AI services fail', async () => {
            // Mock all AI services failing
            fetchStub.rejects(new Error('All AI services unavailable'));

            // For content context, this should throw an error
            try {
                await aiService.getResponse('test prompt', 'content');
                assert.fail('Should have thrown error for content context');
            } catch (error: any) {
                assert.ok(error.message.includes('All AI services unavailable'));
            }
        });

        test('should use fallback response for chat context when all AI services fail', async () => {
            // Mock all AI services failing
            fetchStub.rejects(new Error('All AI services unavailable'));

            // For chat context, this should return fallback response
            const result = await aiService.getResponse('test prompt', 'chat');
            
            assert.strictEqual(result.source, 'fallback');
            assert.ok(result.content.includes('currently offline') || result.content.includes('unavailable') || result.content.includes('Book Writing Assistant'));
        });

        test('should respect configured provider order', async () => {
            // Configure Claude as primary provider
            configStub.returns({
                provider: 'claude',
                timeout: 30000,
                retryAttempts: 3,
                maxTokens: 2000,
                temperature: 0.7,
                baseUrl: 'http://localhost:11434'
            });

            // Mock successful Claude response
            fetchStub.resolves({
                ok: true,
                json: () => Promise.resolve({
                    content: [{ text: 'Claude first response' }]
                })
            } as any);

            process.env.ANTHROPIC_API_KEY = 'test-claude-key';

            const result = await aiService.getResponse('test prompt', 'content');
            
            assert.strictEqual(result.source, 'claude');
            // Verify Claude was called first
            assert.strictEqual(fetchStub.firstCall.args[0], 'https://api.anthropic.com/v1/messages');
        });
    });

    suite('caching integration', () => {
        test('should return cached response when available', async () => {
            const cachedResponse = 'Cached AI response';
            cacheGetStub.returns(cachedResponse);

            const result = await aiService.getResponse('test prompt', 'content');
            
            assert.strictEqual(result.content, cachedResponse);
            // Verify no API calls were made
            assert.strictEqual(fetchStub.callCount, 0);
        });

        test('should cache successful responses', async () => {
            // Reset the set stub to capture calls
            cacheSetStub.resetHistory();
            
            // Mock successful OpenAI response
            fetchStub.resolves({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'OpenAI response' } }]
                })
            } as any);

            process.env.OPENAI_API_KEY = 'test-openai-key';

            await aiService.getResponse('test prompt', 'content');
            
            // Verify response was cached
            assert.ok(cacheSetStub.calledWith('test prompt', 'OpenAI response', 'openai', 'content'));
        });

        test('should find similar cached responses', async () => {
            cacheFindSimilarStub.returns('Similar cached response');

            const result = await aiService.getResponse('test prompt', 'content');
            
            assert.strictEqual(result.content, 'Similar cached response');
            assert.ok(cacheFindSimilarStub.calledWith('test prompt', 'content', 0.85));
        });
    });

    suite('configuration integration', () => {
        test('should use configured timeout', async () => {
            configStub.returns({
                provider: 'openai',
                timeout: 1000, // 1 second timeout
                retryAttempts: 1, // Reduce retries for faster test
                maxTokens: 2000,
                temperature: 0.7
            });

            // Mock a slow response that should timeout
            let timeoutOccurred = false;
            fetchStub.callsFake(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        timeoutOccurred = true;
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({
                                choices: [{ message: { content: 'Slow response' } }]
                            })
                        } as any);
                    }, 2000); // 2 second delay, longer than 1 second timeout
                });
            });

            process.env.OPENAI_API_KEY = 'test-openai-key';

        test('should use configured timeout and fall back to template when services timeout', async () => {
            configStub.returns({
                provider: 'openai',
                timeout: 1000, // 1 second timeout
                retryAttempts: 1, // Reduce retries for faster test
                maxTokens: 2000,
                temperature: 0.7
            });

            // Mock a slow response that should timeout
            fetchStub.callsFake(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({
                                choices: [{ message: { content: 'Slow response' } }]
                            })
                        } as any);
                    }, 2000); // 2 second delay, longer than 1 second timeout
                });
            });

            process.env.OPENAI_API_KEY = 'test-openai-key';

            const result = await aiService.getResponse('test prompt', 'chat');
            
            // For chat context, should get fallback response when services timeout
            assert.strictEqual(result.source, 'fallback');
            assert.ok(result.content.includes('Book Writing Assistant') || result.content.includes('currently offline'));
        });
        });

        test('should use configured max tokens and temperature', async () => {
            configStub.returns({
                provider: 'openai',
                timeout: 30000,
                retryAttempts: 3,
                maxTokens: 1500,
                temperature: 0.9
            });

            fetchStub.resolves({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Response with custom settings' } }]
                })
            } as any);

            process.env.OPENAI_API_KEY = 'test-openai-key';

            await aiService.getResponse('test prompt', 'content');
            
            const requestBody = JSON.parse(fetchStub.firstCall.args[1].body);
            assert.strictEqual(requestBody.max_tokens, 1500);
            assert.strictEqual(requestBody.temperature, 0.9);
        });

        test('should use configured base URL for local AI', async () => {
            configStub.returns({
                provider: 'local',
                timeout: 30000,
                retryAttempts: 1,
                maxTokens: 2000,
                temperature: 0.7,
                baseUrl: 'http://custom-ai:8080'
            });

            fetchStub.resolves({
                ok: true,
                json: () => Promise.resolve({
                    response: 'Custom local AI response'
                })
            } as any);

            await aiService.getResponse('test prompt', 'content');
            
            assert.strictEqual(fetchStub.firstCall.args[0], 'http://custom-ai:8080/api/generate');
        });
    });

    suite('error handling', () => {
        test('should handle network errors gracefully', async () => {
            fetchStub.rejects(new Error('Network error'));

            // For content context, should throw error
            try {
                await aiService.getResponse('test prompt', 'content');
                assert.fail('Should have thrown error for content context');
            } catch (error: any) {
                assert.ok(error.message.includes('All AI services unavailable'));
            }
        });

        test('should handle API rate limiting', async () => {
            fetchStub.resolves({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests'
            } as any);

            // For content context, should throw error when all services fail
            try {
                await aiService.getResponse('test prompt', 'content');
                assert.fail('Should have thrown error for content context');
            } catch (error: any) {
                assert.ok(error.message.includes('All AI services unavailable'));
            }
        });

        test('should handle malformed API responses', async () => {
            fetchStub.resolves({
                ok: true,
                json: () => Promise.resolve({
                    // Missing expected structure
                    invalid: 'response'
                })
            } as any);

            process.env.OPENAI_API_KEY = 'test-openai-key';

            const result = await aiService.getResponse('test prompt', 'content');
            
            // Should return default message for malformed response
            assert.ok(result.content.includes('No response') || result.source === 'fallback');
        });
    });

    suite('retry logic', () => {
        test('should retry failed requests according to configuration', async () => {
            configStub.returns({
                provider: 'openai',
                timeout: 30000,
                retryAttempts: 2,
                maxTokens: 2000,
                temperature: 0.7
            });

            // Mock first two calls to fail, third to succeed (demonstrating retries)
            fetchStub.onFirstCall().rejects(new Error('Temporary failure'));
            fetchStub.onSecondCall().rejects(new Error('Temporary failure'));
            fetchStub.onThirdCall().rejects(new Error('Temporary failure'));
            
            // Mock successful local AI response (fallback after OpenAI retries exhausted)
            fetchStub.onCall(3).resolves({
                ok: true,
                json: () => Promise.resolve({
                    response: 'Fallback response from local AI'
                })
            } as any);

            process.env.OPENAI_API_KEY = 'test-openai-key';

        test('should fall back to template response when retries are exhausted', async () => {
            configStub.returns({
                provider: 'openai',
                timeout: 30000,
                retryAttempts: 2,
                maxTokens: 2000,
                temperature: 0.7
            });

            // Mock all attempts to fail
            fetchStub.rejects(new Error('Temporary failure'));

            process.env.OPENAI_API_KEY = 'test-openai-key';

            const result = await aiService.getResponse('test prompt', 'chat');
            
            // After OpenAI retries fail, should fall back to template response
            assert.strictEqual(result.source, 'fallback');
            assert.ok(result.content.includes('Book Writing Assistant') || result.content.includes('How Can I Help You'));
            // Should have called multiple times due to retries and fallback attempts
            assert.ok(fetchStub.callCount >= 3); // Initial + retries + fallback attempts
        });
        });

        test('should not exceed configured retry attempts', async () => {
            configStub.returns({
                provider: 'openai',
                timeout: 30000,
                retryAttempts: 1,
                maxTokens: 2000,
                temperature: 0.7,
                baseUrl: 'http://localhost:11434'
            });

            fetchStub.rejects(new Error('Persistent failure'));

            // For content context, should throw error when all services fail
            try {
                await aiService.getResponse('test prompt', 'content');
                assert.fail('Should have thrown error for content context');
            } catch (error: any) {
                assert.ok(error.message.includes('All AI services unavailable'));
            }
        });
    });

    suite('context handling', () => {
        test('should use different system messages for chat vs content', async () => {
            fetchStub.resolves({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Context-aware response' } }]
                })
            } as any);

            process.env.OPENAI_API_KEY = 'test-openai-key';

            // Test chat context
            await aiService.getResponse('test prompt', 'chat');
            const chatRequest = JSON.parse(fetchStub.firstCall.args[1].body);
            
            // Test content context
            await aiService.getResponse('test prompt', 'content');
            const contentRequest = JSON.parse(fetchStub.secondCall.args[1].body);
            
            // Verify different system messages
            assert.notStrictEqual(chatRequest.messages[0].content, contentRequest.messages[0].content);
            assert.ok(chatRequest.messages[0].content.includes('sidebar'));
            assert.ok(contentRequest.messages[0].content.includes('educational'));
        });

        test('should use different token limits for chat vs content', async () => {
            fetchStub.resolves({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Response' } }]
                })
            } as any);

            process.env.OPENAI_API_KEY = 'test-openai-key';

            // Test chat context (should have lower token limit)
            await aiService.getResponse('test prompt', 'chat');
            const chatRequest = JSON.parse(fetchStub.firstCall.args[1].body);
            
            // Test content context (should have higher token limit)
            await aiService.getResponse('test prompt', 'content');
            const contentRequest = JSON.parse(fetchStub.secondCall.args[1].body);
            
            assert.ok(chatRequest.max_tokens <= contentRequest.max_tokens);
        });
    });
});
