import * as vscode from 'vscode';
import { SessionContextManager } from '../sessionManager';
import { TemplateService } from '../templateService';
import { AIService } from '../aiService';
import { PromptBuilder } from '../promptBuilder';
import { Activity, ContentRequest, ContentType } from '../types';
import { BookWritingPanel } from './mainPanel';

/**
 * Content Generator Provider for VS Code
 */
export class BookWritingContentProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'bookWritingContent';
    
    private _view?: vscode.WebviewView;
    private _contextManager = SessionContextManager.getInstance();
    private _templateService = TemplateService.getInstance();
    private _aiService = AIService.getInstance();
    private _extensionUri: vscode.Uri;

    constructor(private readonly extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
    }

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

        webviewView.webview.html = this._getContentGeneratorHtml();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'generateContent':
                    await this._handleContentGeneration(data);
                    break;
            }
        });
    }

    public async _handleContentGeneration(request: ContentRequest, webview?: vscode.Webview): Promise<void> {
        const targetWebview = webview || this._view?.webview;
        if (!targetWebview) {
            return;
        }

        try {
            targetWebview.postMessage({
                command: 'updateStatus',
                status: 'generating',
                message: `🤖 Generating ${request.contentType}...`
            });

            let content: string;
            let contentSource: string = 'template';
            let activity: Activity = {
                action: 'content_generation',
                type: 'content_generation',
                timestamp: new Date(),
                details: `Generated ${request.contentType} for topic: "${request.topic}"`
            };

            // First, try to use AI service
            try {
                const contextSummary = this._contextManager.getContextSummary();
                const aiPrompt = PromptBuilder.buildContentGenerationPrompt(request, contextSummary);
                
                const aiResponse = await this._aiService.getResponse(aiPrompt, 'content');
                content = aiResponse.content;
                contentSource = aiResponse.source;
                
                activity.details += ` using ${contentSource}`;
                
            } catch (aiError) {
                console.log('AI service unavailable, using template fallback:', aiError);
                
                // Fallback to template service
                content = this._templateService.generateTemplate(request.contentType, {
                    topic: request.topic,
                    context: request.context || '',
                    domain: request.domain || 'General'
                });
                
                activity.details += ` (Template used - AI unavailable)`;
            }

            this._contextManager.addToContext('content_generation', activity.details);
            
            this._contextManager.setCurrentProject({
                mainTopic: request.topic,
                domain: request.domain || 'General',
                lastActivity: new Date()
            });

            // Open the main panel and send the generated content to it
            BookWritingPanel.createOrShow(this._extensionUri);
            
            // Give the panel a moment to initialize, then send the content
            setTimeout(() => {
                if (BookWritingPanel.currentPanel) {
                    // Enhanced content with suggested file location for book projects
                    const enhancedRequest = this._enhanceRequestWithBookContext(request);
                    BookWritingPanel.currentPanel.setGeneratedContent(content, enhancedRequest);
                }
            }, 100);

            targetWebview.postMessage({
                command: 'contentGenerated',
                content: content,
                contentType: request.contentType,
                status: 'success'
            });

        } catch (error) {
            console.error('Content generation failed:', error);
            
            targetWebview.postMessage({
                command: 'updateStatus',
                status: 'error',
                message: `❌ Failed to generate content: ${error}`
            });
        }
    }

    /**
     * Enhances content request with book project context and suggested file locations
     */
    private _enhanceRequestWithBookContext(request: ContentRequest): ContentRequest {
        const hasBookStructure = this._contextManager.getRecentContext('file_creation')
            .some(activity => activity.details.includes('Created book structure'));
        
        if (hasBookStructure) {
            // Suggest appropriate folder and filename based on content type
            const folderMap: Record<string, string> = {
                'chapter_outline': 'chapters',
                'lesson_content': 'chapters',
                'exercise': 'exercises',
                'quiz': 'quizzes',
                'summary': 'summaries'
            };
            
            const suggestedFolder = folderMap[request.contentType] || '';
            const sanitizedTopic = request.topic.replace(/[<>:"/\\|?*]/g, '-').toLowerCase();
            const suggestedFilename = `${sanitizedTopic}.md`;
            
            return {
                ...request,
                suggestedFolder,
                suggestedFilename,
                bookProjectMode: true
            };
        }
        
        return request;
    }

    public _getContentGeneratorHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Generator</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
            margin: 0;
            padding: 15px;
        }
        
        .generator-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .header {
            text-align: center;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .header h3 {
            margin: 0;
            color: var(--vscode-foreground);
            font-size: 16px;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .form-group label {
            font-weight: bold;
            font-size: 13px;
            color: var(--vscode-foreground);
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: 13px;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 60px;
        }
        
        .form-group select {
            cursor: pointer;
        }
        
        .generate-btn {
            padding: 12px 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-size: 14px;
            font-weight: bold;
            margin-top: 10px;
        }
        
        .generate-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .generate-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .status-message {
            padding: 10px;
            border-radius: 4px;
            text-align: center;
            font-size: 13px;
            margin-top: 10px;
        }
        
        .status-generating {
            background: var(--vscode-textPreformat-background);
            color: var(--vscode-foreground);
            border: 1px solid var(--vscode-panel-border);
        }
        
        .status-success {
            background: var(--vscode-testing-iconPassed);
            color: white;
        }
        
        .status-error {
            background: var(--vscode-errorBackground);
            color: var(--vscode-errorForeground);
        }
        
        .quick-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 15px;
        }
        
        .quick-btn {
            padding: 8px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            text-align: center;
        }
        
        .quick-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .help-text {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="generator-container">
        <div class="header">
            <h3>📚 Content Generator</h3>
        </div>
        
        <div class="form-group">
            <label for="contentType">Content Type:</label>
            <select id="contentType">
                <option value="chapter_outline">📋 Chapter Outline</option>
                <option value="lesson_content">📖 Lesson Content</option>
                <option value="exercise">💪 Exercise</option>
                <option value="quiz">❓ Quiz</option>
                <option value="summary">📝 Summary</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="topic">Topic/Title:</label>
            <input type="text" id="topic" placeholder="e.g., JavaScript Fundamentals" />
            <div class="help-text">Main topic or title for your content</div>
        </div>
        
        <div class="form-group">
            <label for="domain">Domain/Subject:</label>
            <input type="text" id="domain" placeholder="e.g., Programming, Business, Science" />
            <div class="help-text">Subject area or domain</div>
        </div>
        
        <div class="form-group">
            <label for="context">Additional Context (Optional):</label>
            <textarea id="context" placeholder="Any specific requirements, audience, or context..."></textarea>
            <div class="help-text">Provide any specific requirements or context</div>
        </div>
        
        <button class="generate-btn" id="generateBtn" onclick="generateContent()">
            🚀 Generate Content
        </button>
        
        <div class="quick-actions">
            <button class="quick-btn" onclick="quickFill('JavaScript', 'Programming')">JS Tutorial</button>
            <button class="quick-btn" onclick="quickFill('Leadership', 'Business')">Leadership</button>
            <button class="quick-btn" onclick="quickFill('Data Science', 'Analytics')">Data Science</button>
            <button class="quick-btn" onclick="quickFill('Digital Marketing', 'Marketing')">Marketing</button>
        </div>
        
        <div id="statusMessage" style="display: none;"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function generateContent() {
            const contentType = document.getElementById('contentType').value;
            const topic = document.getElementById('topic').value.trim();
            const domain = document.getElementById('domain').value.trim();
            const context = document.getElementById('context').value.trim();

            if (!topic) {
                showStatus('error', '❌ Please enter a topic');
                return;
            }

            const generateBtn = document.getElementById('generateBtn');
            generateBtn.disabled = true;
            generateBtn.textContent = '⏳ Generating...';

            vscode.postMessage({
                command: 'generateContent',
                contentType: contentType,
                topic: topic,
                domain: domain || 'General',
                context: context
            });
        }

        function quickFill(topic, domain) {
            document.getElementById('topic').value = topic;
            document.getElementById('domain').value = domain;
        }

        function showStatus(status, message) {
            const statusDiv = document.getElementById('statusMessage');
            statusDiv.className = \`status-message status-\${status}\`;
            statusDiv.textContent = message;
            statusDiv.style.display = 'block';
            
            if (status === 'success' || status === 'error') {
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 3000);
            }
        }

        function resetGenerateButton() {
            const generateBtn = document.getElementById('generateBtn');
            generateBtn.disabled = false;
            generateBtn.textContent = '🚀 Generate Content';
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updateStatus':
                    showStatus(message.status, message.message);
                    if (message.status === 'error') {
                        resetGenerateButton();
                    }
                    break;
                    
                case 'contentGenerated':
                    resetGenerateButton();
                    showStatus('success', '✅ Content generated! Opening main panel...');
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
