import * as vscode from 'vscode';
import { ErrorHandler } from './errorHandler';

/**
 * Configuration interface for the extension
 */
export interface ExtensionConfig {
    aiService: {
        provider: 'openai' | 'claude' | 'local';
        timeout: number;
        retryAttempts: number;
        maxTokens: number;
        temperature: number;
        baseUrl?: string; // For local AI services
    };
    ui: {
        maxConversationHistory: number;
        autoSave: boolean;
        theme: 'auto' | 'light' | 'dark';
        enableSyntaxHighlighting: boolean;
        showTimestamps: boolean;
    };
    content: {
        defaultContentType: 'chapter' | 'lesson' | 'exercise' | 'quiz' | 'summary';
        defaultDomain: string;
        enableAutoExpansion: boolean;
        maxContentLength: number;
    };
    security: {
        enableInputSanitization: boolean;
        maxInputLength: number;
        rateLimitRequests: number;
        rateLimitWindow: number; // in milliseconds
    };
    performance: {
        enableCaching: boolean;
        cacheTimeout: number; // in milliseconds
        maxCacheSize: number;
        enableVirtualization: boolean;
    };
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ExtensionConfig = {
    aiService: {
        provider: 'openai',
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        maxTokens: 2000,
        temperature: 0.7,
        baseUrl: 'http://localhost:11434' // Default for local Ollama
    },
    ui: {
        maxConversationHistory: 100,
        autoSave: true,
        theme: 'auto',
        enableSyntaxHighlighting: true,
        showTimestamps: false
    },
    content: {
        defaultContentType: 'chapter',
        defaultDomain: 'Educational Content',
        enableAutoExpansion: true,
        maxContentLength: 10000
    },
    security: {
        enableInputSanitization: true,
        maxInputLength: 1000,
        rateLimitRequests: 10,
        rateLimitWindow: 60000 // 1 minute
    },
    performance: {
        enableCaching: true,
        cacheTimeout: 300000, // 5 minutes
        maxCacheSize: 50,
        enableVirtualization: true
    }
};

/**
 * Configuration validation rules
 */
interface ConfigValidationRule<T> {
    min?: number;
    max?: number;
    allowedValues?: T[];
    required?: boolean;
}

type ConfigValidationRules = {
    [K in keyof ExtensionConfig]: {
        [P in keyof ExtensionConfig[K]]?: ConfigValidationRule<ExtensionConfig[K][P]>;
    };
};

const VALIDATION_RULES: ConfigValidationRules = {
    aiService: {
        provider: { allowedValues: ['openai', 'claude', 'local'], required: true },
        timeout: { min: 1000, max: 120000 }, // 1s to 2 minutes
        retryAttempts: { min: 0, max: 10 },
        maxTokens: { min: 10, max: 8000 },
        temperature: { min: 0, max: 2 }
    },
    ui: {
        maxConversationHistory: { min: 10, max: 1000 },
        theme: { allowedValues: ['auto', 'light', 'dark'] }
    },
    content: {
        defaultContentType: { 
            allowedValues: ['chapter', 'lesson', 'exercise', 'quiz', 'summary'],
            required: true 
        },
        maxContentLength: { min: 100, max: 50000 }
    },
    security: {
        maxInputLength: { min: 10, max: 10000 },
        rateLimitRequests: { min: 1, max: 100 },
        rateLimitWindow: { min: 1000, max: 3600000 } // 1s to 1 hour
    },
    performance: {
        cacheTimeout: { min: 10000, max: 3600000 }, // 10s to 1 hour
        maxCacheSize: { min: 1, max: 500 }
    }
};

/**
 * Configuration Manager for the extension
 */
export class ConfigurationManager {
    private static _instance: ConfigurationManager;
    private _config: ExtensionConfig;
    private _configurationChangeHandler?: vscode.Disposable;

