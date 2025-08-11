// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Import our organized modules
import { SessionContextManager } from './sessionManager';
import { AIService } from './aiService';
import { TemplateService } from './templateService';
import { BookStructureService } from './bookStructureService';
import { ContentType, ContentGenerationRequest, WebviewMessage } from './types';

// Import webview providers
import { BookWritingChatProvider } from './providers/chatProvider';
import { BookWritingContentProvider } from './providers/contentProvider';
import { BookWritingPanel } from './providers/mainPanel';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Book Writing Assistant extension is now active!');

    // Register sidebar chat provider
    const chatProvider = new BookWritingChatProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(BookWritingChatProvider.viewType, chatProvider)
    );

    // Register sidebar content generator provider
    const contentProvider = new BookWritingContentProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(BookWritingContentProvider.viewType, contentProvider)
    );

    // Register command to create book structure
    const createBookStructure = vscode.commands.registerCommand('Author-AI-Assistant.createBookStructure', async () => {
        const bookStructureService = BookStructureService.getInstance();
        await bookStructureService.createBookStructure();
    });

    // Register command to open chat sidebar
    const openChatSidebar = vscode.commands.registerCommand('Author-AI-Assistant.openChatSidebar', () => {
        vscode.commands.executeCommand('workbench.view.extension.bookWriting');
    });

    // Register command to open combined chat + content generator panel (no Explorer conflict)
    const openBookWritingPanel = vscode.commands.registerCommand('Author-AI-Assistant.openBookWritingPanel', () => {
        // Create a combined panel with both chat and content generator
        const panel = vscode.window.createWebviewPanel(
            'bookWritingCombined',
            '📚 Book Writing Assistant',
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
            {
                enableScripts: true,
                localResourceRoots: [context.extensionUri]
            }
        );

        // Create instances of both providers
        const chatProvider = new BookWritingChatProvider(context.extensionUri);
        const contentProvider = new BookWritingContentProvider(context.extensionUri);

        // Create combined HTML that includes both chat and content generator
        panel.webview.html = getCombinedHtml(chatProvider, contentProvider);
        
        // Handle messages from both chat and content generator
        panel.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'sendMessage':
                    await chatProvider._handleChatMessage(data.text, panel.webview);
                    break;
                case 'generateContent':
                    await contentProvider._handleContentGeneration(data, panel.webview);
                    break;
            }
        });
    });

    // Add all commands to subscriptions
    context.subscriptions.push(
        createBookStructure,
        openChatSidebar,
        openBookWritingPanel
    );
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('Book Writing Assistant extension is now deactivated!');
}

/**
 * Creates combined HTML that includes both chat and content generator interfaces
 */
function getCombinedHtml(chatProvider: BookWritingChatProvider, contentProvider: BookWritingContentProvider): string {
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
            height: 100%;
            gap: 10px;
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
            text-align: left;
        }

        .panel-content {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
        }

        /* Chat styles */
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
            background: var(--vscode-textBlockQuote-background);
            border-radius: 4px;
        }

        .chat-input {
            display: flex;
            gap: 10px;
        }

        .chat-input input {
            flex: 1;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
        }

        .chat-input button {
            padding: 10px 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        /* Content generator styles */
        .form-group {
            margin-bottom: 15px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }

        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            box-sizing: border-box;
        }

        .generate-btn {
            width: 100%;
            padding: 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }

        .message {
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 4px;
        }

        .message.user {
            background: var(--vscode-input-background);
            text-align: right;
        }

        .message.assistant {
            background: var(--vscode-textBlockQuote-background);
        }

        @media (max-width: 768px) {
            .container {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Chat Panel -->
        <div class="panel">
            <div class="panel-header">💬 Chat Assistant</div>
            <div class="panel-content">
                <div class="chat-container">
                    <div class="chat-messages" id="chatMessages">
                        <div class="message assistant">
                            Hello! I'm your Book Writing Assistant. Ask me anything about creating educational content, book structure, or writing techniques.
                        </div>
                    </div>
                    <div class="chat-input">
                        <input type="text" id="chatInput" placeholder="Ask me anything about book writing..." />
                        <button onclick="sendMessage()">Send</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Content Generator Panel -->
        <div class="panel">
            <div class="panel-header">📝 Content Generator</div>
            <div class="panel-content">
                <div class="form-group">
                    <label for="contentType">Content Type</label>
                    <select id="contentType">
                        <option value="chapter_outline">📋 Chapter Outline</option>
                        <option value="lesson_content">📖 Lesson Content</option>
                        <option value="exercise">💪 Exercise</option>
                        <option value="quiz">❓ Quiz</option>
                        <option value="summary">📝 Summary</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="topic">Topic/Title</label>
                    <input type="text" id="topic" placeholder="e.g., Introduction to Machine Learning" />
                </div>
                
                <div class="form-group">
                    <label for="domain">Domain/Subject</label>
                    <input type="text" id="domain" placeholder="e.g., Programming, Business, Science" />
                </div>
                
                <div class="form-group">
                    <label for="context">Additional Context (Optional)</label>
                    <textarea id="context" rows="3" placeholder="Provide any specific requirements, target audience, learning objectives..."></textarea>
                </div>
                
                <button class="generate-btn" onclick="generateContent()">🚀 Generate Content</button>
                
                <div id="generatedContent" style="margin-top: 20px; padding: 15px; background: var(--vscode-textBlockQuote-background); border-radius: 4px; display: none;">
                    <h4>Generated Content:</h4>
                    <pre id="contentText" style="white-space: pre-wrap; margin: 0;"></pre>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function sendMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (!message) return;

            // Add user message to chat
            addChatMessage('user', message);
            input.value = '';

            // Send to extension
            vscode.postMessage({
                command: 'sendMessage',
                text: message
            });
        }

        function generateContent() {
            const contentType = document.getElementById('contentType').value;
            const topic = document.getElementById('topic').value.trim();
            const domain = document.getElementById('domain').value.trim();
            const context = document.getElementById('context').value.trim();

            if (!topic) {
                alert('Please enter a topic');
                return;
            }

            vscode.postMessage({
                command: 'generateContent',
                contentType: contentType,
                topic: topic,
                domain: domain || 'General',
                context: context
            });
        }

        function addChatMessage(sender, text) {
            const messagesDiv = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${sender}\`;
            messageDiv.textContent = text;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'addChatMessage':
                case 'replaceChatMessage':
                    addChatMessage(message.sender, message.text);
                    break;
                    
                case 'updateStatus':
                    if (message.status === 'generating') {
                        document.getElementById('generatedContent').style.display = 'block';
                        document.getElementById('contentText').textContent = message.message;
                    }
                    break;
                    
                case 'contentGenerated':
                    document.getElementById('generatedContent').style.display = 'block';
                    document.getElementById('contentText').textContent = message.content;
                    break;
            }
        });

        // Allow Enter key to send chat messages
        document.getElementById('chatInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    </script>
</body>
</html>`;
}
