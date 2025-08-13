/**
 * Error Handler - Centralized error handling for the extension
 */

import * as vscode from 'vscode';

/**
 * Standardized error interface for consistent error handling
 */
export interface ExtensionError {
    code: string;
    message: string;
    userMessage: string;
    retryable: boolean;
    context?: string;
    originalError?: Error;
    timestamp: number;
}

/**
 * Error codes for different types of failures
 */
export enum ErrorCode {
    // AI Service Errors
    AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
    AI_RATE_LIMIT_EXCEEDED = 'AI_RATE_LIMIT_EXCEEDED',
    AI_INVALID_RESPONSE = 'AI_INVALID_RESPONSE',
    AI_TIMEOUT = 'AI_TIMEOUT',
    AI_AUTHENTICATION_FAILED = 'AI_AUTHENTICATION_FAILED',
    
    // File System Errors
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    FILE_PERMISSION_DENIED = 'FILE_PERMISSION_DENIED',
    FILE_ALREADY_EXISTS = 'FILE_ALREADY_EXISTS',
    FILE_INVALID_NAME = 'FILE_INVALID_NAME',
    
    // Validation Errors
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    INPUT_TOO_LONG = 'INPUT_TOO_LONG',
    INPUT_INVALID_FORMAT = 'INPUT_INVALID_FORMAT',
    CONTENT_TYPE_UNSUPPORTED = 'CONTENT_TYPE_UNSUPPORTED',
    
    // Storage Errors
    STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
    STORAGE_CORRUPTED = 'STORAGE_CORRUPTED',
    STORAGE_ACCESS_DENIED = 'STORAGE_ACCESS_DENIED',
    
    // Network Errors
    NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
    NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
    NETWORK_INVALID_URL = 'NETWORK_INVALID_URL',
    
    // Webview Errors
    WEBVIEW_COMMUNICATION_FAILED = 'WEBVIEW_COMMUNICATION_FAILED',
    WEBVIEW_SCRIPT_ERROR = 'WEBVIEW_SCRIPT_ERROR',
    
    // General Errors
    UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
    OPERATION_CANCELLED = 'OPERATION_CANCELLED',
    FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE'
}

/**
 * Centralized error handler for consistent error processing
 */
export class ErrorHandler {
    private static readonly ERROR_LOG_KEY = 'extensionErrorLog';
    private static readonly MAX_LOG_ENTRIES = 100;

    /**
     * Handle any error and convert it to a standardized ExtensionError
     */
    static handle(error: Error | unknown, context: string, retryable: boolean = false): ExtensionError {
        const timestamp = Date.now();
        let extensionError: ExtensionError;

        if (error instanceof Error) {
            extensionError = this.mapErrorToExtensionError(error, context, retryable, timestamp);
        } else {
            extensionError = {
                code: ErrorCode.UNEXPECTED_ERROR,
                message: `Unknown error occurred: ${String(error)}`,
                userMessage: 'An unexpected error occurred. Please try again.',
                retryable: retryable,
                context,
                timestamp
            };
        }

        // Log the error
        this.logError(extensionError);

        return extensionError;
    }

    /**
     * Handle errors specifically for AI service operations
     */
    static handleAIError(error: Error | unknown, operation: string): ExtensionError {
        const timestamp = Date.now();
        let extensionError: ExtensionError;

        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            
            if (message.includes('rate limit') || message.includes('quota')) {
                extensionError = {
                    code: ErrorCode.AI_RATE_LIMIT_EXCEEDED,
                    message: `AI service rate limit exceeded: ${error.message}`,
                    userMessage: '⏳ AI service rate limit reached. Please wait a moment before trying again.',
                    retryable: true,
                    context: `AI Service - ${operation}`,
                    originalError: error,
                    timestamp
                };
            } else if (message.includes('timeout') || message.includes('network')) {
                extensionError = {
                    code: ErrorCode.AI_TIMEOUT,
                    message: `AI service timeout: ${error.message}`,
                    userMessage: '🔄 AI service is taking too long to respond. Please try again.',
                    retryable: true,
                    context: `AI Service - ${operation}`,
                    originalError: error,
                    timestamp
                };
            } else if (message.includes('auth') || message.includes('key') || message.includes('401')) {
                extensionError = {
                    code: ErrorCode.AI_AUTHENTICATION_FAILED,
                    message: `AI service authentication failed: ${error.message}`,
                    userMessage: '🔑 AI service authentication failed. Please check your API keys in settings.',
                    retryable: false,
                    context: `AI Service - ${operation}`,
                    originalError: error,
                    timestamp
                };
            } else {
                extensionError = {
                    code: ErrorCode.AI_SERVICE_UNAVAILABLE,
                    message: `AI service error: ${error.message}`,
                    userMessage: '🤖 AI service is currently unavailable. Trying fallback options...',
                    retryable: true,
                    context: `AI Service - ${operation}`,
                    originalError: error,
                    timestamp
                };
            }
        } else {
            extensionError = this.handle(error, `AI Service - ${operation}`, true);
        }