    private constructor() {
        this._config = this._loadConfiguration();
        this._setupConfigurationWatcher();
    }

    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager._instance) {
            ConfigurationManager._instance = new ConfigurationManager();
        }
        return ConfigurationManager._instance;
    }

    /**
     * Get the current configuration
     */
    public getConfig(): ExtensionConfig {
        return { ...this._config }; // Return a copy to prevent mutations
    }

    /**
     * Get a specific configuration section
     */
    public getConfigSection<T extends keyof ExtensionConfig>(section: T): ExtensionConfig[T] {
        return { ...this._config[section] };
    }

    /**
     * Get a specific configuration value
     */
    public getConfigValue<T extends keyof ExtensionConfig, K extends keyof ExtensionConfig[T]>(
        section: T,
        key: K
    ): ExtensionConfig[T][K] {
        return this._config[section][key];
    }

    /**
     * Update a configuration value
     */
    public async updateConfig<T extends keyof ExtensionConfig>(
        section: T,
        updates: Partial<ExtensionConfig[T]>
    ): Promise<void> {
        try {
            const vsCodeConfig = vscode.workspace.getConfiguration('authorAI');
            
            // Validate the updates first
            const validatedUpdates = this._validateConfigSection(section, updates);
            
            // Update VS Code configuration
            for (const [key, value] of Object.entries(validatedUpdates)) {
                await vsCodeConfig.update(`${section}.${key}`, value, vscode.ConfigurationTarget.Global);
            }
            
            // Update local config
            this._config[section] = { ...this._config[section], ...validatedUpdates };
            
            vscode.window.showInformationMessage(
                `Configuration updated successfully for ${section}`
            );
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'updateConfig');
            await ErrorHandler.showError(extensionError);
            throw extensionError;
        }
    }

    /**
     * Reset configuration to defaults
     */
    public async resetToDefaults(): Promise<void> {
        try {
            const action = await vscode.window.showWarningMessage(
                'Are you sure you want to reset all configuration to defaults? This cannot be undone.',
                'Reset',
                'Cancel'
            );

            if (action === 'Reset') {
                const vsCodeConfig = vscode.workspace.getConfiguration('authorAI');
                
                // Reset all configuration sections
                for (const section of Object.keys(DEFAULT_CONFIG) as Array<keyof ExtensionConfig>) {
                    for (const [key, value] of Object.entries(DEFAULT_CONFIG[section])) {
                        await vsCodeConfig.update(`${section}.${key}`, value, vscode.ConfigurationTarget.Global);
                    }
                }
                
                this._config = { ...DEFAULT_CONFIG };
                vscode.window.showInformationMessage('Configuration reset to defaults');
            }
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'resetToDefaults');
            await ErrorHandler.showError(extensionError);
        }
    }

    /**
     * Export configuration to JSON
     */
    public exportConfig(): string {
        return JSON.stringify(this._config, null, 2);
    }

    /**
     * Import configuration from JSON
     */
    public async importConfig(configJson: string): Promise<void> {
        try {
            const importedConfig = JSON.parse(configJson) as Partial<ExtensionConfig>;
            
            // Validate the imported configuration
            for (const section of Object.keys(importedConfig) as Array<keyof ExtensionConfig>) {
                if (importedConfig[section]) {
                    this._validateConfigSection(section, importedConfig[section]!);
                }
            }
            
            // Update VS Code configuration
            const vsCodeConfig = vscode.workspace.getConfiguration('authorAI');
            for (const section of Object.keys(importedConfig) as Array<keyof ExtensionConfig>) {
                if (importedConfig[section]) {
                    for (const [key, value] of Object.entries(importedConfig[section]!)) {
                        await vsCodeConfig.update(`${section}.${key}`, value, vscode.ConfigurationTarget.Global);
                    }
                }
            }
            
            // Reload configuration
            this._config = this._loadConfiguration();
            vscode.window.showInformationMessage('Configuration imported successfully');
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'importConfig');
            await ErrorHandler.showError(extensionError);
            throw extensionError;
        }
    }

    /**
     * Get configuration schema for UI generation
     */
    public getConfigSchema(): any {
        return {
            type: 'object',
            properties: {
                aiService: {
                    type: 'object',
                    title: 'AI Service Configuration',
                    properties: {
                        provider: {
                            type: 'string',
                            enum: ['openai', 'claude', 'local'],
                            default: 'openai',
                            description: 'AI service provider to use'
                        },
                        timeout: {
                            type: 'number',
                            minimum: 1000,
                            maximum: 120000,
                            default: 30000,
                            description: 'Request timeout in milliseconds'
                        },
                        retryAttempts: {
                            type: 'number',
                            minimum: 0,
                            maximum: 10,
                            default: 3,
                            description: 'Number of retry attempts for failed requests'
                        },
                        maxTokens: {
                            type: 'number',
                            minimum: 10,
                            maximum: 8000,
                            default: 2000,
                            description: 'Maximum tokens for AI responses'
                        },
                        temperature: {
                            type: 'number',
                            minimum: 0,
                            maximum: 2,
                            default: 0.7,
                            description: 'AI response creativity (0 = deterministic, 2 = very creative)'
                        }
                    }
                },
                ui: {
                    type: 'object',
                    title: 'User Interface Configuration',
                    properties: {
                        maxConversationHistory: {
                            type: 'number',
                            minimum: 10,
                            maximum: 1000,
                            default: 100,
                            description: 'Maximum number of messages to keep in conversation history'
                        },
                        autoSave: {
                            type: 'boolean',
                            default: true,
                            description: 'Automatically save generated content'
                        },
                        theme: {
                            type: 'string',
                            enum: ['auto', 'light', 'dark'],
                            default: 'auto',
                            description: 'UI theme preference'
                        },
                        enableSyntaxHighlighting: {
                            type: 'boolean',
                            default: true,
                            description: 'Enable syntax highlighting in code blocks'
                        },
                        showTimestamps: {
                            type: 'boolean',
                            default: false,
                            description: 'Show timestamps in conversation'
                        }
                    }
                }
                // Additional schema sections can be added here
            }
        };
    }

    /**
     * Load configuration from VS Code settings
     */
    private _loadConfiguration(): ExtensionConfig {
        const vsCodeConfig = vscode.workspace.getConfiguration('authorAI');
        const config: ExtensionConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // Deep copy

        try {
            // Load each configuration section
            const aiServiceConfig = vsCodeConfig.get('aiService') as Partial<ExtensionConfig['aiService']>;
            if (aiServiceConfig) {
                Object.assign(config.aiService, aiServiceConfig);
            }

            const uiConfig = vsCodeConfig.get('ui') as Partial<ExtensionConfig['ui']>;
            if (uiConfig) {
                Object.assign(config.ui, uiConfig);
            }

            const contentConfig = vsCodeConfig.get('content') as Partial<ExtensionConfig['content']>;
            if (contentConfig) {
                Object.assign(config.content, contentConfig);
            }

            const securityConfig = vsCodeConfig.get('security') as Partial<ExtensionConfig['security']>;
            if (securityConfig) {
                Object.assign(config.security, securityConfig);
            }

            const performanceConfig = vsCodeConfig.get('performance') as Partial<ExtensionConfig['performance']>;
            if (performanceConfig) {
                Object.assign(config.performance, performanceConfig);
            }

            // Validate the loaded configuration
            this._validateConfiguration(config);
            return config;
        } catch (error) {
            console.warn('Failed to load configuration, using defaults:', error);
            return DEFAULT_CONFIG;
        }
    }

    /**
     * Validate a configuration section
     */
    private _validateConfigSection<T extends keyof ExtensionConfig>(
        section: T,
        sectionConfig: Partial<ExtensionConfig[T]>
    ): Partial<ExtensionConfig[T]> {
        const rules = VALIDATION_RULES[section];
        const validated: Partial<ExtensionConfig[T]> = {};

        for (const [key, value] of Object.entries(sectionConfig)) {
            const rule = rules?.[key as keyof ExtensionConfig[T]];
            
            if (rule) {
                // Check allowed values
                if (rule.allowedValues && !rule.allowedValues.includes(value as any)) {
                    throw new Error(`Invalid value for ${section}.${key}: ${value}. Allowed values: ${rule.allowedValues.join(', ')}`);
                }
                
                // Check numeric ranges
                if (typeof value === 'number') {
                    if (rule.min !== undefined && value < rule.min) {
                        throw new Error(`Value for ${section}.${key} (${value}) is below minimum (${rule.min})`);
                    }
                    if (rule.max !== undefined && value > rule.max) {
                        throw new Error(`Value for ${section}.${key} (${value}) is above maximum (${rule.max})`);
                    }
                }
                
                // Check required fields
                if (rule.required && (value === undefined || value === null)) {
                    throw new Error(`Required field ${section}.${key} is missing`);
                }
            }
            
            validated[key as keyof ExtensionConfig[T]] = value as ExtensionConfig[T][keyof ExtensionConfig[T]];
        }

        return validated;
    }

    /**
     * Validate the entire configuration
     */
    private _validateConfiguration(config: ExtensionConfig): void {
        for (const section of Object.keys(config) as Array<keyof ExtensionConfig>) {
            this._validateConfigSection(section, config[section]);
        }
    }

    /**
     * Setup configuration change watcher
     */
    private _setupConfigurationWatcher(): void {
        this._configurationChangeHandler = vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('authorAI')) {
                try {
                    this._config = this._loadConfiguration();
                    console.log('Configuration reloaded due to changes');
                } catch (error) {
                    console.error('Failed to reload configuration:', error);
                    vscode.window.showErrorMessage(
                        'Failed to reload configuration. Some settings may be invalid.'
                    );
                }
            }
        });
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this._configurationChangeHandler?.dispose();
    }
}
