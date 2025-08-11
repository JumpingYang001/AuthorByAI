import * as vscode from 'vscode';
import * as path from 'path';
import { SessionContextManager } from '../sessionManager';
import { AIService } from '../aiService';
import { TemplateService } from '../templateService';
import { PromptBuilder } from '../promptBuilder';
import { ContentType } from '../types';

/**
 * Main Book Writing Panel Provider
 */
export class BookWritingPanel {
    public static currentPanel: BookWritingPanel | undefined;
    public currentContent: string = '';
    
    public readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _contextManager = SessionContextManager.getInstance();
    private _aiService = AIService.getInstance();
    private _templateService = new TemplateService();

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (BookWritingPanel.currentPanel) {
            BookWritingPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'bookWritingPanel',
            'Book Writing Assistant',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ]
            }
        );

        BookWritingPanel.currentPanel = new BookWritingPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();
        
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'generateContent':
                        await this._handleContentGeneration(message);
                        break;
                    case 'saveContent':
                        await this._saveContentToFile(message.content, message.filename);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private async _handleContentGeneration(request: any): Promise<void> {
        try {
            this._panel.webview.postMessage({
                command: 'updateStatus',
                status: 'generating',
                message: `🤖 Generating ${request.contentType}...`
            });

            let content: string;
            let contentSource: string = 'template';
            
            // First, try to use AI service
            try {
                const contextSummary = this._contextManager.getContextSummary();
                const aiPrompt = PromptBuilder.buildContentGenerationPrompt(request, contextSummary);
                
                const aiResponse = await this._aiService.getResponse(aiPrompt, 'content');
                content = aiResponse.content;
                contentSource = aiResponse.source;
                
                this._contextManager.addToContext('content_generation', `Generated ${request.contentType} for topic: "${request.topic}" using ${contentSource}`);
                
            } catch (aiError) {
                console.log('AI service unavailable, using template fallback:', aiError);
                
                // Fallback to template service
                content = this._templateService.generateTemplate(request.contentType, {
                    topic: request.topic,
                    context: request.context || '',
                    domain: request.domain || 'General'
                });
                
                this._contextManager.addToContext('content_generation', `Generated ${request.contentType} for topic: "${request.topic}" using template fallback`);
            }

            this.currentContent = content;
            
            this._contextManager.addToContext('content_generation', `Generated ${request.contentType} for topic: "${request.topic}"`);
            
            this._contextManager.setCurrentProject({
                mainTopic: request.topic,
                domain: request.domain || 'General',
                lastActivity: new Date()
            });

            this._panel.webview.postMessage({
                command: 'contentGenerated',
                content: content,
                contentType: request.contentType,
                status: 'success'
            });

        } catch (error) {
            console.error('Content generation failed:', error);
            
            this._panel.webview.postMessage({
                command: 'updateStatus',
                status: 'error',
                message: `❌ Failed to generate content: ${error}`
            });
        }
    }

    private async _saveContentToFile(content: string, filename: string): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
                return;
            }

            const sanitizedFilename = filename.replace(/[<>:"/\\|?*]/g, '-');
            const finalFilename = sanitizedFilename.endsWith('.md') ? sanitizedFilename : `${sanitizedFilename}.md`;
            const filePath = path.join(workspaceFolder.uri.fsPath, finalFilename);

            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(filePath),
                Buffer.from(content, 'utf8')
            );

            vscode.window.showInformationMessage(`File saved: ${finalFilename}`);
            
            this._panel.webview.postMessage({
                command: 'fileSaved',
                filename: finalFilename,
                path: filePath
            });

        } catch (error) {
            console.error('Error saving file:', error);
            vscode.window.showErrorMessage(`Failed to save file: ${error}`);
        }
    }

    public dispose() {
        BookWritingPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public setGeneratedContent(content: string, request: any) {
        this.currentContent = content;
        
        // Update the webview with the generated content
        this._panel.webview.postMessage({
            command: 'contentGenerated',
            content: content,
            contentType: request.contentType,
            status: 'success'
        });

        // Also populate the form fields with the request data
        this._panel.webview.postMessage({
            command: 'populateForm',
            contentType: request.contentType,
            topic: request.topic,
            domain: request.domain,
            context: request.context || ''
        });
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
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
            padding: 20px;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: var(--vscode-textBlockQuote-background);
            border-radius: 8px;
            border-left: 4px solid var(--vscode-textLink-foreground);
        }

        .header h1 {
            margin: 0 0 10px 0;
            color: var(--vscode-textLink-foreground);
        }

        .form-container {
            background: var(--vscode-sideBar-background);
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 25px;
            border: 1px solid var(--vscode-panel-border);
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        label {
            font-weight: bold;
            color: var(--vscode-foreground);
        }

        input, select, textarea {
            padding: 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
        }

        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        textarea {
            resize: vertical;
            min-height: 100px;
        }

        .generate-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 15px 30px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            width: 100%;
            margin-top: 10px;
        }

        .generate-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .generate-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .content-display {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-top: 25px;
            min-height: 400px;
        }

        .content-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .content-header h3 {
            margin: 0;
            color: var(--vscode-textLink-foreground);
        }

        .save-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }

        .save-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .save-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .content-text {
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.6;
        }

        .status-message {
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
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

        .quick-templates {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }

        .template-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 15px;
            border-radius: 4px;
            cursor: pointer;
            text-align: center;
            font-size: 14px;
        }

        .template-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .hidden {
            display: none;
        }

        @media (max-width: 768px) {
            .form-row {
                grid-template-columns: 1fr;
            }
            
            .quick-templates {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 Book Writing Assistant</h1>
            <p>Generate professional educational content with AI-powered assistance</p>
        </div>

        <div class="quick-templates">
            <button class="template-btn" onclick="quickFill('chapter_outline', 'JavaScript Fundamentals', 'Programming')">
                📋 JS Chapter Outline
            </button>
            <button class="template-btn" onclick="quickFill('lesson_content', 'Object-Oriented Programming', 'Programming')">
                📖 OOP Lesson
            </button>
            <button class="template-btn" onclick="quickFill('exercise', 'Leadership Skills', 'Business')">
                💪 Leadership Exercise
            </button>
            <button class="template-btn" onclick="quickFill('quiz', 'Data Science Basics', 'Analytics')">
                ❓ Data Science Quiz
            </button>
        </div>

        <div class="form-container">
            <div class="form-row">
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
                    <label for="domain">Domain/Subject</label>
                    <input type="text" id="domain" placeholder="e.g., Programming, Business, Science" />
                </div>
            </div>
            
            <div class="form-group full-width">
                <label for="topic">Topic/Title</label>
                <input type="text" id="topic" placeholder="e.g., Introduction to Machine Learning" />
            </div>
            
            <div class="form-group full-width">
                <label for="context">Additional Context (Optional)</label>
                <textarea id="context" placeholder="Provide any specific requirements, target audience, learning objectives, or additional context..."></textarea>
            </div>
            
            <button class="generate-btn" id="generateBtn" onclick="generateContent()">
                🚀 Generate Content
            </button>
        </div>

        <div id="statusMessage" class="hidden"></div>

        <div class="content-display" id="contentDisplay">
            <div class="content-header">
                <h3>Generated Content</h3>
                <button class="save-btn" id="saveBtn" onclick="saveContent()" disabled>
                    💾 Save to File
                </button>
            </div>
            <div class="content-text" id="contentText">
                Click "Generate Content" to create professional educational materials...
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentContent = '';

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

        function quickFill(contentType, topic, domain) {
            document.getElementById('contentType').value = contentType;
            document.getElementById('topic').value = topic;
            document.getElementById('domain').value = domain;
        }

        function saveContent() {
            if (!currentContent) {
                showStatus('error', '❌ No content to save');
                return;
            }

            const topic = document.getElementById('topic').value.trim();
            const contentType = document.getElementById('contentType').value;
            
            const filename = \`\${topic}_\${contentType}_\${new Date().toISOString().slice(0, 10)}.md\`;

            vscode.postMessage({
                command: 'saveContent',
                content: currentContent,
                filename: filename
            });
        }

        function showStatus(status, message) {
            const statusDiv = document.getElementById('statusMessage');
            statusDiv.className = \`status-message status-\${status}\`;
            statusDiv.textContent = message;
            statusDiv.classList.remove('hidden');
            
            if (status === 'success' || status === 'error') {
                setTimeout(() => {
                    statusDiv.classList.add('hidden');
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
                    currentContent = message.content;
                    document.getElementById('contentText').textContent = message.content;
                    document.getElementById('saveBtn').disabled = false;
                    resetGenerateButton();
                    showStatus('success', '✅ Content generated successfully!');
                    break;
                    
                case 'populateForm':
                    // Populate the form fields with the data from content generator
                    document.getElementById('contentType').value = message.contentType;
                    document.getElementById('topic').value = message.topic;
                    document.getElementById('domain').value = message.domain;
                    document.getElementById('context').value = message.context;
                    break;
                    
                case 'updateContent':
                    if (message.source === 'chat') {
                        currentContent = message.content;
                        document.getElementById('contentText').textContent = message.content;
                        showStatus('success', '🔄 Content updated from chat!');
                    }
                    break;
                    
                case 'fileSaved':
                    showStatus('success', \`💾 File saved: \${message.filename}\`);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
