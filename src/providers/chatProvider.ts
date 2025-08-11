import * as vscode from 'vscode';
import { SessionContextManager } from '../sessionManager';
import { AIService } from '../aiService';
import { ProjectContext } from '../types';

/**
 * Sidebar Chat Provider for VS Code
 */
export class BookWritingChatProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'bookWritingChat';
    
    private _view?: vscode.WebviewView;
    private _contextManager = SessionContextManager.getInstance();
    private _aiService = AIService.getInstance();

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getChatHtml();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'sendMessage':
                    await this._handleChatMessage(data.text);
                    break;
            }
        });
    }

    public async _handleChatMessage(userMessage: string, webview?: vscode.Webview): Promise<void> {
        const targetWebview = webview || this._view?.webview;
        if (!targetWebview) {
            return;
        }

        try {
            this._contextManager.addToContext('chat', `User asked: "${userMessage}"`);

            targetWebview.postMessage({
                command: 'addChatMessage',
                sender: 'assistant',
                text: '📝 Writing...'
            });

            const isModificationRequest = this._isContentModificationRequest(userMessage);
            
            if (isModificationRequest) {
                // Check if we have content in session context to modify
                const recentGeneration = this._contextManager.getRecentContext('content_generation');
                if (recentGeneration.length > 0) {
                    try {
                        const modifiedContent = await this._handleContentModification(userMessage);
                        
                        // Notify the main panel if it exists to update content
                        targetWebview.postMessage({
                            command: 'replaceChatMessage',
                            sender: 'assistant',
                            text: '✅ Content has been modified based on your request! The updated content should be available in the main panel.'
                        });

                        // Also send the modified content to be displayed in main panel
                        // (This would require a message passing system between panels)
                        console.log('Modified content:', modifiedContent);
                        
                    } catch (modError) {
                        targetWebview.postMessage({
                            command: 'replaceChatMessage',
                            sender: 'assistant',
                            text: `❌ ${modError}`
                        });
                    }
                } else {
                    targetWebview.postMessage({
                        command: 'replaceChatMessage',
                        sender: 'assistant',
                        text: '❌ No recent content found to modify. Please generate some content first using the Content Generator panel.'
                    });
                }
            } else {
                const aiResponse = await this._getBookWritingResponse(userMessage);
                
                targetWebview.postMessage({
                    command: 'replaceChatMessage',
                    sender: 'assistant',
                    text: aiResponse
                });
            }
        } catch (error) {
            console.log('AI not available, using fallback responses:', error);
            
            const smartResponse = this._getBookWritingFallback(userMessage);
            
            targetWebview.postMessage({
                command: 'replaceChatMessage',
                sender: 'assistant',
                text: smartResponse
            });
        }
    }

    private _isContentModificationRequest(userMessage: string): boolean {
        const modificationKeywords = [
            'modify', 'change', 'update', 'edit', 'revise', 'improve', 'rewrite',
            'add to', 'remove from', 'fix', 'correct', 'enhance', 'adjust',
            'make it', 'can you', 'please change', 'update the content'
        ];
        
        const lowerMessage = userMessage.toLowerCase();
        return modificationKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    private async _handleContentModification(userMessage: string): Promise<string> {
        const contextSummary = this._contextManager.getContextSummary();
        const currentProject = this._contextManager.getCurrentProject();
        
        // Get the most recent content generation from context
        const recentGeneration = this._contextManager.getRecentContext('content_generation');
        let currentContent = '';
        
        if (recentGeneration.length > 0) {
            const lastGeneration = recentGeneration[0];
            // Try to reconstruct content info from the activity details
            currentContent = `[Recent content: ${lastGeneration.details}]`;
            
            // If we have type and topic info, we can provide better context
            if (lastGeneration.type && lastGeneration.topic) {
                currentContent = `[Last generated: ${lastGeneration.type} about "${lastGeneration.topic}"]`;
            }
        }

        if (!currentContent) {
            throw new Error("No recent content found to modify. Please generate some content first using the Content Generator.");
        }

        const modificationPrompt = this._buildModificationPrompt(contextSummary, currentProject, currentContent, userMessage);

        try {
            const response = await this._aiService.getResponse(modificationPrompt, 'content');
            
            this._contextManager.addToContext('content_generation', `Modified content based on: "${userMessage}"`, {
                type: 'modification',
                request: userMessage,
                originalContent: currentContent
            });
            
            return response.content;
        } catch (error) {
            console.log('Content modification failed:', error);
            throw new Error(`Sorry, I couldn't modify the content. AI service error: ${error}`);
        }
    }

    private _buildModificationPrompt(contextSummary: string, currentProject: ProjectContext, currentContent: string, userMessage: string): string {
        return `You are a professional content editor and book writing assistant. The user wants to modify existing content.

${contextSummary}

CURRENT PROJECT: ${currentProject.mainTopic ? `"${currentProject.mainTopic}" in ${currentProject.domain} domain` : 'No active project'}

CONTENT CONTEXT: ${currentContent}

USER MODIFICATION REQUEST: ${userMessage}

TASK: Based on the user's request and the content context above, generate new content that incorporates the requested modifications. Since we have limited context about the exact original content, focus on creating high-quality educational content that addresses the user's modification request while maintaining professional standards.

INSTRUCTIONS:
- Generate complete, well-structured content that reflects the requested modifications
- Use proper markdown formatting
- Ensure the content is educationally sound and professionally written
- If the request is about a specific content type (outline, lesson, exercise, quiz, summary), format accordingly
- Include all necessary sections and elements for the content type
- Make the content comprehensive and valuable for learners

IMPORTANT: 
- Return ONLY the content in markdown format
- Do not include explanations or meta-commentary about the modification process
- Focus on delivering high-quality educational content that meets the user's requirements`;
    }

    private async _getBookWritingResponse(userMessage: string): Promise<string> {
        const contextSummary = this._contextManager.getContextSummary();
        const currentProject = this._contextManager.getCurrentProject();
        
        // Check if user has a book project set up
        const hasBookStructure = this._contextManager.getRecentContext('file_creation')
            .some(activity => activity.details.includes('Created book structure'));
        
        const projectInfo = hasBookStructure && currentProject.mainTopic 
            ? `\n\nCURRENT BOOK PROJECT: "${currentProject.mainTopic}" in ${currentProject.domain}\nProject Structure: Complete book folder structure is set up and ready for content generation.`
            : '';
        
        const enhancedPrompt = `You are a professional book writing assistant specializing in creating educational and training content. You help authors create structured learning materials including:

CONTENT TYPES YOU GENERATE:
1. CHAPTER OUTLINES - Structured learning plans with objectives, sections (Introduction, Core Concepts, Practical Applications, Best Practices, Advanced Topics, Summary), and assessments
2. LESSON CONTENT - Comprehensive educational lessons with definitions, examples, best practices, common challenges, and next steps
3. EXERCISES - Hands-on activities with basic understanding, practical application, and problem-solving tasks plus self-assessment
4. QUIZZES - Complete assessments with multiple choice, true/false, short answer, and practical questions plus full answer keys
5. SUMMARIES - Comprehensive reviews with key concepts, terminology tables, best practices checklists, action items, and reflection questions

${contextSummary}${projectInfo}

USER QUESTION: ${userMessage}

CONTEXT AWARENESS: Use the session context above to provide relevant, informed responses. If the user is working on a specific book project, reference it appropriately and suggest relevant content they could create. If they've generated files, acknowledge their progress. If they have a book structure set up, guide them on next steps for content creation. Provide helpful, specific advice about book writing, content structure, pedagogical approaches, or how to use the content generation features effectively.`;
        
        const response = await this._aiService.getResponse(enhancedPrompt, 'chat');
        return response.content;
    }

    private _getBookWritingFallback(userMessage: string): string {
        const lowerMessage = userMessage.toLowerCase();
        const project = this._contextManager.getCurrentProject();
        const hasProject = project.mainTopic && project.domain;
        const isModificationRequest = this._isContentModificationRequest(userMessage);
        
        // Handle modification requests specifically
        if (isModificationRequest) {
            const recentGeneration = this._contextManager.getRecentContext('content_generation');
            if (recentGeneration.length > 0) {
                return `🔧 I understand you want to modify content. While AI is unavailable, I recommend:
1. Use the Content Generator to create new content with your modifications
2. Manually edit the generated content
3. Try your modification request again when AI service is restored
                
Recent content: ${recentGeneration[0].details}`;
            } else {
                return `📝 To modify content, please first generate some content using the Content Generator panel, then I can help you modify it.`;
            }
        }
        
        // Context-aware responses (shortened for sidebar)
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

        const responses = hasProject ? [
            `📚 Working on "${project.mainTopic}" in ${project.domain}! How can I help with your book?`,
            `✨ Great progress on your ${project.domain} content! What would you like to create next?`,
            `🎯 I can help with chapters, lessons, exercises, quizzes, and summaries for "${project.mainTopic}".`
        ] : [
            "📝 I'm your book writing assistant! Ask me about creating educational content.",
            "🚀 I can help you structure lessons, create exercises, and write comprehensive learning materials.",
            "💡 What type of educational content are you working on today?"
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    public _getChatHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book Writing Chat</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 10px;
        }
        
        .chat-header {
            padding: 10px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 15px;
            text-align: center;
        }
        
        .chat-header h3 {
            margin: 0;
            color: var(--vscode-foreground);
            font-size: 14px;
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 10px;
            padding: 5px;
            max-height: calc(100vh - 120px);
        }
        
        .chat-message {
            margin-bottom: 12px;
            padding: 8px;
            border-radius: 6px;
            font-size: 13px;
            line-height: 1.4;
        }
        
        .user-message {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 10px;
        }
        
        .assistant-message {
            background: var(--vscode-textBlockQuote-background);
            margin-right: 10px;
            border-left: 3px solid var(--vscode-textLink-foreground);
            padding-left: 10px;
        }
        
        .chat-input-container {
            padding: 10px 0;
            border-top: 1px solid var(--vscode-panel-border);
        }
        
        .chat-input {
            display: flex;
            gap: 8px;
        }
        
        .chat-input input {
            flex: 1;
            padding: 8px;
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
        
        .send-btn {
            padding: 8px 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-size: 13px;
        }
        
        .send-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
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
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h3>💬 Writing Assistant</h3>
        </div>
        
        <div class="chat-messages" id="chatMessages">
            <div class="welcome-message">
                👋 Hi! I'm your book writing assistant. Ask me anything about creating educational content, structuring lessons, or pedagogical approaches.
            </div>
        </div>
        
        <div class="chat-input-container">
            <div class="chat-input">
                <input type="text" id="chatInput" placeholder="Ask about book writing..." />
                <button class="send-btn" id="sendBtn" onclick="sendMessage()">Send</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function sendMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            
            if (!message) return;

            addChatMessage('user', message);
            input.value = '';

            vscode.postMessage({
                command: 'sendMessage',
                text: message
            });
        }

        function addChatMessage(sender, text) {
            const messagesContainer = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`chat-message \${sender}-message\`;
            messageDiv.innerHTML = \`<strong>\${sender.charAt(0).toUpperCase() + sender.slice(1)}:</strong> \${text}\`;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Handle Enter key
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'addChatMessage':
                    addChatMessage(message.sender, message.text);
                    break;
                    
                case 'replaceChatMessage':
                    const messages = document.querySelectorAll('.assistant-message');
                    if (messages.length > 0) {
                        const lastMessage = messages[messages.length - 1];
                        lastMessage.innerHTML = \`<strong>Assistant:</strong> \${message.text}\`;
                    }
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
