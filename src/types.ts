// Type definitions for the Book Writing Assistant extension

export interface ActivityRecord {
    timestamp: Date;
    action: 'content_generation' | 'file_creation' | 'chat';
    details: string;
    type?: string;
    topic?: string;
    domain?: string;
    filename?: string;
}

export interface Activity extends ActivityRecord {} // Alias for compatibility

export interface ProjectContext {
    mainTopic?: string;
    domain?: string;
    generatedFiles: string[];
    lastActivity?: Date;
}

export interface SessionContext {
    recentActivities: ActivityRecord[];
    currentProject: ProjectContext;
}

export interface ContentGenerationRequest {
    type: string;
    topic: string;
    domain: string;
}

export interface ContentRequest extends ContentGenerationRequest {
    contentType: string;
    context?: string;
    suggestedFolder?: string;
    suggestedFilename?: string;
    bookProjectMode?: boolean;
}

export interface WebviewMessage {
    command: string;
    text?: string;
    messageId?: string;
    [key: string]: any;
}

export interface AIServiceResponse {
    content: string;
    source: 'openai' | 'local' | 'claude' | 'template' | 'fallback';
}

export type ContentType = 'chapter_outline' | 'lesson_content' | 'exercise' | 'quiz' | 'summary';

export interface ContentTemplate {
    type: ContentType;
    topic: string;
    domain: string;
}

// Input validation interfaces
export interface ValidationResult {
    isValid: boolean;
    sanitized: string;
    error?: string;
}

export interface RateLimitResult {
    allowed: boolean;
    retryAfter?: number;
}

// Error handling interfaces
export interface ExtensionError {
    code: string;
    message: string;
    userMessage: string;
    retryable: boolean;
    context?: string;
    originalError?: Error;
    timestamp: number;
}

// Security and validation types
export interface SecurityConfig {
    maxMessageLength: number;
    maxFilenameLength: number;
    maxTopicLength: number;
    rateLimitRequests: number;
    rateLimitWindowMs: number;
}

export interface InputValidationError {
    field: string;
    message: string;
    code: 'INVALID_TYPE' | 'TOO_LONG' | 'TOO_SHORT' | 'INVALID_CHARS' | 'RATE_LIMITED' | 'DANGEROUS_CONTENT';
}

// Configuration management types
export interface ExtensionConfigurationUpdate {
    section: string;
    key: string;
    value: any;
    source: 'user' | 'import' | 'reset' | 'migration';
    timestamp: Date;
}

export interface ConfigurationValidationError {
    section: string;
    key: string;
    value: any;
    error: string;
    rule?: string;
}

export interface ConfigurationExportData {
    version: string;
    timestamp: string;
    config: any;
    metadata: {
        extensionVersion: string;
        platform: string;
        exportSource: string;
    };
}
