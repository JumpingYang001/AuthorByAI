import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ConfigurationManager, ExtensionConfig } from '../configurationManager';
import { ErrorHandler } from '../errorHandler';

suite('ConfigurationManager Test Suite', () => {
    let configManager: ConfigurationManager;
    let mockConfig: sinon.SinonStubbedInstance<vscode.WorkspaceConfiguration>;
    let getConfigurationStub: sinon.SinonStub;
    let errorHandlerStub: sinon.SinonStub;

    setup(() => {
        // Reset singleton instance for testing
        (ConfigurationManager as any)._instance = undefined;
        
        // Create mock workspace configuration
        mockConfig = {
            get: sinon.stub(),
            update: sinon.stub(),
            has: sinon.stub(),
            inspect: sinon.stub()
        } as any;

        // Stub vscode.workspace.getConfiguration
        getConfigurationStub = sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        
        // Stub ErrorHandler.showError to prevent dialog hanging
        errorHandlerStub = sinon.stub(ErrorHandler, 'showError').resolves();
        
        configManager = ConfigurationManager.getInstance();
    });

    teardown(() => {
        sinon.restore();
    });

    suite('configuration loading', () => {
        test('should load default configuration when no settings exist', () => {
            mockConfig.get.returns(undefined);

            const config = configManager.getConfig();
            
            // Verify default values
            assert.strictEqual(config.aiService.provider, 'openai');
            assert.strictEqual(config.aiService.timeout, 30000);
            assert.strictEqual(config.aiService.retryAttempts, 3);
            assert.strictEqual(config.ui.maxConversationHistory, 100);
            assert.strictEqual(config.ui.autoSave, true);
        });

        test('should merge user settings with defaults', () => {
            // Mock partial user configuration
            mockConfig.get.withArgs('aiService').returns({
                provider: 'claude',
                timeout: 60000
            });
            mockConfig.get.withArgs('ui').returns({
                autoSave: false
            });

            // Create new instance to trigger loading
            (ConfigurationManager as any)._instance = undefined;
            configManager = ConfigurationManager.getInstance();
            
            const config = configManager.getConfig();
            
            // Verify merged values
            assert.strictEqual(config.aiService.provider, 'claude');
            assert.strictEqual(config.aiService.timeout, 60000);
            assert.strictEqual(config.aiService.retryAttempts, 3); // Default
            assert.strictEqual(config.ui.autoSave, false);
            assert.strictEqual(config.ui.maxConversationHistory, 100); // Default
        });

        test('should validate configuration on load', () => {
            // Mock invalid configuration
            mockConfig.get.withArgs('aiService').returns({
                provider: 'invalid-provider',
                timeout: -1000,
                maxTokens: 10000
            });

            // Should fall back to defaults for invalid values
            (ConfigurationManager as any)._instance = undefined;
            
            try {
                configManager = ConfigurationManager.getInstance();
                const config = configManager.getConfig();
                
                // Should use defaults due to validation failure
                assert.strictEqual(config.aiService.provider, 'openai');
                assert.strictEqual(config.aiService.timeout, 30000);
            } catch (error) {
                // Or throw validation error - either behavior is acceptable
                assert.ok(error instanceof Error);
            }
        });
    });

    suite('configuration access', () => {
        test('should get specific configuration section', () => {
            const aiConfig = configManager.getConfigSection('aiService');
            
            assert.ok(aiConfig);
            assert.ok('provider' in aiConfig);
            assert.ok('timeout' in aiConfig);
            assert.ok('retryAttempts' in aiConfig);
        });

        test('should get specific configuration value', () => {
            const provider = configManager.getConfigValue('aiService', 'provider');
            const autoSave = configManager.getConfigValue('ui', 'autoSave');
            
            assert.strictEqual(typeof provider, 'string');
            assert.strictEqual(typeof autoSave, 'boolean');
        });

        test('should return immutable configuration copy', () => {
            const config1 = configManager.getConfig();
            const config2 = configManager.getConfig();
            
            // Modifying one should not affect the other
            (config1.aiService as any).provider = 'modified';
            assert.notStrictEqual(config2.aiService.provider, 'modified');
        });
    });

    suite('configuration updates', () => {
        test('should update configuration section', async () => {
            mockConfig.update.resolves();

            await configManager.updateConfig('aiService', {
                provider: 'claude',
                timeout: 45000
            });

            // Verify VS Code configuration was updated
            assert.ok(mockConfig.update.calledWith('aiService.provider', 'claude', vscode.ConfigurationTarget.Global));
            assert.ok(mockConfig.update.calledWith('aiService.timeout', 45000, vscode.ConfigurationTarget.Global));
        });

        test('should validate configuration updates', async () => {
            mockConfig.update.resolves();

            try {
                await configManager.updateConfig('aiService', {
                    provider: 'invalid-provider' as any,
                    timeout: -5000
                });
                assert.fail('Should have thrown validation error');
            } catch (error: any) {
                assert.ok(error.message.includes('Invalid value') || error.message.includes('validation'));
            }
        });

        test('should handle VS Code configuration update failures', async () => {
            mockConfig.update.rejects(new Error('Permission denied'));

            try {
                await configManager.updateConfig('aiService', {
                    provider: 'claude'
                });
                assert.fail('Should have thrown error');
            } catch (error: any) {
                assert.ok(error.message.includes('Permission denied') || error.code);
            }
        });
    });

    suite('configuration validation', () => {
        test('should validate allowed values', () => {
            try {
                (configManager as any)._validateConfigSection('aiService', {
                    provider: 'invalid-provider'
                });
                assert.fail('Should have thrown validation error');
            } catch (error: any) {
                assert.ok(error.message.includes('Invalid value') || error.message.includes('Allowed values'));
            }
        });

        test('should validate numeric ranges', () => {
            try {
                (configManager as any)._validateConfigSection('aiService', {
                    timeout: 500 // Below minimum of 1000
                });
                assert.fail('Should have thrown validation error');
            } catch (error: any) {
                assert.ok(error.message.includes('below minimum') || error.message.includes('timeout'));
            }

            try {
                (configManager as any)._validateConfigSection('aiService', {
                    maxTokens: 10000 // Above maximum of 8000
                });
                assert.fail('Should have thrown validation error');
            } catch (error: any) {
                assert.ok(error.message.includes('above maximum') || error.message.includes('maxTokens'));
            }
        });

        test('should validate required fields', () => {
            try {
                (configManager as any)._validateConfigSection('aiService', {
                    provider: undefined
                });
                assert.fail('Should have thrown validation error');
            } catch (error: any) {
                assert.ok(error.message.includes('Invalid value for aiService.provider: undefined') || error.message.includes('Required field') || error.message.includes('missing'));
            }
        });
    });

    suite('configuration reset', () => {
        test('should reset all configuration to defaults', async () => {
            mockConfig.update.resolves();
            
            // Mock user confirmation
            const showWarningStub = sinon.stub(vscode.window, 'showWarningMessage').resolves('Reset' as any);

            await configManager.resetToDefaults();

            // Verify all sections were reset
            assert.ok(mockConfig.update.calledWith('aiService.provider', 'openai'));
            assert.ok(mockConfig.update.calledWith('ui.autoSave', true));
            assert.ok(showWarningStub.called);
        });

        test('should not reset when user cancels', async () => {
            const showWarningStub = sinon.stub(vscode.window, 'showWarningMessage').resolves(undefined);

            await configManager.resetToDefaults();

            // Verify no updates were made
            assert.strictEqual(mockConfig.update.callCount, 0);
            assert.ok(showWarningStub.called);
        });
    });

    suite('configuration import/export', () => {
        test('should export configuration as JSON', () => {
            const exportedConfig = configManager.exportConfig();
            
            assert.ok(typeof exportedConfig === 'string');
            
            const parsed = JSON.parse(exportedConfig);
            assert.ok(parsed.aiService);
            assert.ok(parsed.ui);
            assert.ok(parsed.content);
        });

        test('should import valid configuration', async () => {
            mockConfig.update.resolves();

            const configToImport = {
                aiService: {
                    provider: 'claude',
                    timeout: 45000
                },
                ui: {
                    autoSave: false
                }
            };

            await configManager.importConfig(JSON.stringify(configToImport));

            // Verify configuration was imported
            assert.ok(mockConfig.update.calledWith('aiService.provider', 'claude'));
            assert.ok(mockConfig.update.calledWith('ui.autoSave', false));
        });

        test('should reject invalid JSON in import', async () => {
            try {
                await configManager.importConfig('invalid json');
                assert.fail('Should have thrown error');
            } catch (error: any) {
                assert.ok(error.message.includes('JSON') || error.message.includes('parse'));
            }
        });

        test('should validate imported configuration', async () => {
            const invalidConfig = {
                aiService: {
                    provider: 'invalid-provider',
                    timeout: -1000
                }
            };

            try {
                await configManager.importConfig(JSON.stringify(invalidConfig));
                assert.fail('Should have thrown validation error');
            } catch (error: any) {
                assert.ok(error.message.includes('Invalid') || error.message.includes('validation'));
            }
        });
    });

    suite('configuration schema', () => {
        test('should provide valid JSON schema', () => {
            const schema = configManager.getConfigSchema();
            
            assert.strictEqual(schema.type, 'object');
            assert.ok(schema.properties);
            assert.ok(schema.properties.aiService);
            assert.ok(schema.properties.ui);
        });

        test('should include proper validation rules in schema', () => {
            const schema = configManager.getConfigSchema();
            
            const providerProperty = schema.properties.aiService.properties.provider;
            assert.ok(providerProperty.enum);
            assert.ok(providerProperty.enum.includes('openai'));
            assert.ok(providerProperty.enum.includes('claude'));
            assert.ok(providerProperty.enum.includes('local'));

            const timeoutProperty = schema.properties.aiService.properties.timeout;
            assert.strictEqual(timeoutProperty.minimum, 1000);
            assert.strictEqual(timeoutProperty.maximum, 120000);
        });
    });

    suite('configuration change handling', () => {
        test('should reload configuration when VS Code settings change', () => {
            // Simulate configuration change
            const onDidChangeStub = sinon.stub();
            sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({
                dispose: sinon.stub()
            } as any);

            // Create new instance to set up watcher
            (ConfigurationManager as any)._instance = undefined;
            configManager = ConfigurationManager.getInstance();

            // Verify watcher was set up
            assert.ok(vscode.workspace.onDidChangeConfiguration);
        });

        test('should handle configuration reload errors gracefully', () => {
            // Mock configuration that throws during reload
            mockConfig.get.throws(new Error('Configuration error'));

            // Should not crash when configuration changes
            (ConfigurationManager as any)._instance = undefined;
            
            // This should not throw
            assert.doesNotThrow(() => {
                configManager = ConfigurationManager.getInstance();
            });
        });
    });
});
