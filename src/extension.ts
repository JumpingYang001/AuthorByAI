// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Import our organized modules
import { SessionContextManager } from './sessionManager';
import { AIService } from './aiService';
import { TemplateService } from './templateService';
import { BookStructureService } from './bookStructureService';
import { ConversationStorage } from './conversationStorage';
import { ContentType, ContentGenerationRequest, WebviewMessage } from './types';

// Import webview providers
import { BookWritingPanel } from './providers/mainPanel';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Book Writing Assistant extension is now active!');

    // Initialize conversation storage
    ConversationStorage.getInstance(context);

    // Register command to create book structure
    const createBookStructure = vscode.commands.registerCommand('Author-AI-Assistant.createBookStructure', async () => {
        const bookStructureService = BookStructureService.getInstance();
        await bookStructureService.createBookStructure();
    });

    // Register command to open combined chat + main panel (no Explorer conflict)
    const openBookWritingPanel = vscode.commands.registerCommand('Author-AI-Assistant.openBookWritingPanel', () => {
        // Create a combined panel with both chat and main content functionality
        const panel = vscode.window.createWebviewPanel(
            'bookWritingCombined',
            '📚 Book Writing Assistant',
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
            {
                enableScripts: true,
                localResourceRoots: [context.extensionUri]
            }
        );

        // Create combined HTML that includes both chat and main panel functionality
        panel.webview.html = getCombinedHtml();
        
        // Handle messages from chat
        panel.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'sendMessage':
                    await handleCombinedPanelChat(data.text, panel.webview);
                    // Re-enable the send button after processing
                    panel.webview.postMessage({
                        command: 'enableSendButton'
                    });
                    break;
                case 'renderMarkdown':
                    // Handle markdown rendering request from webview
                    const renderedHtml = renderMarkdownContent(data.text);
                    panel.webview.postMessage({
                        command: 'renderMarkdownResponse',
                        requestId: data.requestId,
                        renderedHtml: renderedHtml
                    });
                    break;
                case 'openContentGenerator':
                    // Open the main content generator panel
                    BookWritingPanel.createOrShow(context.extensionUri);
                    break;
                case 'clearConversation':
                    // Clear conversation history with VS Code confirmation dialog
                    const conversationStorage = ConversationStorage.getInstance();
                    const stats = conversationStorage.getStats();
                    
                    if (stats.totalMessages === 0) {
                        vscode.window.showInformationMessage('💬 No conversation history to clear');
                    } else {
                        const choice = await vscode.window.showWarningMessage(
                            `Clear conversation history? This will delete ${stats.totalMessages} messages permanently.`,
                            { modal: true },
                            'Clear History'
                        );
                        
                        if (choice === 'Clear History') {
                            conversationStorage.clearConversation();
                            // Refresh the webview to show empty chat
                            panel.webview.html = getCombinedHtml();
                            vscode.window.showInformationMessage('✅ Conversation history cleared');
                        }
                    }
                    break;
                case 'insertText':
                    // Insert text at cursor position in active editor
                    console.log('Received insertText command with text:', data.text);
                    
                    if (!data.text || data.text.trim() === '') {
                        console.log('Empty text received');
                        vscode.window.showWarningMessage('❌ No text to insert');
                        break;
                    }
                    
                    // Prevent rapid duplicate operations
                    const currentTime = Date.now();
                    const lastInsertTime = (panel as any).lastInsertTime || 0;
                    const insertCooldown = 1000; // 1 second cooldown
                    
                    if (currentTime - lastInsertTime < insertCooldown) {
                        console.log('Insert operation blocked - too soon after previous operation');
                        vscode.window.showWarningMessage('⏱️ Please wait before inserting again');
                        break;
                    }
                    
                    (panel as any).lastInsertTime = currentTime;
                    
                    // Try to find the most recently used text editor if no active editor
                    let editor = vscode.window.activeTextEditor;
                    
                    if (!editor) {
                        // If no active editor, try to find any visible text editor
                        const visibleEditors = vscode.window.visibleTextEditors;
                        console.log('No active editor, checking visible editors:', visibleEditors.length);
                        
                        if (visibleEditors.length > 0) {
                            // Use the first visible editor
                            editor = visibleEditors[0];
                            console.log('Using first visible editor:', editor.document.fileName);
                            
                            // Make it active by showing it
                            try {
                                await vscode.window.showTextDocument(editor.document, editor.viewColumn, false);
                            } catch (error) {
                                console.error('Failed to show document:', error);
                            }
                        }
                    }
                    
                    console.log('Final editor:', editor ? editor.document.fileName : 'None');
                    
                    if (editor) {
                        const position = editor.selection.active;
                        console.log('Cursor position:', position.line, position.character);
                        
                        try {
                            console.log('About to perform edit operation...');
                            const success = await editor.edit(editBuilder => {
                                console.log('Inside edit builder, inserting text:', data.text);
                                editBuilder.insert(position, data.text);
                            });
                            
                            console.log('Edit operation completed, success:', success);
                            
                            if (success) {
                                console.log('Text inserted successfully');
                                vscode.window.showInformationMessage('✅ Text inserted at cursor position');
                                
                                // Briefly show the document to confirm insertion
                                await vscode.window.showTextDocument(editor.document, editor.viewColumn, false);
                            } else {
                                console.log('Edit operation returned false - likely read-only or other issue');
                                vscode.window.showErrorMessage('❌ Failed to insert text - document may be read-only');
                            }
                        } catch (error) {
                            console.error('Error during text insertion:', error);
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            vscode.window.showErrorMessage('❌ Error inserting text: ' + errorMessage);
                        }
                    } else {
                        console.log('No editor found at all');
                        vscode.window.showWarningMessage('❌ No text document found. Please open a document first.');
                    }
                    break;
                case 'createFile':
                    // Create a new file with the provided content
                    const fileExtension = getFileExtension(data.language);
                    const fileName = `generated_code${fileExtension}`;
                    const newFile = vscode.Uri.parse(`untitled:${fileName}`);
                    const document = await vscode.workspace.openTextDocument(newFile);
                    const newEditor = await vscode.window.showTextDocument(document);
                    await newEditor.edit(editBuilder => {
                        editBuilder.insert(new vscode.Position(0, 0), data.content);
                    });
                    break;
            }
        });
    });

    // Register command to clear conversation history
    const clearConversation = vscode.commands.registerCommand('Author-AI-Assistant.clearConversation', async () => {
        const conversationStorage = ConversationStorage.getInstance();
        const stats = conversationStorage.getStats();
        
        if (stats.totalMessages === 0) {
            vscode.window.showInformationMessage('💬 No conversation history to clear');
            return;
        }
        
        const choice = await vscode.window.showWarningMessage(
            `Clear conversation history? This will delete ${stats.totalMessages} messages permanently.`,
            { modal: true },
            'Clear History',
            'Cancel'
        );
        
        if (choice === 'Clear History') {
            conversationStorage.clearConversation();
            vscode.window.showInformationMessage('✅ Conversation history cleared');
        }
    });

    // Add all commands to subscriptions
    context.subscriptions.push(
        createBookStructure,
        openBookWritingPanel,
        clearConversation
    );
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('Book Writing Assistant extension is now deactivated!');
}

