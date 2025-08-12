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