        return extensionError;
    }

    /**
     * Handle file system related errors
     */
    static handleFileError(error: Error | unknown, operation: string, filePath?: string): ExtensionError {
        const timestamp = Date.now();
        const context = `File System - ${operation}${filePath ? ` (${filePath})` : ''}`;

        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            
            if (message.includes('enoent') || message.includes('not found')) {
                return {
                    code: ErrorCode.FILE_NOT_FOUND,
                    message: `File not found: ${error.message}`,
                    userMessage: `📁 File not found${filePath ? `: ${filePath}` : ''}. Please check the file path.`,
                    retryable: false,
                    context,
                    originalError: error,
                    timestamp
                };
            } else if (message.includes('eacces') || message.includes('permission')) {
                return {
                    code: ErrorCode.FILE_PERMISSION_DENIED,
                    message: `Permission denied: ${error.message}`,
                    userMessage: '🔒 Permission denied. Please check file permissions or try running VS Code as administrator.',
                    retryable: false,
                    context,
                    originalError: error,
                    timestamp
                };
            } else if (message.includes('eexist') || message.includes('already exists')) {
                return {
                    code: ErrorCode.FILE_ALREADY_EXISTS,
                    message: `File already exists: ${error.message}`,
                    userMessage: '📄 File already exists. Please choose a different name or delete the existing file.',
                    retryable: false,
                    context,
                    originalError: error,
                    timestamp
                };
            }
        }

        return this.handle(error, context, false);
    }

    /**
     * Handle validation errors
     */
    static handleValidationError(field: string, reason: string, value?: string): ExtensionError {
        return {
            code: ErrorCode.VALIDATION_FAILED,
            message: `Validation failed for ${field}: ${reason}`,
            userMessage: `❌ Invalid ${field}: ${reason}`,
            retryable: false,
            context: `Validation - ${field}`,
            timestamp: Date.now()
        };
    }

    /**
     * Handle network related errors
     */
    static handleNetworkError(error: Error | unknown, url?: string): ExtensionError {
        const timestamp = Date.now();
        const context = `Network${url ? ` - ${url}` : ''}`;

        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            
            if (message.includes('timeout')) {
                return {
                    code: ErrorCode.NETWORK_TIMEOUT,
                    message: `Network timeout: ${error.message}`,
                    userMessage: '⏰ Network request timed out. Please check your internet connection and try again.',
                    retryable: true,
                    context,
                    originalError: error,
                    timestamp
                };
            } else if (message.includes('network') || message.includes('fetch')) {
                return {
                    code: ErrorCode.NETWORK_UNAVAILABLE,
                    message: `Network unavailable: ${error.message}`,
                    userMessage: '🌐 Network is unavailable. Please check your internet connection.',
                    retryable: true,
                    context,
                    originalError: error,
                    timestamp
                };
            }
        }

        return this.handle(error, context, true);
    }

    /**
     * Show error to user with appropriate UI
     */
    static async showError(extensionError: ExtensionError, showRetryOption: boolean = true): Promise<string | undefined> {
        const actions: string[] = [];
        
        if (extensionError.retryable && showRetryOption) {
            actions.push('Retry');
        }
        
        actions.push('Show Details');
        
        if (extensionError.code === ErrorCode.AI_AUTHENTICATION_FAILED) {
            actions.push('Open Settings');
        }

        const choice = await vscode.window.showErrorMessage(
            extensionError.userMessage,
            { modal: false },
            ...actions
        );

        if (choice === 'Show Details') {
            this.showErrorDetails(extensionError);
        } else if (choice === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', '@ext:author-ai-assistant');
        }

        return choice;
    }

    /**
     * Show detailed error information
     */
    private static showErrorDetails(extensionError: ExtensionError): void {
        const details = [
            `**Error Code:** ${extensionError.code}`,
            `**Context:** ${extensionError.context || 'Unknown'}`,
            `**Time:** ${new Date(extensionError.timestamp).toLocaleString()}`,
            `**Retryable:** ${extensionError.retryable ? 'Yes' : 'No'}`,
            '',
            `**Technical Details:**`,
            extensionError.message,
            '',
            extensionError.originalError ? `**Original Error:** ${extensionError.originalError.stack}` : ''
        ].filter(line => line !== '').join('\n');

        vscode.window.showInformationMessage(
            'Error Details',
            { modal: true, detail: details },
            'Copy to Clipboard'
        ).then(choice => {
            if (choice === 'Copy to Clipboard') {
                vscode.env.clipboard.writeText(details);
                vscode.window.showInformationMessage('Error details copied to clipboard');
            }
        });
    }

    /**
     * Map generic errors to specific ExtensionError types
     */
    private static mapErrorToExtensionError(
        error: Error, 
        context: string, 
        retryable: boolean, 
        timestamp: number
    ): ExtensionError {
        const message = error.message.toLowerCase();
        
        // Try to categorize the error based on message content
        if (message.includes('cancelled') || message.includes('aborted')) {
            return {
                code: ErrorCode.OPERATION_CANCELLED,
                message: `Operation cancelled: ${error.message}`,
                userMessage: 'Operation was cancelled.',
                retryable: false,
                context,
                originalError: error,
                timestamp
            };
        }
        
        if (message.includes('not supported') || message.includes('not available')) {
            return {
                code: ErrorCode.FEATURE_NOT_AVAILABLE,
                message: `Feature not available: ${error.message}`,
                userMessage: 'This feature is not available in your current environment.',
                retryable: false,
                context,
                originalError: error,
                timestamp
            };
        }

        // Default error mapping
        return {
            code: ErrorCode.UNEXPECTED_ERROR,
            message: `Unexpected error: ${error.message}`,
            userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
            retryable,
            context,
            originalError: error,
            timestamp
        };
    }

    /**
     * Log error for debugging and analytics
     */
    private static logError(extensionError: ExtensionError): void {
        // Console logging for development
        console.error(`[${extensionError.code}] ${extensionError.message}`, {
            context: extensionError.context,
            timestamp: new Date(extensionError.timestamp).toISOString(),
            retryable: extensionError.retryable,
            originalError: extensionError.originalError
        });

        // TODO: Add structured logging to workspace state
        // This could be used for analytics and debugging
        try {
            // Get current workspace state if available
            // const errorLog = context.workspaceState.get<ExtensionError[]>(this.ERROR_LOG_KEY, []);
            // errorLog.push(extensionError);
            // 
            // // Keep only the most recent errors
            // if (errorLog.length > this.MAX_LOG_ENTRIES) {
            //     errorLog.splice(0, errorLog.length - this.MAX_LOG_ENTRIES);
            // }
            // 
            // context.workspaceState.update(this.ERROR_LOG_KEY, errorLog);
        } catch (loggingError) {
            console.error('Failed to log error to workspace state:', loggingError);
        }
    }

    /**
     * Create a user-friendly error message for common scenarios
     */
    static createUserFriendlyMessage(code: ErrorCode, details?: string): string {
        const messages: Record<ErrorCode, string> = {
            [ErrorCode.AI_SERVICE_UNAVAILABLE]: '🤖 AI service is temporarily unavailable. Please try again in a few moments.',
            [ErrorCode.AI_RATE_LIMIT_EXCEEDED]: '⏳ You\'ve reached the AI service rate limit. Please wait before making more requests.',
            [ErrorCode.AI_INVALID_RESPONSE]: '🔄 Received an invalid response from AI service. Please try again.',
            [ErrorCode.AI_TIMEOUT]: '⏰ AI service is taking too long to respond. Please try again.',
            [ErrorCode.AI_AUTHENTICATION_FAILED]: '🔑 AI service authentication failed. Please check your API keys in settings.',
            
            [ErrorCode.FILE_NOT_FOUND]: '📁 The requested file could not be found.',
            [ErrorCode.FILE_PERMISSION_DENIED]: '🔒 Permission denied. Please check file permissions.',
            [ErrorCode.FILE_ALREADY_EXISTS]: '📄 A file with this name already exists.',
            [ErrorCode.FILE_INVALID_NAME]: '📝 Invalid file name. Please use a valid file name.',
            
            [ErrorCode.VALIDATION_FAILED]: '❌ Input validation failed. Please check your input.',
            [ErrorCode.INPUT_TOO_LONG]: '📏 Input is too long. Please reduce the length.',
            [ErrorCode.INPUT_INVALID_FORMAT]: '📋 Input format is invalid. Please check the format.',
            [ErrorCode.CONTENT_TYPE_UNSUPPORTED]: '📑 This content type is not supported.',
            
            [ErrorCode.STORAGE_QUOTA_EXCEEDED]: '💾 Storage quota exceeded. Please clear some data.',
            [ErrorCode.STORAGE_CORRUPTED]: '🔧 Storage data is corrupted. Some features may not work properly.',
            [ErrorCode.STORAGE_ACCESS_DENIED]: '🔒 Cannot access storage. Please check permissions.',
            
            [ErrorCode.NETWORK_UNAVAILABLE]: '🌐 Network is unavailable. Please check your internet connection.',
            [ErrorCode.NETWORK_TIMEOUT]: '⏰ Network request timed out. Please try again.',
            [ErrorCode.NETWORK_INVALID_URL]: '🔗 Invalid URL provided.',
            
            [ErrorCode.WEBVIEW_COMMUNICATION_FAILED]: '💬 Communication with the interface failed. Please reload.',
            [ErrorCode.WEBVIEW_SCRIPT_ERROR]: '🐛 An error occurred in the interface. Please reload.',
            
            [ErrorCode.UNEXPECTED_ERROR]: '❗ An unexpected error occurred. Please try again.',
            [ErrorCode.OPERATION_CANCELLED]: '🚫 Operation was cancelled.',
            [ErrorCode.FEATURE_NOT_AVAILABLE]: '🚧 This feature is not available in your current environment.'
        };

        let message = messages[code] || 'An error occurred.';
        if (details) {
            message += ` Details: ${details}`;
        }
        
        return message;
    }

    /**
     * Determine if an error should be retried based on its type
     */
    static shouldRetry(extensionError: ExtensionError, attemptCount: number = 0): boolean {
        const maxRetries: Partial<Record<ErrorCode, number>> = {
            [ErrorCode.AI_TIMEOUT]: 3,
            [ErrorCode.AI_SERVICE_UNAVAILABLE]: 2,
            [ErrorCode.NETWORK_TIMEOUT]: 3,
            [ErrorCode.NETWORK_UNAVAILABLE]: 2,
            [ErrorCode.WEBVIEW_COMMUNICATION_FAILED]: 2
        };

        const maxRetryCount = maxRetries[extensionError.code as ErrorCode] || 0;
        return extensionError.retryable && attemptCount < maxRetryCount;
    }
}

/**
 * Retry wrapper for operations that might fail
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 1,
    delayMs: number = 1000
): Promise<T> {
    let lastError: ExtensionError | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = ErrorHandler.handle(error, context, attempt < maxRetries);
            
            if (!ErrorHandler.shouldRetry(lastError, attempt)) {
                break;
            }
            
            if (attempt < maxRetries) {
                // Exponential backoff
                const delay = delayMs * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // If we get here, all retries failed
    if (lastError) {
        throw lastError;
    }
    
    throw ErrorHandler.handle(new Error('Operation failed after retries'), context);
}
