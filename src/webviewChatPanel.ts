import * as vscode from 'vscode';
import { renderMarkdownContent } from './markdownRenderer';
import { ConversationStorage } from './conversationStorage';
import { BookWritingPanel } from './providers/mainPanel';

/**
 * WebView Chat Panel - Handles the combined chat interface
 */
export class WebViewChatPanel {
    
    /**
     * Handle messages from the chat webview
     */
    static async handleWebViewMessage(data: any, panel: vscode.WebviewPanel, context: vscode.ExtensionContext): Promise<void> {
        switch (data.command) {
            case 'sendMessage':
                await WebViewChatPanel.handleCombinedPanelChat(data.text, panel.webview);
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
            case 'insertAtCursor':
                // Handle insert at cursor from webview
                try {
                    await vscode.commands.executeCommand('Author-AI-Assistant.insertAtCursor', data.text);
                    
                    // After insertion, ensure focus returns to the editor
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        // Focus the editor document and position cursor
                        await vscode.window.showTextDocument(editor.document, {
                            viewColumn: editor.viewColumn,
                            preserveFocus: false,
                            selection: editor.selection
                        });
                    }
                } catch (error) {
                    console.error('Error inserting content:', error);
                    vscode.window.showErrorMessage('Failed to insert content at cursor position');
                }
                break;
            case 'createFile':
                // Handle create file from webview
                try {
                    await vscode.commands.executeCommand('Author-AI-Assistant.createFile', data.code, data.language);
                    // Focus should automatically be on the new file created by the command
                } catch (error) {
                    console.error('Error creating file:', error);
                    vscode.window.showErrorMessage('Failed to create file from code');
                }
                break;
            case 'openContentGenerator':
                // Open the main content generator panel
                BookWritingPanel.createOrShow(context.extensionUri);
                break;
            case 'clearConversation':
                await WebViewChatPanel.handleClearConversation(panel.webview);
                break;
        }
    }

    /**
     * Handle clearing conversation with confirmation
     */
    private static async handleClearConversation(webview: vscode.Webview): Promise<void> {
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
                webview.html = WebViewChatPanel.getCombinedHtml();
                vscode.window.showInformationMessage('✅ Conversation history cleared');
            }
        }
    }

    /**
     * Generate the combined HTML for chat interface
     */
    static getCombinedHtml(): string {
        const conversationStorage = ConversationStorage.getInstance();
        const messages = conversationStorage.getConversation();
        
        let messagesHtml = '';
        messages.forEach((msg: any) => {
            const renderedContent = msg.isMarkdown ? renderMarkdownContent(msg.content) : this.escapeHtml(msg.content);
            const avatar = msg.role === 'user' ? '👤' : '🤖';
            const messageClass = msg.role === 'user' ? 'user' : 'assistant';
            const messageId = msg.id || ('msg-' + Date.now());
            
            messagesHtml += `
                <div class="message ${messageClass}" data-message-id="${messageId}">
                    <div class="message-avatar">${avatar}</div>
                    <div class="message-content">
                        <div class="message-text">${renderedContent}</div>
                        <div class="message-footer">
                            <div class="message-actions">
                                <button class="action-btn copy-btn" data-message-id="${messageId}">📋</button>
                                <button class="action-btn insert-btn" data-message-id="${messageId}">📝</button>
                            </div>
                            <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
                        </div>
                    </div>
                </div>`;
        });

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book Writing Assistant</title>
    <style>
        body { 
            font-family: var(--vscode-font-family);
            margin: 0; 
            padding: 0; 
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            max-height: 100vh;
        }
        
        .header {
            background: var(--vscode-titleBar-activeBackground);
            color: var(--vscode-titleBar-activeForeground);
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        
        .header h2 {
            margin: 0;
            font-size: 13px;
            font-weight: 600;
        }
        
        .header-actions {
            display: flex;
            gap: 4px;
        }
        
        .header-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 2px 6px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 10px;
            transition: background-color 0.2s;
            font-weight: normal;
            line-height: 1.2;
        }
        
        .header-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        
        .message {
            display: flex;
            gap: 12px;
            max-width: 85%;
            animation: fadeIn 0.3s ease-in;
        }
        
        .message.user {
            align-self: flex-end;
            flex-direction: row-reverse;
        }
        
        .message.assistant {
            align-self: flex-start;
        }
        
        .message-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            background: var(--vscode-badge-background);
            flex-shrink: 0;
        }
        
        .message-content {
            flex: 1;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 12px;
            padding: 12px 16px;
            position: relative;
        }
        
        .message.user .message-content {
            background: var(--vscode-inputOption-activeBackground);
        }
        
        .message-text {
            line-height: 1.5;
            word-wrap: break-word;
        }
        
        .message-footer {
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
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
        
        .action-btn {
            background: none;
            border: none;
            padding: 4px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            transition: all 0.2s;
        }
        
        .action-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
            color: var(--vscode-foreground);
        }
        
        .input-container {
            padding: 16px;
            border-top: 1px solid var(--vscode-panel-border);
            background: var(--vscode-editor-background);
            flex-shrink: 0;
        }
        
        .input-wrapper {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }
        
        #chatInput {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            padding: 12px;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.4;
            resize: vertical;
            min-height: 44px;
            max-height: 120px;
        }
        
        #chatInput:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        #sendButton {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            padding: 12px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background-color 0.2s;
            white-space: nowrap;
        }
        
        #sendButton:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }
        
        #sendButton:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            margin: 40px 0;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">
            <h2>📚 Writing Chat Assistant</h2>
            <div class="header-actions">
                <button class="header-btn" id="openGeneratorButton">🎯 Content Generator</button>
                <button class="header-btn" id="clearConversationButton">🗑️ Clear Chat</button>
            </div>
        </div>
        
        <div class="messages" id="messagesContainer">
            ${messagesHtml || '<div class="empty-state">💬 Start a conversation to get writing assistance...</div>'}
        </div>
        
        <div class="input-container">
            <div class="input-wrapper">
                <textarea 
                    id="chatInput" 
                    placeholder="Ask anything about writing, plot development, character creation, or request content generation..."
                    rows="1"
                ></textarea>
                <button id="sendButton">Send</button>
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
                const messageElement = document.querySelector('.message[data-message-id="' + messageId + '"] .message-text');
                if (messageElement) {
                    const text = messageElement.textContent || messageElement.innerText;
                    navigator.clipboard.writeText(text).then(() => {
                        showNotification('Message copied to clipboard');
                    });
                }
            }

            function insertAtCursor(messageId) {
                const messageElement = document.querySelector('.message[data-message-id="' + messageId + '"] .message-text');
                if (messageElement) {
                    let text = messageElement.textContent || messageElement.innerText;
                    
                    // Clean up the text
                    text = text.replace(/\\n\\s*\\n/g, '\\n\\n').trim();
                    
                    vscode.postMessage({
                        command: 'insertAtCursor',
                        text: text
                    });
                    showNotification('Content inserted at cursor position');
                }
            }

            function copyCode(codeId) {
                const codeElement = document.querySelector('[data-code-id="' + codeId + '"]');
                if (codeElement) {
                    const code = codeElement.textContent || codeElement.innerText;
                    navigator.clipboard.writeText(code).then(() => {
                        showNotification('Code copied to clipboard');
                    });
                }
            }

            function insertCode(codeId) {
                const codeElement = document.querySelector('[data-code-id="' + codeId + '"]');
                if (codeElement) {
                    const code = codeElement.textContent || codeElement.innerText;
                    vscode.postMessage({
                        command: 'insertAtCursor',
                        text: code
                    });
                    showNotification('Code inserted at cursor position');
                }
            }

            function createFile(codeId, language) {
                const codeElement = document.querySelector('[data-code-id="' + codeId + '"]');
                if (codeElement) {
                    const code = codeElement.textContent || codeElement.innerText;
                    vscode.postMessage({
                        command: 'createFile',
                        code: code,
                        language: language
                    });
                }
            }

            function addChatMessage(sender, text, messageId = null) {
                const messagesDiv = document.getElementById('messagesContainer');
                const emptyState = messagesDiv.querySelector('.empty-state');
                if (emptyState) {
                    emptyState.remove();
                }

                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${sender}\`;
                const actualMessageId = messageId || ('msg-' + Date.now());
                messageDiv.setAttribute('data-message-id', actualMessageId);
                
                const avatar = sender === 'user' ? '👤' : '🤖';
                const timeStr = new Date().toLocaleTimeString();
                
                messageDiv.innerHTML = 
                    '<div class="message-avatar">' + avatar + '</div>' +
                    '<div class="message-content">' +
                        '<div class="message-text">' + escapeHtml(text) + '</div>' +
                        '<div class="message-footer">' +
                            '<div class="message-actions">' +
                                '<button class="action-btn copy-btn" data-message-id="' + actualMessageId + '">📋</button>' +
                                '<button class="action-btn insert-btn" data-message-id="' + actualMessageId + '">📝</button>' +
                            '</div>' +
                            '<div class="message-time">' + timeStr + '</div>' +
                        '</div>' +
                    '</div>';

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
                        // Handle already-processed HTML content directly (no escaping needed)
                        const timeStr = new Date().toLocaleTimeString();
                        targetMessage.innerHTML = 
                            '<div class="message-avatar">🤖</div>' +
                            '<div class="message-content">' +
                                '<div class="message-text">' + content + '</div>' +
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
                notification.style.cssText = \`
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--vscode-notifications-background);
                    color: var(--vscode-notifications-foreground);
                    padding: 12px 16px;
                    border-radius: 4px;
                    border: 1px solid var(--vscode-notifications-border);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    z-index: 1000;
                    font-size: 13px;
                    max-width: 300px;
                    word-wrap: break-word;
                \`;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 3000);
            }

            // Event listeners
            document.addEventListener('DOMContentLoaded', function() {
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

                // Event delegation for message actions
                document.addEventListener('click', function(e) {
                    if (e.target.classList.contains('copy-btn')) {
                        const messageId = e.target.getAttribute('data-message-id');
                        if (messageId) copyMessage(messageId);
                    } else if (e.target.classList.contains('insert-btn')) {
                        const messageId = e.target.getAttribute('data-message-id');
                        if (messageId) insertAtCursor(messageId);
                    }
                });
            });
        })();
    </script>
</body>
</html>`;
    }

    /**
     * Handle chat messages and AI responses
     */
    private static async handleCombinedPanelChat(userMessageText: string, webview: vscode.Webview): Promise<void> {
        try {
            // Save user message to conversation history
            const conversationStorage = ConversationStorage.getInstance();
            conversationStorage.addMessage('user', userMessageText, false);
            
            // Show typing indicator
            const typingMessageId = 'typing-' + Date.now();
            webview.postMessage({
                command: 'addMessage',
                sender: 'assistant',
                content: '🤔 Thinking...',
                messageId: typingMessageId
            });

            // Get AI response
            const { AIService } = await import('./aiService');
            const aiService = AIService.getInstance();
            
            // Get conversation context for better responses
            const recentMessages = conversationStorage.getConversation().slice(-6);
            const contextString = recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            
            const responseObj = await aiService.getResponse(userMessageText, 'chat');
            
            // Debug: Log the raw response
            console.log('Raw AI response:', responseObj.content);
            
            // Pre-process markdown content in the extension to avoid double-processing
            const processedContent = renderMarkdownContent(responseObj.content);
            
            // Debug: Log the processed content
            console.log('Processed content:', processedContent);
            
            // Save assistant response (save the original markdown for storage)
            conversationStorage.addMessage('assistant', responseObj.content, true);
            
            // Replace typing message with processed HTML content
            webview.postMessage({
                command: 'replaceMessage',
                messageId: typingMessageId,
                content: processedContent,
                isMarkdown: false  // Already processed as HTML
            });
            
        } catch (error) {
            console.error('Error in chat response:', error);
            webview.postMessage({
                command: 'replaceMessage',
                messageId: 'typing-' + Date.now(),
                content: 'Sorry, I encountered an error while processing your request. Please try again.',
                isMarkdown: false
            });
        }
    }

    /**
     * Simple HTML escaping utility
     */
    private static escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
