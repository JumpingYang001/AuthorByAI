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
import { BookWritingPanel } from './providers/mainPanel';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Book Writing Assistant extension is now active!');

    // Register sidebar chat provider
    const chatProvider = new BookWritingChatProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(BookWritingChatProvider.viewType, chatProvider)
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

        // Create instances of chat provider 
        const chatProvider = new BookWritingChatProvider(context.extensionUri);

        // Create combined HTML that includes both chat and main panel functionality
        panel.webview.html = getCombinedHtml(chatProvider);
        
        // Handle messages from chat
        panel.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'sendMessage':
                    await chatProvider._handleChatMessage(data.text, panel.webview);
                    break;
                case 'openContentGenerator':
                    // Open the main content generator panel
                    BookWritingPanel.createOrShow(context.extensionUri);
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
 * Creates combined HTML with chat interface and button to open main content generator panel
 */
function getCombinedHtml(chatProvider: BookWritingChatProvider): string {
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

        /* Chat styles - improved to match sidebar quality */
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

        /* Message styles - improved to match sidebar quality */
        .message {
            margin-bottom: 12px;
            padding: 8px;
            border-radius: 6px;
            font-size: 13px;
            line-height: 1.4;
        }

        .message.user {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 10px;
        }

        .message.assistant {
            background: var(--vscode-textBlockQuote-background);
            margin-right: 10px;
            border-left: 3px solid var(--vscode-textLink-foreground);
            padding-left: 10px;
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
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Chat Panel -->
        <div class="panel">
            <div class="panel-header">
                <span>💬 Writing Chat Assistant</span>
                <button class="open-generator-btn" onclick="openContentGenerator()">📝 Open Generator</button>
            </div>
            <div class="panel-content">
                <div class="chat-container">
                    <div class="chat-messages" id="chatMessages">
                        <div class="welcome-message">
                            👋 Hi! I'm your Book Writing Assistant. Ask me anything about creating educational content, book structure, or writing techniques. Use the "Open Generator" button to create specific content types.
                        </div>
                    </div>
                    <div class="chat-input">
                        <input type="text" id="chatInput" placeholder="Ask me anything about book writing..." />
                        <button onclick="sendMessage()">Send</button>
                    </div>
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

        function openContentGenerator() {
            vscode.postMessage({
                command: 'openContentGenerator'
            });
        }

        function addChatMessage(sender, text) {
            const messagesDiv = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${sender}\`;
            messageDiv.innerHTML = \`<strong>\${sender.charAt(0).toUpperCase() + sender.slice(1)}:</strong> \${text}\`;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'addChatMessage':
                    addChatMessage(message.sender, message.text);
                    break;
                case 'replaceChatMessage':
                    const messages = document.querySelectorAll('.message.assistant');
                    if (messages.length > 0) {
                        const lastMessage = messages[messages.length - 1];
                        lastMessage.innerHTML = \`<strong>Assistant:</strong> \${message.text}\`;
                    }
                    break;
            }
        });

        // Allow Enter key to send chat messages
        document.getElementById('chatInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    </script>
</body>
</html>`;
}
