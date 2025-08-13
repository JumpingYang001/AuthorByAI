/**
 * Markdown Renderer - Shared markdown processing logic
 */

/**
 * Enhanced markdown renderer with syntax highlighting and math support
 */
export function renderMarkdownContent(text: string): string {
    let html = text;
    
    // Store math expressions to protect them from other processing
    const mathExpressions: string[] = [];
    
    // Handle display math blocks ($$...$$) first
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, function(match, expression) {
        const mathHtml = renderMathExpression(expression.trim(), true);
        const placeholder = 'MATHBLOCKPLACEHOLDER' + mathExpressions.length + 'ENDPLACEHOLDER';
        mathExpressions.push(mathHtml);
        return placeholder;
    });
    
    // Handle inline math ($...$) - but not if it's part of a display block
    html = html.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, function(match, expression) {
        const mathHtml = renderMathExpression(expression.trim(), false);
        const placeholder = 'MATHINLINEPLACEHOLDER' + mathExpressions.length + 'ENDPLACEHOLDER';
        mathExpressions.push(mathHtml);
        return placeholder;
    });
    
    // Code blocks with syntax highlighting - handle these after math
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
    
    // Now escape HTML for the rest of the content (outside code blocks and math)
    html = html
        .replace(/&(?!amp;|lt;|gt;|quot;|#39;)/g, '&amp;')
        .replace(/<(?!\/?(span|pre|code|h[1-6]|strong|em|ul|ol|li|blockquote|a|div)\b[^>]*>)/g, '&lt;')
        .replace(/>(?![^<]*<\/(span|pre|code|h[1-6]|strong|em|ul|ol|li|blockquote|a|div)>)/g, '&gt;');
    
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
    
    // Restore math expressions
    mathExpressions.forEach((mathHtml, index) => {
        const blockPlaceholder = 'MATHBLOCKPLACEHOLDER' + index + 'ENDPLACEHOLDER';
        const inlinePlaceholder = 'MATHINLINEPLACEHOLDER' + index + 'ENDPLACEHOLDER';
        html = html.replace(blockPlaceholder, mathHtml);
        html = html.replace(inlinePlaceholder, mathHtml);
    });
    
    // Restore code blocks
    codeBlocks.forEach((block, index) => {
        const placeholder = 'CODEBLOCKPLACEHOLDER' + index + 'ENDPLACEHOLDER';
        console.log(`Restoring placeholder ${placeholder} with:`, block.substring(0, 100));
        html = html.replace(placeholder, block);
    });
    
    console.log('Final HTML after code block restoration:', html.substring(0, 500));
    
    return html;
}

/**
 * Render mathematical expressions using a simple LaTeX-like syntax
 * This provides basic math rendering without external dependencies
 */
function renderMathExpression(expression: string, isDisplayMode: boolean): string {
    let mathHtml = expression;
    
    // Basic LaTeX symbol replacements
    const symbolMap: { [key: string]: string } = {
        '\\\\frac': 'frac',  // Handle escaped backslashes from templates
        '\\frac': 'frac',
        '\\int': '∫',
        '\\sum': '∑',
        '\\prod': '∏',
        '\\sqrt': '√',
        '\\alpha': 'α',
        '\\beta': 'β',
        '\\gamma': 'γ',
        '\\delta': 'δ',
        '\\epsilon': 'ε',
        '\\pi': 'π',
        '\\theta': 'θ',
        '\\lambda': 'λ',
        '\\mu': 'μ',
        '\\sigma': 'σ',
        '\\phi': 'φ',
        '\\chi': 'χ',
        '\\psi': 'ψ',
        '\\omega': 'ω',
        '\\infty': '∞',
        '\\pm': '±',
        '\\times': '×',
        '\\div': '÷',
        '\\cdot': '·',
        '\\neq': '≠',
        '\\leq': '≤',
        '\\geq': '≥',
        '\\to': '→',
        '\\leftarrow': '←',
        '\\rightarrow': '→',
        '\\Rightarrow': '⇒',
        '\\partial': '∂',
        '\\lim': 'lim'
    };
    
    // Replace symbols
    for (const [latex, unicode] of Object.entries(symbolMap)) {
        mathHtml = mathHtml.replace(new RegExp(latex, 'g'), unicode);
    }
    
    // Handle fractions: frac{numerator}{denominator}
    mathHtml = mathHtml.replace(/frac\{([^}]+)\}\{([^}]+)\}/g, function(match, num, den) {
        return `<span class="math-fraction"><span class="math-numerator">${num}</span><span class="math-fraction-line"></span><span class="math-denominator">${den}</span></span>`;
    });
    
    // Handle square roots: sqrt{content}
    mathHtml = mathHtml.replace(/√\{([^}]+)\}/g, function(match, content) {
        return `<span class="math-sqrt">√<span class="math-sqrt-content">${content}</span></span>`;
    });
    
    // Handle superscripts: x^{power} or x^power
    mathHtml = mathHtml.replace(/([a-zA-Z0-9π∞])\^(\{[^}]+\}|[a-zA-Z0-9+-])/g, function(match, base, power) {
        const cleanPower = power.replace(/[{}]/g, '');
        return `${base}<sup style="font-size: 0.8em; vertical-align: super; line-height: 1;">${cleanPower}</sup>`;
    });
    
    // Handle subscripts: x_{sub} or x_sub
    mathHtml = mathHtml.replace(/([a-zA-Z0-9π∞])_(\{[^}]+\}|[a-zA-Z0-9+-])/g, function(match, base, sub) {
        const cleanSub = sub.replace(/[{}]/g, '');
        return `${base}<sub style="font-size: 0.8em; vertical-align: sub; line-height: 1;">${cleanSub}</sub>`;
    });
    
    // Handle integrals with limits: int_lower^upper
    mathHtml = mathHtml.replace(/∫_(\{[^}]+\}|[a-zA-Z0-9π∞+-]+)\^(\{[^}]+\}|[a-zA-Z0-9π∞+-]+)/g, function(match, lower, upper) {
        const cleanLower = lower.replace(/[{}]/g, '');
        const cleanUpper = upper.replace(/[{}]/g, '');
        return `<span class="math-integral">∫<sub style="font-size: 0.7em; margin-left: 2px;">${cleanLower}</sub><sup style="font-size: 0.7em; margin-left: 2px;">${cleanUpper}</sup></span>`;
    });
    
    // Handle sums with limits: sum_lower^upper
    mathHtml = mathHtml.replace(/∑_(\{[^}]+\}|[a-zA-Z0-9π∞+-]+)\^(\{[^}]+\}|[a-zA-Z0-9π∞+-]+)/g, function(match, lower, upper) {
        const cleanLower = lower.replace(/[{}]/g, '');
        const cleanUpper = upper.replace(/[{}]/g, '');
        return `<span class="math-sum">∑<sub style="font-size: 0.7em;">${cleanLower}</sub><sup style="font-size: 0.7em;">${cleanUpper}</sup></span>`;
    });
    
    // Handle parentheses and brackets sizing
    mathHtml = mathHtml.replace(/\\left\(/g, '<span style="font-size: 1.2em;">(</span>');
    mathHtml = mathHtml.replace(/\\right\)/g, '<span style="font-size: 1.2em;">)</span>');
    mathHtml = mathHtml.replace(/\\left\[/g, '<span style="font-size: 1.2em;">[</span>');
    mathHtml = mathHtml.replace(/\\right\]/g, '<span style="font-size: 1.2em;">]</span>');
    
    // Clean up any remaining LaTeX syntax
    mathHtml = mathHtml.replace(/\\\\/g, '');  // Remove escaped backslashes
    mathHtml = mathHtml.replace(/\{([^}]+)\}/g, '$1');  // Remove remaining braces
    
    const containerStyle = isDisplayMode 
        ? 'display: block; text-align: center; margin: 16px 0; font-size: 1.2em; padding: 12px; background: var(--vscode-textCodeBlock-background); border-radius: 6px; border: 1px solid var(--vscode-panel-border);'
        : 'display: inline; margin: 0 2px; font-size: 1.05em; background: var(--vscode-textCodeBlock-background); padding: 2px 4px; border-radius: 3px;';
    
    return `<div class="math-expression" style="${containerStyle}">
        <span style="font-family: 'Times New Roman', serif; font-style: italic; color: var(--vscode-foreground);">
            ${mathHtml}
        </span>
        <style>
            .math-fraction {
                display: inline-block;
                vertical-align: middle;
                text-align: center;
                position: relative;
                margin: 0 3px;
            }
            .math-numerator, .math-denominator {
                display: block;
                font-size: 0.9em;
                line-height: 1.2;
            }
            .math-fraction-line {
                display: block;
                height: 1px;
                background: var(--vscode-foreground);
                margin: 2px 0;
            }
            .math-sqrt {
                position: relative;
                margin: 0 2px;
            }
            .math-sqrt-content {
                border-top: 1px solid var(--vscode-foreground);
                padding-top: 2px;
                margin-left: 2px;
            }
            .math-integral, .math-sum {
                position: relative;
                display: inline-block;
                vertical-align: middle;
                margin: 0 2px;
            }
            .math-expression {
                color: var(--vscode-foreground);
            }
        </style>
    </div>`;
}
