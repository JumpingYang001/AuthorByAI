// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Chat Robot Class
class ChatRobotPanel {
    public static currentPanel: ChatRobotPanel | undefined;
    public static readonly viewType = 'chatRobot';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (ChatRobotPanel.currentPanel) {
            ChatRobotPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            ChatRobotPanel.viewType,
            'Chat Robot',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        ChatRobotPanel.currentPanel = new ChatRobotPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'sendMessage':
                        this._handleUserMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private async _handleUserMessage(userMessage: string) {
        try {
            // Show typing indicator
            this._panel.webview.postMessage({
                command: 'addMessage',
                sender: 'bot',
                text: '🤖 Thinking...'
            });

            // Try to get AI response using various methods
            const aiResponse = await this._getAIResponse(userMessage);
            
            // Remove thinking message and send actual response
            this._panel.webview.postMessage({
                command: 'replaceLastMessage',
                sender: 'bot',
                text: aiResponse
            });
        } catch (error) {
            console.log('AI not available, using fallback responses:', error);
            
            // Enhanced fallback responses based on user input
            const smartResponse = this._getSmartFallbackResponse(userMessage);
            
            this._panel.webview.postMessage({
                command: 'replaceLastMessage',
                sender: 'bot',
                text: smartResponse
            });
        }
    }

    private async _getAIResponse(userMessage: string): Promise<string> {
        // Method 1: Try GitHub Copilot Chat API (if available)
        try {
            await vscode.commands.executeCommand('github.copilot.generate', {
                prompt: `You are a helpful coding assistant. The user said: "${userMessage}". Respond helpfully and concisely.`
            });
        } catch (error) {
            console.log('GitHub Copilot not available:', error);
        }

        // Method 2: Use external AI API (OpenAI, Anthropic, etc.)
        // Uncomment and configure this section to use external APIs
        /*
        try {
            const response = await this._callExternalAI(userMessage);
            return response;
        } catch (error) {
            console.log('External AI API error:', error);
        }
        */

        // Method 3: Fallback to enhanced pattern matching
        throw new Error('AI services not available');
    }

    private _getSmartFallbackResponse(userMessage: string): string {
        const lowerMessage = userMessage.toLowerCase();
        
        // Code-related keywords
        if (lowerMessage.includes('code') || lowerMessage.includes('function') || 
            lowerMessage.includes('variable') || lowerMessage.includes('debug')) {
            const codeResponses = [
                "I'd be happy to help with your code! Can you share more details about what you're working on?",
                "That sounds like a coding challenge. What programming language are you using?",
                "For debugging, I recommend checking the VS Code terminal and console for error messages. What specific issue are you facing?",
                "Code organization is important! Are you looking for help with structure, syntax, or logic?"
            ];
            return codeResponses[Math.floor(Math.random() * codeResponses.length)];
        }
        
        // VS Code related keywords
        if (lowerMessage.includes('vscode') || lowerMessage.includes('extension') || 
            lowerMessage.includes('editor') || lowerMessage.includes('workspace')) {
            const vscodeResponses = [
                "VS Code is amazing! What feature or extension are you curious about?",
                "I can help with VS Code tips! Try pressing Ctrl+Shift+P to open the command palette.",
                "Extensions make VS Code powerful. Check out the Extensions marketplace for useful tools!",
                "VS Code has great debugging capabilities. Have you tried setting breakpoints in your code?"
            ];
            return vscodeResponses[Math.floor(Math.random() * vscodeResponses.length)];
        }
        
        // Question keywords
        if (lowerMessage.includes('how') || lowerMessage.includes('what') || 
            lowerMessage.includes('why') || lowerMessage.includes('?')) {
            const helpResponses = [
                "Great question! I'm here to help. Can you provide more context about what you need?",
                "I'd love to help you figure that out! What specifically are you trying to achieve?",
                "That's an interesting question. Let me know more details and I'll do my best to assist!",
                "Questions are wonderful for learning! What area would you like to explore?"
            ];
            return helpResponses[Math.floor(Math.random() * helpResponses.length)];
        }
        
        // Greeting keywords
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || 
            lowerMessage.includes('hey') || lowerMessage.includes('good')) {
            const greetingResponses = [
                "Hello! 👋 I'm your coding companion. What can I help you with today?",
                "Hi there! Ready to tackle some coding challenges together?",
                "Hey! Great to see you. What programming adventure are we going on today?",
                "Good to meet you! I'm here to help with any coding questions or VS Code tips you need."
            ];
            return greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
        }
        
        // Default responses
        const defaultResponses = [
            "That's interesting! Tell me more about what you're working on.",
            "I'm here to help! What specific challenge are you facing?",
            "Thanks for sharing! How can I assist you with your development work?",
            "I'd love to help you with that. Can you provide more details?",
            "Interesting! Are you looking for coding help, VS Code tips, or something else?"
        ];
        
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }

