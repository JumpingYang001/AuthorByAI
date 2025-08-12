/**
 * Utility Functions - Helper functions for the extension
 */

/**
 * Helper function to get file extension based on language
 */
export function getFileExtension(language: string): string {
    const extensions: { [key: string]: string } = {
        'python': '.py',
        'javascript': '.js',
        'typescript': '.ts',
        'java': '.java',
        'csharp': '.cs',
        'cpp': '.cpp',
        'c': '.c',
        'html': '.html',
        'css': '.css',
        'json': '.json',
        'xml': '.xml',
        'yaml': '.yml',
        'markdown': '.md',
        'sql': '.sql',
        'bash': '.sh',
        'powershell': '.ps1'
    };
    
    return extensions[language.toLowerCase()] || '.txt';
}

/**
 * Escape HTML characters for safe display
 */
export function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Comprehensive input sanitization for user inputs
 */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }
    
    return input
        .replace(/[<>'"&]/g, (char) => {
            const map: {[key: string]: string} = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '&': '&amp;'
            };
            return map[char];
        })
        .slice(0, 1000); // Limit length to prevent DoS
}

/**
 * Sanitize filename for safe file creation
 */
export function sanitizeFilename(filename: string): string {
    if (typeof filename !== 'string') {
        return 'untitled';
    }
    
    return filename
        // Remove dangerous characters
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
        // Remove multiple consecutive dashes
        .replace(/-+/g, '-')
        // Remove leading/trailing dashes and spaces
        .replace(/^[-\s]+|[-\s]+$/g, '')
        // Limit length
        .slice(0, 100)
        // Ensure we have something
        || 'untitled';
}

/**
 * Validate and sanitize user message input
 */
export function validateUserMessage(message: string): { isValid: boolean; sanitized: string; error?: string } {
    if (typeof message !== 'string') {
        return {
            isValid: false,
            sanitized: '',
            error: 'Message must be a string'
        };
    }

    const trimmed = message.trim();
    
    if (trimmed.length === 0) {
        return {
            isValid: false,
            sanitized: '',
            error: 'Message cannot be empty'
        };
    }

    if (trimmed.length > 5000) {
        return {
            isValid: false,
            sanitized: trimmed.slice(0, 5000),
            error: 'Message too long (max 5000 characters)'
        };
    }

    // Check for potential script injection attempts
    const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onload\s*=/gi,
        /onerror\s*=/gi,
        /onclick\s*=/gi
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(trimmed)) {
            return {
                isValid: false,
                sanitized: sanitizeInput(trimmed),
                error: 'Message contains potentially dangerous content'
            };
        }
    }

    return {
        isValid: true,
        sanitized: sanitizeInput(trimmed)
    };
}

/**
 * Validate content type for content generation
 */
export function validateContentType(contentType: string): boolean {
    const validTypes = [
        'chapter_outline',
        'lesson_content', 
        'exercise',
        'quiz',
        'summary'
    ];
    
    return typeof contentType === 'string' && validTypes.includes(contentType);
}

/**
 * Validate and sanitize topic/domain inputs
 */
export function validateTopicOrDomain(input: string, fieldName: string): { isValid: boolean; sanitized: string; error?: string } {
    if (typeof input !== 'string') {
        return {
            isValid: false,
            sanitized: '',
            error: `${fieldName} must be a string`
        };
    }

    const trimmed = input.trim();
    
    if (trimmed.length === 0) {
        return {
            isValid: false,
            sanitized: '',
            error: `${fieldName} cannot be empty`
        };
    }

    if (trimmed.length > 200) {
        return {
            isValid: false,
            sanitized: trimmed.slice(0, 200),
            error: `${fieldName} too long (max 200 characters)`
        };
    }

    // Only allow alphanumeric, spaces, and basic punctuation
    const allowedPattern = /^[a-zA-Z0-9\s\-_.,!?()]+$/;
    if (!allowedPattern.test(trimmed)) {
        return {
            isValid: false,
            sanitized: trimmed.replace(/[^a-zA-Z0-9\s\-_.,!?()]/g, ''),
            error: `${fieldName} contains invalid characters`
        };
    }

    return {
        isValid: true,
        sanitized: sanitizeInput(trimmed)
    };
}

/**
 * Rate limiting helper - track API calls to prevent abuse
 */
interface RateLimitEntry {
    count: number;
    resetTime: number;
}

class RateLimiter {
    private static instance: RateLimiter;
    private limits = new Map<string, RateLimitEntry>();
    
    public static getInstance(): RateLimiter {
        if (!RateLimiter.instance) {
            RateLimiter.instance = new RateLimiter();
        }
        return RateLimiter.instance;
    }
    
    public checkLimit(key: string, maxRequests: number = 60, windowMs: number = 60000): { allowed: boolean; retryAfter?: number } {
        const now = Date.now();
        const entry = this.limits.get(key);
        
        if (!entry || now > entry.resetTime) {
            this.limits.set(key, { count: 1, resetTime: now + windowMs });
            return { allowed: true };
        }
        
        if (entry.count >= maxRequests) {
            const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
            return { allowed: false, retryAfter };
        }
        
        entry.count++;
        return { allowed: true };
    }
    
    public reset(key: string): void {
        this.limits.delete(key);
    }
}

export { RateLimiter };
