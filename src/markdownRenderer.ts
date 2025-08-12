/**
 * Markdown Renderer - Shared markdown processing logic
 */

/**
 * Enhanced markdown renderer with syntax highlighting
 */
export function renderMarkdownContent(text: string): string {
    let html = text;
    
    // Code blocks with syntax highlighting - handle these first
    const codeBlockRegex = /```([\w]*)\n?([\s\S]*?)\n?```/g;
    
    // Store code blocks with placeholders to protect them from line break processing
    const codeBlocks: string[] = [];
    
    html = html.replace(codeBlockRegex, function(match, language, code) {
        const lang = language || 'text';
        let processedCode = code.trim();
        
        // Escape HTML first, but preserve actual newlines in code
        processedCode = processedCode
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        
        // Add syntax highlighting for Python after escaping
        if (lang.toLowerCase() === 'python') {
            processedCode = processedCode
                // Python docstrings (triple quotes) - must come before single quotes
                .replace(/(&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;|&#39;&#39;&#39;[\s\S]*?&#39;&#39;&#39;)/g, '<span style="color: #6A9955; font-style: italic;">$1</span>')
                // Python keywords
                .replace(/\b(def|class|if|else|elif|for|while|return|import|from|try|except|with|as|in)\b/g, '<span style="color: #569CD6; font-weight: bold;">$1</span>')
                // Python types and constants
                .replace(/\b(str|int|float|bool|list|dict|tuple|None|True|False)\b/g, '<span style="color: #4EC9B0;">$1</span>')
                // Single line comments (lines starting with #)
                .replace(/^(\s*#.*$)/gm, '<span style="color: #6A9955; font-style: italic;">$1</span>')
                // Regular strings (single and double quotes, but not docstrings)
                .replace(/(?<!&quot;&quot;)(&#39;[^&#39;]*&#39;|&quot;[^&quot;]*&quot;)(?!&quot;)/g, '<span style="color: #CE9178;">$1</span>');
        }
        
        const codeBlockHtml = `<pre style="margin: 12px 0; padding: 16px; background: #1e1e1e; border: 1px solid var(--vscode-panel-border); border-radius: 8px; overflow-x: auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); max-width: 100%; box-sizing: border-box;"><code style="font-family: var(--vscode-editor-font-family, Consolas, Monaco, monospace); font-size: 14px; line-height: 1.6; color: #d4d4d4; background: transparent; white-space: pre-wrap; word-break: break-all; overflow-wrap: break-word;">${processedCode}</code></pre>`;
        
        const placeholder = 'CODEBLOCKPLACEHOLDER' + codeBlocks.length + 'ENDPLACEHOLDER';
        codeBlocks.push(codeBlockHtml);
        return placeholder;
    });
    
    // Now escape HTML for the rest of the content (outside code blocks)
    html = html
        .replace(/&(?!amp;|lt;|gt;|quot;|#39;)/g, '&amp;')
        .replace(/<(?!\/?(span|pre|code|h[1-6]|strong|em|ul|ol|li|blockquote|a)\b[^>]*>)/g, '&lt;')
        .replace(/>(?![^<]*<\/(span|pre|code|h[1-6]|strong|em|ul|ol|li|blockquote|a)>)/g, '&gt;');
    
    // Headers with enhanced styling (process from longest to shortest to avoid conflicts)
    html = html.replace(/^###### (.+)$/gm, '<h6 style="font-size: 0.85em; font-weight: 600; margin: 16px 0 8px 0; color: var(--vscode-descriptionForeground); line-height: 1.3;">$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5 style="font-size: 0.9em; font-weight: 600; margin: 16px 0 8px 0; color: var(--vscode-descriptionForeground); line-height: 1.3;">$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size: 1.0em; font-weight: 600; margin: 16px 0 8px 0; color: var(--vscode-foreground); line-height: 1.3;">$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3 style="font-size: 1.1em; font-weight: 600; margin: 16px 0 8px 0; color: var(--vscode-textLink-foreground); line-height: 1.3;">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="font-size: 1.3em; font-weight: 600; margin: 16px 0 8px 0; color: var(--vscode-foreground); border-bottom: 1px solid rgba(128, 128, 128, 0.3); padding-bottom: 2px; line-height: 1.3;">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 style="font-size: 1.5em; font-weight: 600; margin: 16px 0 8px 0; color: var(--vscode-foreground); border-bottom: 2px solid var(--vscode-textLink-foreground); padding-bottom: 4px; line-height: 1.3;">$1</h1>');
    
    // Enhanced text formatting
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong style="font-weight: 600;"><em style="font-style: italic;">$1</em></strong>');
    html = html.replace(/___(.+?)___/g, '<strong style="font-weight: 600;"><em style="font-style: italic;">$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong style="font-weight: 600;">$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em style="font-style: italic;">$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em style="font-style: italic;">$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del style="text-decoration: line-through;">$1</del>');
    
    // Enhanced inline code (avoid conflicts with existing code blocks)
    const bt = String.fromCharCode(96); // backtick
    const inlineCodeRegex = new RegExp('(?<!<code[^>]*>)' + bt + '([^' + bt + ']+)' + bt + '(?![^<]*</code>)', 'g');
    html = html.replace(inlineCodeRegex, '<code style="background: var(--vscode-textCodeBlock-background); color: var(--vscode-textPreformat-foreground); padding: 3px 6px; border-radius: 4px; font-family: var(--vscode-editor-font-family, Consolas, Monaco, monospace); font-size: 13px; border: 1px solid rgba(128, 128, 128, 0.2);">$1</code>');
    
    // Enhanced blockquotes (handle nested blockquotes)
    html = html.replace(/^> > (.+)$/gm, '<blockquote style="margin: 8px 0; padding: 8px 12px; border-left: 4px solid var(--vscode-textLink-foreground); background: var(--vscode-textBlockQuote-background); font-style: italic; border-radius: 0 4px 4px 0;"><blockquote style="margin: 4px 0; padding: 4px 8px; border-left: 2px solid rgba(128, 128, 128, 0.5); background: rgba(128, 128, 128, 0.1);">$1</blockquote></blockquote>');
    html = html.replace(/^> (.+)$/gm, '<blockquote style="margin: 12px 0; padding: 12px 16px; border-left: 4px solid var(--vscode-textLink-foreground); background: var(--vscode-textBlockQuote-background); font-style: italic; border-radius: 0 4px 4px 0;">$1</blockquote>');
    
    // Task lists
    html = html.replace(/^- \[x\] (.+)$/gm, '<li style="margin: 4px 0; line-height: 1.5; list-style: none;"><input type="checkbox" checked disabled style="margin-right: 8px;"> $1</li>');
    html = html.replace(/^- \[ \] (.+)$/gm, '<li style="margin: 4px 0; line-height: 1.5; list-style: none;"><input type="checkbox" disabled style="margin-right: 8px;"> $1</li>');
    
    // Enhanced lists (handle different bullet types and numbered lists)
    html = html.replace(/^[\*\+] (.+)$/gm, '<li style="margin: 4px 0; line-height: 1.5;">$1</li>');
    html = html.replace(/^- (.+)$/gm, '<li style="margin: 4px 0; line-height: 1.5;">$1</li>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin: 4px 0; line-height: 1.5;">$1</li>');
    
    // Wrap consecutive <li> elements in appropriate list tags
    html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, function(match) {
        if (match.includes('type="checkbox"')) {
            return '<ul style="margin: 8px 0; padding-left: 24px; list-style-type: none;">' + match + '</ul>';
        }
        return '<ul style="margin: 8px 0; padding-left: 24px; list-style-type: disc;">' + match + '</ul>';
    });
    
    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr style="border: none; border-top: 2px solid var(--vscode-panel-border); margin: 16px 0;">');
    html = html.replace(/^\*\*\*+$/gm, '<hr style="border: none; border-top: 2px solid var(--vscode-panel-border); margin: 16px 0;">');
    html = html.replace(/^___+$/gm, '<hr style="border: none; border-top: 2px solid var(--vscode-panel-border); margin: 16px 0;">');
    
    // Enhanced links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--vscode-textLink-foreground); text-decoration: underline;">$1</a>');
    
    // Tables (improved table support)
    const tableLines = html.split('\n');
    const processedLines: string[] = [];
    let inTable = false;
    let tableRows: string[] = [];
    
    for (let i = 0; i < tableLines.length; i++) {
        const line = tableLines[i].trim();
        
        if (line.indexOf('|') === 0 && line.lastIndexOf('|') === line.length - 1) {
            if (line.match(/^\|[\s\-:|]+\|$/)) {
                continue;
            }
            
            if (!inTable) {
                inTable = true;
                tableRows = [];
            }
            
            const content = line.slice(1, -1);
            const cells = content.split('|').map(cell => cell.trim());
            const cellsHtml = cells.filter(cell => cell !== '').map(cell => {
                return '<td style="padding: 8px 12px; border: 1px solid var(--vscode-panel-border); background: var(--vscode-editor-background);">' + cell + '</td>';
            });
            
            if (cellsHtml.length > 0) {
                tableRows.push('<tr style="background: var(--vscode-editor-background);">' + cellsHtml.join('') + '</tr>');
            }
        } else {
            if (inTable) {
                if (tableRows.length > 0) {
                    processedLines.push('<table style="border-collapse: collapse; margin: 12px 0; width: 100%; background: var(--vscode-editor-background);">' + tableRows.join('') + '</table>');
                }
                inTable = false;
                tableRows = [];
            }
            processedLines.push(line);
        }
    }
    
    if (inTable && tableRows.length > 0) {
        processedLines.push('<table style="border-collapse: collapse; margin: 12px 0; width: 100%; background: var(--vscode-editor-background);">' + tableRows.join('') + '</table>');
    }
    
    html = processedLines.join('\n');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    // Restore code blocks
    codeBlocks.forEach((block, index) => {
        const placeholder = 'CODEBLOCKPLACEHOLDER' + index + 'ENDPLACEHOLDER';
        console.log(`Restoring placeholder ${placeholder} with:`, block.substring(0, 100));
        html = html.replace(placeholder, block);
    });
    
    console.log('Final HTML after code block restoration:', html.substring(0, 500));
    
    return html;
}