/**
 * Helper function to get file extension based on language
 */
function getFileExtension(language: string): string {
    const extensions: { [key: string]: string } = {
        'javascript': '.js',
        'typescript': '.ts',
        'python': '.py',
        'java': '.java',
        'csharp': '.cs',
        'cpp': '.cpp',
        'c': '.c',
        'html': '.html',
        'css': '.css',
        'json': '.json',
        'xml': '.xml',
        'markdown': '.md',
        'yaml': '.yml',
        'sql': '.sql',
        'bash': '.sh',
        'powershell': '.ps1',
        'php': '.php',
        'ruby': '.rb',
        'go': '.go',
        'rust': '.rs',
        'swift': '.swift',
        'kotlin': '.kt',
        'scala': '.scala'
    };
    
    return extensions[language.toLowerCase()] || '.txt';
}

/**
 * Enhanced markdown renderer for webview with syntax highlighting
 */
function renderMarkdownContent(text: string): string {
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
                .replace(/(&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;|&#39;&#39;&#39;[\s\S]*?&#39;&#39;&#39;)/g, '<span style="color: #608b4e; font-style: italic;">$1</span>')
                // Python keywords
                .replace(/\b(def|class|if|else|elif|for|while|return|import|from|try|except|with|as|in)\b/g, '<span style="color: #569cd6; font-weight: bold;">$1</span>')
                // Python types and constants
                .replace(/\b(str|int|float|bool|list|dict|tuple|None|True|False)\b/g, '<span style="color: #4ec9b0;">$1</span>')
                // Single line comments (lines starting with #)
                .replace(/^(\s*#.*$)/gm, '<span style="color: #608b4e; font-style: italic;">$1</span>')
                // Regular strings (single and double quotes, but not docstrings)
                .replace(/(?<!&quot;&quot;)(&#39;[^&#39;]*&#39;|&quot;[^&quot;]*&quot;)(?!&quot;)/g, '<span style="color: #ce9178;">$1</span>');
        }
        
        const codeBlockHtml = `<pre style="margin: 12px 0; padding: 16px; background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; overflow-x: auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); max-width: 100%; box-sizing: border-box;"><code style="font-family: var(--vscode-editor-font-family, Consolas, Monaco, monospace); font-size: 14px; line-height: 1.6; color: var(--vscode-editor-foreground); white-space: pre-wrap; word-break: break-all; overflow-wrap: break-word;">${processedCode}</code></pre>`;
        
        const placeholder = '___CODE_BLOCK_' + codeBlocks.length + '___';
        codeBlocks.push(codeBlockHtml);
        return placeholder;
    });
    
    // Now escape HTML for the rest of the content (outside code blocks)
    html = html
        .replace(/&(?!amp;|lt;|gt;|quot;|#39;)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    
    // Headers with enhanced styling
    html = html.replace(/^### (.+)$/gm, '<h3 style="font-size: 1.1em; font-weight: 600; margin: 16px 0 8px 0; color: var(--vscode-textLink-foreground); line-height: 1.3;">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="font-size: 1.3em; font-weight: 600; margin: 16px 0 8px 0; color: var(--vscode-foreground); border-bottom: 1px solid rgba(128, 128, 128, 0.3); padding-bottom: 2px; line-height: 1.3;">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 style="font-size: 1.5em; font-weight: 600; margin: 16px 0 8px 0; color: var(--vscode-foreground); border-bottom: 2px solid var(--vscode-textLink-foreground); padding-bottom: 4px; line-height: 1.3;">$1</h1>');
    
    // Enhanced text formatting
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>');
    html = html.replace(/(?<!\*)\*(.+?)\*(?!\*)/g, '<em style="font-style: italic;">$1</em>');
    
    // Enhanced inline code (avoid conflicts with existing code blocks)
    html = html.replace(/(?<!<code[^>]*>)`([^`]+)`(?![^<]*<\/code>)/g, '<code style="background: var(--vscode-textCodeBlock-background); color: var(--vscode-textPreformat-foreground); padding: 3px 6px; border-radius: 4px; font-family: var(--vscode-editor-font-family, Consolas, Monaco, monospace); font-size: 13px; border: 1px solid rgba(128, 128, 128, 0.2);">$1</code>');
    
    // Enhanced blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote style="margin: 12px 0; padding: 12px 16px; border-left: 4px solid var(--vscode-textLink-foreground); background: var(--vscode-textBlockQuote-background); font-style: italic; border-radius: 0 4px 4px 0;">$1</blockquote>');
    
    // Enhanced lists
    html = html.replace(/^- (.+)$/gm, '<li style="margin: 4px 0; line-height: 1.5;">$1</li>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin: 4px 0; line-height: 1.5;">$1</li>');
    
    // Wrap consecutive <li> elements in <ul> tags
    html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, '<ul style="margin: 8px 0; padding-left: 24px; list-style-type: disc;">$&</ul>');
    
    // Enhanced links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--vscode-textLink-foreground); text-decoration: underline;">$1</a>');
    
    // Line breaks for non-code content only (after code blocks are protected)
    html = html.replace(/\n/g, '<br>');
    
    // Restore code blocks (this happens after line break processing)
    codeBlocks.forEach((block, index) => {
        html = html.replace('___CODE_BLOCK_' + index + '___', block);
    });
    
    return html;
}

/**
 * Escape HTML characters for safe display
 */
function escapeHtmlInTs(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Creates combined HTML with chat interface and button to open main content generator panel
 */
function getCombinedHtml(): string {
    // Get saved conversation history
    const conversationStorage = ConversationStorage.getInstance();
    const savedMessages = conversationStorage.getConversation();
    
    // Generate HTML for saved messages
    const messagesHtml = savedMessages.map(msg => {
        const timeStr = new Date(msg.timestamp).toLocaleTimeString();
        const isUser = msg.role === 'user';
        
        if (isUser) {
            return `
                <div class="message user">
                    <div class="message-content">
                        <div class="message-text">${escapeHtmlInTs(msg.content)}</div>
                        <div class="message-time">${timeStr}</div>
                    </div>
                    <div class="message-avatar">👤</div>
                </div>`;
        } else {
            const content = msg.isMarkdown ? renderMarkdownContent(msg.content) : escapeHtmlInTs(msg.content);
            return `
                <div class="message assistant" data-message-id="${msg.id}">
                    <div class="message-avatar">🤖</div>
                    <div class="message-content">
                        <div class="message-text">${content}</div>
                        <div class="message-footer">
                            <div class="message-actions">
                                <button class="action-btn copy-btn" data-message-id="${msg.id}" title="Copy message">📋</button>
                                <button class="action-btn insert-btn" data-message-id="${msg.id}" title="Insert into editor">📝</button>
                            </div>
                            <div class="message-time">${timeStr}</div>
                        </div>
                    </div>
                </div>`;
        }
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book Writing Assistant</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 10px;
        }

        .panel {
            flex: 1;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
        }

        .panel-header {
            background: var(--vscode-sideBar-background);
            padding: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header-buttons {
            display: flex;
            gap: 8px;
        }

        .open-generator-btn {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .open-generator-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .panel-content {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
        }

        /* Chat styles - enhanced with Copilot-like features */
        .chat-container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .chat-messages {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 15px;
            padding: 10px;
            background: var(--vscode-sideBar-background);
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
            max-height: calc(100vh - 200px);
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .chat-input {
            display: flex;
            gap: 10px;
            padding: 10px 0;
            border-top: 1px solid var(--vscode-panel-border);
        }

        .chat-input input {
            flex: 1;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: 13px;
        }

        .chat-input input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .chat-input button {
            padding: 10px 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-size: 13px;
        }

        .chat-input button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .chat-input button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Message styles - enhanced with Copilot-like features */
        .message {
            margin-bottom: 16px;
            padding: 12px;
            border-radius: 8px;
            font-size: 13px;
            line-height: 1.5;
            position: relative;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }

        .message-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            font-weight: bold;
            font-size: 12px;
        }

        .message-actions {
            display: flex;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .message:hover .message-actions {
            opacity: 1;
        }

        .message-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
        }

        .message-time {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            opacity: 0.7;
        }

        .action-btn {
            padding: 4px 8px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .action-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .message-content {
            font-family: var(--vscode-font-family);
        }

        .message.user {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: auto;
            margin-right: 10px;
            max-width: 70%;
            align-self: flex-end;
            flex-direction: row-reverse;
        }

        .message.assistant {
            background: var(--vscode-textBlockQuote-background);
            margin-right: auto;
            margin-left: 10px;
            max-width: 85%;
            border-left: 3px solid var(--vscode-textLink-foreground);
            align-self: flex-start;
        }

        .message-avatar {
            font-size: 16px;
            flex-shrink: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Markdown styles */
        /* Enhanced header styles */
        .message-content h1, .message-content h2, .message-content h3,
        .message-content h4, .message-content h5, .message-content h6 {
            margin: 16px 0 8px 0;
            color: var(--vscode-foreground);
            font-weight: 600;
            line-height: 1.3;
        }

        .message-content h1 {
            font-size: 1.5em;
            border-bottom: 2px solid var(--vscode-textLink-foreground);
            padding-bottom: 4px;
        }

        .message-content h2 {
            font-size: 1.3em;
            border-bottom: 1px solid rgba(128, 128, 128, 0.3);
            padding-bottom: 2px;
        }

        .message-content h3 {
            font-size: 1.1em;
            color: var(--vscode-textLink-foreground);
        }

        .message-content p {
            margin: 4px 0;
        }

        .message-content ul, .message-content ol {
            margin: 4px 0;
            padding-left: 20px;
        }

        .message-content li {
            margin: 2px 0;
        }

        .message-content blockquote {
            margin: 8px 0;
            padding: 8px 12px;
            border-left: 3px solid var(--vscode-textLink-foreground);
            background: var(--vscode-textBlockQuote-background);
            font-style: italic;
        }

        /* Code styles */
        /* Enhanced Code styles for better appearance */
        .message-content code {
            background: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            padding: 3px 6px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
            font-size: 13px;
            border: 1px solid rgba(128, 128, 128, 0.2);
        }

        .message-content pre {
            margin: 12px 0;
            padding: 16px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            overflow-x: auto;
            position: relative;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            max-width: 100%;
            box-sizing: border-box;
        }

        .message-content pre code {
            background: none;
            padding: 0;
            border: none;
            color: var(--vscode-editor-foreground);
            font-size: 14px;
            line-height: 1.6;
            font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
            white-space: pre-wrap;
            word-break: break-all;
            overflow-wrap: break-word;
        }

        .code-block {
            position: relative;
            margin: 8px 0;
        }

        .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--vscode-tab-inactiveBackground);
            padding: 6px 12px;
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
            font-size: 11px;
            color: var(--vscode-tab-inactiveForeground);
        }

        .code-actions {
            display: flex;
            gap: 6px;
        }

        .code-action-btn {
            padding: 3px 8px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
        }

        .code-action-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .code-content {
            background: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-bottom-left-radius: 6px;
            border-bottom-right-radius: 6px;
            overflow-x: auto;
        }

        .code-content code {
            background: none;
            padding: 0;
            color: var(--vscode-editor-foreground);
            white-space: pre;
            font-family: var(--vscode-editor-font-family);
        }

        .welcome-message {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            padding: 20px 10px;
            border: 1px dashed var(--vscode-panel-border);
            border-radius: 6px;
            margin-bottom: 15px;
        }

        @media (max-width: 768px) {
            .open-generator-btn {
                font-size: 10px;
                padding: 6px 12px;
            }
            
            .header-buttons {
                gap: 4px;
            }
            
            .header-buttons .open-generator-btn {
                padding: 6px 8px;
                font-size: 9px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Chat Panel -->
        <div class="panel">
            <div class="panel-header">
                <span>💬 Writing Chat Assistant</span>
                <div class="header-buttons">
                    <button class="open-generator-btn" id="clearConversationButton">🗑️ Clear Chat</button>
                    <button class="open-generator-btn" id="openGeneratorButton">📝 Open Generator</button>
                </div>
            </div>
            <div class="panel-content">
                <div class="chat-container">
                    <div class="chat-messages" id="chatMessages">
                        ${savedMessages.length === 0 ? `
                        <div class="welcome-message">
                            👋 Hi! I'm your Book Writing Assistant. Ask me anything about creating educational content, book structure, or writing techniques. Use the "Open Generator" button to create specific content types.
                        </div>` : messagesHtml}
                    </div>
                    <div class="chat-input">
                        <input type="text" id="chatInput" placeholder="Ask me anything about book writing..." />
                        <button id="sendButton">Send</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();

            // Listen for messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'addMessage':
                        addChatMessage(message.sender, message.content, message.messageId);
                        break;
                    case 'replaceMessage':
                        replaceChatMessage(message.messageId, message.content, message.isMarkdown);
                        break;
                    case 'renderMarkdownResponse':
                        handleMarkdownResponse(message.requestId, message.renderedHtml);
                        break;
                    case 'enableSendButton':
                        enableSendButton();
                        break;
                    case 'showNotification':
                        showNotification(message.message);
                        break;
                }
            });

            function sendMessage() {
                const input = document.getElementById('chatInput');
                const message = input.value.trim();
                if (!message) return;

                // Add user message to chat
                addChatMessage('user', message);
                input.value = '';

                // Disable send button temporarily to prevent double-sending
                const sendButton = document.getElementById('sendButton');
                if (sendButton) {
                    sendButton.disabled = true;
                    sendButton.textContent = 'Sending...';
                }

                // Send to extension
                vscode.postMessage({
                    command: 'sendMessage',
                    text: message
                });
            }

            function openContentGenerator() {
                vscode.postMessage({
                    command: 'openContentGenerator'
                });
            }

            function clearConversation() {
                // Send clear request - confirmation will be handled by extension
                vscode.postMessage({
                    command: 'clearConversation'
                });
            }

            function enableSendButton() {
                const sendButton = document.getElementById('sendButton');
                if (sendButton) {
                    sendButton.disabled = false;
                    sendButton.textContent = 'Send';
                }
            }

            function copyMessage(messageId) {
                const messageElement = document.querySelector('[data-message-id="' + messageId + '"]');
                if (messageElement) {
                    const contentElement = messageElement.querySelector('.message-content');
                    const text = contentElement.textContent || contentElement.innerText;
                    navigator.clipboard.writeText(text).then(() => {
                        showNotification('📋 Message copied to clipboard');
                    });
                }
            }

            function insertAtCursor(messageId) {
                console.log('insertAtCursor called with messageId:', messageId);
                
                // Prevent rapid clicking
                if (insertAtCursor.lastCall && Date.now() - insertAtCursor.lastCall < 1000) {
                    console.log('Insert button clicked too rapidly, ignoring');
                    showNotification('⏱️ Please wait before clicking again');
                    return;
                }
                insertAtCursor.lastCall = Date.now();
                
                const messageElement = document.querySelector('[data-message-id="' + messageId + '"]');
                console.log('Found message element:', messageElement);
                
                if (messageElement) {
                    const contentElement = messageElement.querySelector('.message-content');
                    console.log('Found content element:', contentElement);
                    
                    if (contentElement) {
                        // For now, let's use textContent but preserve basic structure
                        let text = contentElement.textContent || contentElement.innerText || '';
                        
                        // Clean up the text
                        text = text.trim();
                        
                        console.log('Extracted text:', text);
                        
                        if (text) {
                            // Send to extension - let extension handle success/failure notifications
                            vscode.postMessage({
                                command: 'insertText',
                                text: text
                            });
                            // Don't show notification here - wait for extension response
                        } else {
                            showNotification('❌ No text found to insert');
                        }
                    }
                } else {
                    console.error('Message element not found for ID:', messageId);
                    showNotification('❌ Could not find message to insert');
                }
            }

            function copyCode(codeId) {
                const codeElement = document.getElementById(codeId);
                if (codeElement) {
                    const code = codeElement.textContent || codeElement.innerText;
                    navigator.clipboard.writeText(code).then(() => {
                        showNotification('📋 Code copied to clipboard');
                    });
                }
            }

            function insertCode(codeId) {
                // Prevent rapid clicking
                if (insertCode.lastCall && Date.now() - insertCode.lastCall < 1000) {
                    console.log('Insert code button clicked too rapidly, ignoring');
                    showNotification('⏱️ Please wait before clicking again');
                    return;
                }
                insertCode.lastCall = Date.now();
                
                const codeElement = document.getElementById(codeId);
                if (codeElement) {
                    const code = codeElement.textContent || codeElement.innerText;
                    vscode.postMessage({
                        command: 'insertText',
                        text: code
                    });
                    // Let extension handle the notification
                }
            }

            function createFile(codeId, language) {
                const codeElement = document.getElementById(codeId);
                if (codeElement) {
                    const code = codeElement.textContent || codeElement.innerText;
                    vscode.postMessage({
                        command: 'createFile',
                        content: code,
                        language: language
                    });
                    showNotification('📄 New file created');
                }
            }

            function addChatMessage(sender, text, messageId = null) {
                const messagesDiv = document.getElementById('chatMessages');
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + sender;
                
                if (messageId) {
                    messageDiv.setAttribute('data-message-id', messageId);
                }

                const timeStr = new Date().toLocaleTimeString();

                if (sender === 'assistant') {
                    const renderedContent = renderMarkdown(text);
                    const currentMessageId = messageId || 'msg-' + Date.now();
                    messageDiv.setAttribute('data-message-id', currentMessageId);
                    messageDiv.innerHTML = 
                        '<div class="message-avatar">🤖</div>' +
                        '<div class="message-content">' +
                            '<div class="message-text">' + renderedContent + '</div>' +
                            '<div class="message-footer">' +
                                '<div class="message-actions">' +
                                    '<button class="action-btn copy-btn" data-message-id="' + currentMessageId + '">📋</button>' +
                                    '<button class="action-btn insert-btn" data-message-id="' + currentMessageId + '">📝</button>' +
                                '</div>' +
                                '<div class="message-time">' + timeStr + '</div>' +
                            '</div>' +
                        '</div>';
                } else {
                    messageDiv.innerHTML = 
                        '<div class="message-content">' +
                            '<div class="message-text">' + escapeHtml(text) + '</div>' +
                            '<div class="message-time">' + timeStr + '</div>' +
                        '</div>' +
                        '<div class="message-avatar">👤</div>';
                }
                
                messagesDiv.appendChild(messageDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }

            function escapeHtml(unsafe) {
                return unsafe
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }

            // Shared markdown rendering - calls extension's TypeScript function
            let markdownRequestCounter = 0;
            const pendingMarkdownRequests = new Map();
            
            function renderMarkdown(text, callback) {
                const requestId = 'markdown-' + (++markdownRequestCounter);
                pendingMarkdownRequests.set(requestId, callback);
                
                // Send to extension for processing using shared TypeScript function
                vscode.postMessage({
                    command: 'renderMarkdown',
                    text: text,
                    requestId: requestId
                });
            }
            
            function handleMarkdownResponse(requestId, renderedHtml) {
                const callback = pendingMarkdownRequests.get(requestId);
                if (callback) {
                    pendingMarkdownRequests.delete(requestId);
                    callback(renderedHtml);
                }
            }

            function replaceChatMessage(messageId, content, isMarkdown = false) {
                // Find the specific message by ID
                let targetMessage = null;
                if (messageId) {
                    targetMessage = document.querySelector('.message[data-message-id="' + messageId + '"]');
                }
                
                // If no specific message found, use the last assistant message
                if (!targetMessage) {
                    const messages = document.querySelectorAll('.message.assistant');
                    if (messages.length > 0) {
                        targetMessage = messages[messages.length - 1];
                    }
                }
                
                if (targetMessage) {
                    const currentMessageId = targetMessage.getAttribute('data-message-id') || ('msg-' + Date.now());
                    targetMessage.setAttribute('data-message-id', currentMessageId);
                    
                    if (isMarkdown) {
                        // Use shared async markdown rendering
                        renderMarkdown(content, function(renderedContent) {
                            const timeStr = new Date().toLocaleTimeString();
                            targetMessage.innerHTML = 
                                '<div class="message-avatar">🤖</div>' +
                                '<div class="message-content">' +
                                    '<div class="message-text">' + renderedContent + '</div>' +
                                    '<div class="message-footer">' +
                                        '<div class="message-actions">' +
                                            '<button class="action-btn copy-btn" data-message-id="' + currentMessageId + '">📋</button>' +
                                            '<button class="action-btn insert-btn" data-message-id="' + currentMessageId + '">📝</button>' +
                                        '</div>' +
                                '<div class="message-time">' + timeStr + '</div>' +
                            '</div>' +
                        '</div>';
                        });
                    } else {
                        // Handle non-markdown content synchronously
                        const renderedContent = escapeHtml(content);
                        const timeStr = new Date().toLocaleTimeString();
                        targetMessage.innerHTML = 
                            '<div class="message-avatar">🤖</div>' +
                            '<div class="message-content">' +
                                '<div class="message-text">' + renderedContent + '</div>' +
                                '<div class="message-footer">' +
                                    '<div class="message-actions">' +
                                        '<button class="action-btn copy-btn" data-message-id="' + currentMessageId + '">📋</button>' +
                                        '<button class="action-btn insert-btn" data-message-id="' + currentMessageId + '">📝</button>' +
                                    '</div>' +
                            '<div class="message-time">' + timeStr + '</div>' +
                                '</div>' +
                            '</div>';
                    }
                } else {
                    // Fallback: create new message if no existing message to replace
                    addChatMessage('assistant', content);
                }
            }

            function showNotification(message) {
                // Create temporary notification
                const notification = document.createElement('div');
                notification.textContent = message;
                notification.style.cssText = 
                    'position: fixed;' +
                    'top: 10px;' +
                    'right: 10px;' +
                    'background: var(--vscode-notifications-background);' +
                    'color: var(--vscode-notifications-foreground);' +
                    'padding: 8px 12px;' +
                    'border-radius: 4px;' +
                    'font-size: 12px;' +
                    'z-index: 1000;' +
                    'border: 1px solid var(--vscode-notifications-border);';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 2000);
            }

            // Set up event listeners when DOM is ready
            document.addEventListener('DOMContentLoaded', function() {
                setupEventListeners();
            });

            // If DOM is already loaded, set up immediately
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setupEventListeners);
            } else {
                setupEventListeners();
            }

            function setupEventListeners() {
                // Auto-scroll to latest messages on load
                const messagesDiv = document.getElementById('chatMessages');
                if (messagesDiv) {
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }

                // Send button click
                const sendButton = document.getElementById('sendButton');
                if (sendButton) {
                    sendButton.addEventListener('click', sendMessage);
                }

                // Open generator button click
                const openGenButton = document.getElementById('openGeneratorButton');
                if (openGenButton) {
                    openGenButton.addEventListener('click', openContentGenerator);
                }

                // Clear conversation button click
                const clearButton = document.getElementById('clearConversationButton');
                if (clearButton) {
                    clearButton.addEventListener('click', clearConversation);
                }

                // Enter key for chat input
                const chatInput = document.getElementById('chatInput');
                if (chatInput) {
                    chatInput.addEventListener('keypress', function(e) {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    });
                }

                // Event delegation for dynamic buttons
                document.addEventListener('click', function(e) {
                    if (e.target.classList.contains('copy-btn')) {
                        const messageId = e.target.getAttribute('data-message-id');
                        copyMessage(messageId);
                    } else if (e.target.classList.contains('insert-btn')) {
                        const messageId = e.target.getAttribute('data-message-id');
                        insertAtCursor(messageId);
                    } else if (e.target.classList.contains('copy-code-btn')) {
                        const codeId = e.target.getAttribute('data-code-id');
                        copyCode(codeId);
                    } else if (e.target.classList.contains('insert-code-btn')) {
                        const codeId = e.target.getAttribute('data-code-id');
                        insertCode(codeId);
                    } else if (e.target.classList.contains('create-file-btn')) {
                        const codeId = e.target.getAttribute('data-code-id');
                        const language = e.target.getAttribute('data-language');
                        createFile(codeId, language);
                    }
                });
            }
        })();
    </script>
</body>
</html>`;
}

/**
 * Handle chat messages for the combined panel
 */
async function handleCombinedPanelChat(userMessage: string, webview: vscode.Webview): Promise<void> {
    try {
        // Use already imported services
        const { SessionContextManager } = require('./sessionManager');
        const { AIService } = require('./aiService');
        
        const contextManager = SessionContextManager.getInstance();
        const aiService = AIService.getInstance();
        const conversationStorage = ConversationStorage.getInstance();
        
        // Save user message to conversation storage
        conversationStorage.addMessage('user', userMessage, false);
        
        // Add to context
        contextManager.addToContext('chat', `User asked: "${userMessage}"`);

        // Add assistant "thinking" message
        const thinkingMessageId = 'thinking-' + Date.now();
        webview.postMessage({
            command: 'addMessage',
            sender: 'assistant',
            content: '🤔 Thinking...',
            messageId: thinkingMessageId
        });

        try {
            // Try to get AI response
            const contextSummary = contextManager.getContextSummary();
            const currentProject = contextManager.getCurrentProject();
            
            const hasBookStructure = contextManager.getRecentContext('file_creation')
                .some((activity: any) => activity.details.includes('Created book structure'));
            
            const projectInfo = hasBookStructure && currentProject.mainTopic 
                ? `\n\nCURRENT BOOK PROJECT: "${currentProject.mainTopic}" in ${currentProject.domain}\nProject Structure: Complete book folder structure is set up and ready for content generation.`
                : '';
            
            const enhancedPrompt = `You are a professional book writing assistant specializing in creating educational and training content.

${contextSummary}${projectInfo}

USER QUESTION: ${userMessage}

CONTEXT AWARENESS: Provide helpful, specific advice about book writing, content structure, pedagogical approaches, or how to use the content generation features effectively.`;
            
            const response = await aiService.getResponse(enhancedPrompt, 'chat');
            
            // Save assistant response to conversation storage
            conversationStorage.addMessage('assistant', response.content, true);
            
            // Replace thinking message with AI response
            webview.postMessage({
                command: 'replaceMessage',
                messageId: thinkingMessageId,
                content: response.content,
                isMarkdown: true
            });
            
        } catch (aiError) {
            console.log('AI not available, using fallback responses:', aiError);
            
            // Use fallback response
            const fallbackResponse = getCombinedPanelFallback(userMessage, contextManager);
            
            // Save fallback response to conversation storage
            conversationStorage.addMessage('assistant', fallbackResponse, true);
            
            webview.postMessage({
                command: 'replaceMessage',
                messageId: thinkingMessageId,
                content: fallbackResponse,
                isMarkdown: true
            });
        }
        
    } catch (error) {
        console.error('Error in combined panel chat:', error);
        
        webview.postMessage({
            command: 'addMessage',
            sender: 'assistant',
            content: '❌ Sorry, I encountered an error. Please try again.',
            messageId: 'error-' + Date.now()
        });
    }
}

/**
 * Get fallback responses for combined panel
 */
function getCombinedPanelFallback(userMessage: string, contextManager: any): string {
    const lowerMessage = userMessage.toLowerCase();
    const project = contextManager.getCurrentProject();
    const hasProject = project.mainTopic && project.domain;
    
    // Specific test message responses
    if (lowerMessage.includes('python') && (lowerMessage.includes('function') || lowerMessage.includes('code') || lowerMessage.includes('example'))) {
        return `# Python Function Example

Here's a useful Python function for organizing book chapters:

\`\`\`python
def create_chapter_outline(title, sections):
    """
    Create a structured chapter outline for educational content.
    
    Args:
        title (str): The chapter title
        sections (list): List of section names
    
    Returns:
        dict: Structured chapter data
    """
    chapter = {
        'title': title,
        'sections': [],
        'word_count': 0,
        'exercises': []
    }
    
    for i, section in enumerate(sections, 1):
        chapter['sections'].append({
            'number': i,
            'title': section,
            'content': '',
            'learning_objectives': []
        })
    
    return chapter

# Example usage
chapter = create_chapter_outline(
    "Introduction to Programming", 
    ["Variables", "Functions", "Loops", "Exercises"]
)
print(f"Created chapter: {chapter['title']}")
\`\`\`

This function helps organize educational content systematically.`;
    }
    
    if (lowerMessage.includes('markdown formatting') || lowerMessage.includes('markdown examples')) {
        return `# Markdown Formatting Guide

Here are **essential markdown elements** for book writing:

## Headers
Use different levels:
### Subsection
#### Sub-subsection

## Text Formatting
- **Bold text** for emphasis
- *Italic text* for subtle emphasis
- \`inline code\` for technical terms
- ~~strikethrough~~ for corrections

## Lists
### Numbered List:
1. First chapter concept
2. Second chapter concept
3. Third chapter concept

### Bullet Points:
- Key learning objective
- Supporting material
- Practice exercises

## Code Blocks
\`\`\`javascript
function generateContent(topic) {
    return \`Creating content about \${topic}\`;
}
\`\`\`

## Blockquotes
> This is an important note for students
> that spans multiple lines

## Links and References
[VS Code Documentation](https://code.visualstudio.com/docs)

**Try the Insert button** to add this formatting to your document!`;
    }
    
    // Context-aware responses for existing project
    if (hasProject) {
        if (lowerMessage.includes('outline') || lowerMessage.includes('structure')) {
            return `💡 Create chapter outlines for your ${project.domain} book about "${project.mainTopic}" using the Content Generator panel.`;
        }
        
        if (lowerMessage.includes('lesson') || lowerMessage.includes('content')) {
            return `📖 Generate lesson content for "${project.mainTopic}" in the ${project.domain} domain using the generator.`;
        }
        
        if (lowerMessage.includes('exercise') || lowerMessage.includes('practice')) {
            return `💪 Create exercises for "${project.mainTopic}" to help students practice ${project.domain} concepts.`;
        }
    }

    // General fallback responses
    const responses = hasProject ? [
        `📚 Working on "${project.mainTopic}" in ${project.domain}! How can I help with your book?`,
        `✨ Great progress on your ${project.domain} content! What would you like to create next?`,
        `🎯 I can help with chapters, lessons, exercises, quizzes, and summaries for "${project.mainTopic}".`
    ] : [
        "📝 I'm your book writing assistant! Ask me about creating educational content.",
        "🚀 I can help you structure lessons, create exercises, and write comprehensive learning materials.",
        "💡 What type of educational content are you working on today?",
        "📖 Try asking me about book structure, lesson planning, or content creation techniques!",
        "🎯 I can help you with chapter outlines, exercises, quizzes, and more. What would you like to create?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}