    // Optional: External AI API integration
    private async _callExternalAI(userMessage: string): Promise<string> {
        // Example for OpenAI API integration
        // You would need to install axios: npm install axios
        // And set up API keys securely
        
        /*
        const axios = require('axios');
        
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful coding assistant integrated into VS Code.'
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            max_tokens: 150
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.choices[0].message.content;
        */
        
        throw new Error('External AI not configured');
    }

    public dispose() {
        ChatRobotPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Robot</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            max-width: 800px;
            margin: 0 auto;
            width: 100%;
        }
        
        .chat-header {
            text-align: center;
            margin-bottom: 20px;
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
            margin-bottom: 10px;
            background: var(--vscode-editor-background);
        }
        
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 8px;
            max-width: 80%;
        }
        
        .user-message {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: auto;
            text-align: right;
        }
        
        .bot-message {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
        }
        
        .input-container {
            display: flex;
            gap: 10px;
        }
        
        .message-input {
            flex: 1;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
        }
        
        .send-button {
            padding: 10px 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-family: inherit;
        }
        
        .send-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h2>🤖 Chat Robot</h2>
            <p>Welcome! I'm here to chat with you. Type a message below to get started.</p>
        </div>
        
        <div class="chat-messages" id="chatMessages">
            <div class="message bot-message">
                <strong>Bot:</strong> Hello! I'm your friendly chat robot. How can I help you today?
            </div>
        </div>
        
        <div class="input-container">
            <input type="text" id="messageInput" class="message-input" placeholder="Type your message here..." />
            <button id="sendButton" class="send-button">Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesContainer = document.getElementById('chatMessages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');

        function addMessage(sender, text) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${sender}-message\`;
            messageDiv.innerHTML = \`<strong>\${sender.charAt(0).toUpperCase() + sender.slice(1)}:</strong> \${text}\`;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function sendMessage() {
            const text = messageInput.value.trim();
            if (text) {
                addMessage('user', text);
                vscode.postMessage({
                    command: 'sendMessage',
                    text: text
                });
                messageInput.value = '';
            }
        }

        sendButton.addEventListener('click', sendMessage);
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'addMessage') {
                addMessage(message.sender, message.text);
            } else if (message.command === 'replaceLastMessage') {
                // Replace the last bot message (for updating "thinking..." to actual response)
                const messages = messagesContainer.querySelectorAll('.bot-message');
                if (messages.length > 0) {
                    const lastBotMessage = messages[messages.length - 1];
                    lastBotMessage.innerHTML = \`<strong>Bot:</strong> \${message.text}\`;
                }
            }
        });

        // Focus on input when panel opens
        messageInput.focus();
    </script>
</body>
</html>`;
    }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "Chat Robot" is now active!');

	// Register command to open chat robot
	const chatCommand = vscode.commands.registerCommand('Author-AI-Assistant.openChat', () => {
		ChatRobotPanel.createOrShow(context.extensionUri);
	});

	// Register the old hello world command for backwards compatibility
	const helloCommand = vscode.commands.registerCommand('Author-AI-Assistant.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Chat Robot! Use "Open Chat Robot" to start chatting.');
	});

	context.subscriptions.push(chatCommand, helloCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
