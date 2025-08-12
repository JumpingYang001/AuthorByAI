import * as vscode from 'vscode';

/**
 * Model Configuration Provider for VS Code Sidebar
 */
export class ModelConfigProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'bookWritingConfig';
    
    private _view?: vscode.WebviewView;

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

        webviewView.webview.html = this._getConfigHtml();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'saveConfig':
                    await this._saveConfiguration(data.config);
                    break;
                case 'testConnection':
                    await this._testAIConnection();
                    break;
                case 'resetConfig':
                    await this._resetConfiguration();
                    break;
                case 'loadConfig':
                    await this._loadConfiguration();
                    break;
            }
        });

        // Load current configuration when view is created
        this._loadConfiguration();
    }

    private async _saveConfiguration(config: any): Promise<void> {
        try {
            // Save configuration to VS Code settings
            const workspaceConfig = vscode.workspace.getConfiguration('bookWritingAssistant');
            
            if (config.aiProvider) {
                await workspaceConfig.update('aiProvider', config.aiProvider, vscode.ConfigurationTarget.Workspace);
            }
            
            // Only save API key if not using local provider
            if (config.aiProvider !== 'local' && config.apiKey) {
                await workspaceConfig.update('apiKey', config.apiKey, vscode.ConfigurationTarget.Workspace);
            } else if (config.aiProvider === 'local') {
                // Clear API key for local provider
                await workspaceConfig.update('apiKey', '', vscode.ConfigurationTarget.Workspace);
            }
            
            if (config.model) {
                await workspaceConfig.update('model', config.model, vscode.ConfigurationTarget.Workspace);
            }
            
            if (config.temperature !== undefined) {
                await workspaceConfig.update('temperature', parseFloat(config.temperature), vscode.ConfigurationTarget.Workspace);
            }
            
            if (config.maxTokens !== undefined) {
                await workspaceConfig.update('maxTokens', parseInt(config.maxTokens), vscode.ConfigurationTarget.Workspace);
            }

            // Show success message
            this._view?.webview.postMessage({
                command: 'showMessage',
                type: 'success',
                message: '✅ Configuration saved successfully!'
            });

        } catch (error) {
            this._view?.webview.postMessage({
                command: 'showMessage',
                type: 'error',
                message: `❌ Error saving configuration: ${error}`
            });
        }
    }

    private async _loadConfiguration(): Promise<void> {
        try {
            const workspaceConfig = vscode.workspace.getConfiguration('bookWritingAssistant');
            
            const config = {
                aiProvider: workspaceConfig.get('aiProvider', 'openai'),
                apiKey: workspaceConfig.get('apiKey', ''),
                model: workspaceConfig.get('model', 'gpt-3.5-turbo'),
                temperature: workspaceConfig.get('temperature', 0.7),
                maxTokens: workspaceConfig.get('maxTokens', 2000)
            };

            this._view?.webview.postMessage({
                command: 'loadConfig',
                config: config
            });

        } catch (error) {
            this._view?.webview.postMessage({
                command: 'showMessage',
                type: 'error',
                message: `❌ Error loading configuration: ${error}`
            });
        }
    }

    private async _testAIConnection(): Promise<void> {
        try {
            this._view?.webview.postMessage({
                command: 'showMessage',
                type: 'info',
                message: '🔄 Testing AI connection...'
            });

            const workspaceConfig = vscode.workspace.getConfiguration('bookWritingAssistant');
            const aiProvider = workspaceConfig.get<string>('aiProvider', 'openai');
            const apiKey = workspaceConfig.get<string>('apiKey', '');
            const model = workspaceConfig.get<string>('model', '');
            
            // Local AI doesn't need API key
            if (aiProvider !== 'local' && !apiKey) {
                this._view?.webview.postMessage({
                    command: 'showMessage',
                    type: 'error',
                    message: '❌ No API key configured. Please add your API key first.'
                });
                return;
            }

            // Test the specific AI provider with a simple request
            let testResult = '';
            
            switch (aiProvider) {
                case 'openai':
                    testResult = await this._testOpenAI(apiKey, model);
                    break;
                case 'anthropic':
                    testResult = await this._testClaude(apiKey, model);
                    break;
                case 'google':
                    testResult = await this._testGemini(apiKey, model);
                    break;
                case 'local':
                    testResult = await this._testLocalAI(model);
                    break;
                default:
                    throw new Error(`Unknown AI provider: ${aiProvider}`);
            }

            this._view?.webview.postMessage({
                command: 'showMessage',
                type: 'success',
                message: `✅ ${aiProvider.toUpperCase()} connection successful! ${testResult}`
            });

        } catch (error) {
            this._view?.webview.postMessage({
                command: 'showMessage',
                type: 'error',
                message: `❌ Connection test failed: ${error}`
            });
        }
    }

    private async _testOpenAI(apiKey: string, model: string): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as any;
        return `Model: ${data.model}`;
    }

    private async _testClaude(apiKey: string, model: string): Promise<string> {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model || 'claude-3-sonnet-20240229',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hello' }]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as any;
        return `Model: ${data.model}`;
    }

    private async _testGemini(apiKey: string, model: string): Promise<string> {
        const modelName = model || 'gemini-pro';
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hello' }] }],
                generationConfig: { maxOutputTokens: 10 }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return `Model: ${modelName}`;
    }

    private async _testLocalAI(model: string): Promise<string> {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'llama2',
                prompt: 'Hello',
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as any;
        return `Local model: ${model || 'llama2'}`;
    }

    private async _resetConfiguration(): Promise<void> {
        try {
            const workspaceConfig = vscode.workspace.getConfiguration('bookWritingAssistant');
            
            // Reset to defaults
            await workspaceConfig.update('aiProvider', 'openai', vscode.ConfigurationTarget.Workspace);
            await workspaceConfig.update('apiKey', '', vscode.ConfigurationTarget.Workspace);
            await workspaceConfig.update('model', 'gpt-3.5-turbo', vscode.ConfigurationTarget.Workspace);
            await workspaceConfig.update('temperature', 0.7, vscode.ConfigurationTarget.Workspace);
            await workspaceConfig.update('maxTokens', 2000, vscode.ConfigurationTarget.Workspace);

            // Reload configuration
            await this._loadConfiguration();

            this._view?.webview.postMessage({
                command: 'showMessage',
                type: 'success',
                message: '🔄 Configuration reset to defaults!'
            });

        } catch (error) {
            this._view?.webview.postMessage({
                command: 'showMessage',
                type: 'error',
                message: `❌ Error resetting configuration: ${error}`
            });
        }
    }

    private _getConfigHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Model Configuration</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
            margin: 0;
            padding: 10px;
            line-height: 1.4;
        }
        
        .config-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .config-header {
            text-align: center;
            padding: 10px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 10px;
        }
        
        .config-header h3 {
            margin: 0;
            color: var(--vscode-foreground);
            font-size: 14px;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .form-group label {
            font-weight: bold;
            font-size: 12px;
            color: var(--vscode-foreground);
        }
        
        .form-group input, .form-group select {
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: 12px;
        }
        
        .form-group input:focus, .form-group select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .button-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 10px;
        }
        
        .btn {
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            font-weight: bold;
            text-align: center;
        }
        
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .btn-warning {
            background: var(--vscode-editorWarning-foreground);
            color: var(--vscode-editor-background);
        }
        
        .message {
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-bottom: 10px;
            text-align: center;
        }
        
        .message.success {
            background: var(--vscode-testing-iconPassed);
            color: var(--vscode-editor-background);
        }
        
        .message.error {
            background: var(--vscode-testing-iconFailed);
            color: var(--vscode-editor-background);
        }
        
        .message.warning {
            background: var(--vscode-editorWarning-foreground);
            color: var(--vscode-editor-background);
        }
        
        .message.info {
            background: var(--vscode-editorInfo-foreground);
            color: var(--vscode-editor-background);
        }
        
        .help-text {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        
        .section {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 10px;
            background: var(--vscode-editor-background);
        }
        
        .section-title {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 10px;
            color: var(--vscode-foreground);
        }
        
        .form-group.hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="config-container">
        <div class="config-header">
            <h3>⚙️ AI Model Configuration</h3>
        </div>
        
        <div id="messageArea"></div>
        
        <div class="section">
            <div class="section-title">🤖 AI Provider Settings</div>
            
            <div class="form-group">
                <label for="aiProvider">AI Provider:</label>
                <select id="aiProvider">
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="google">Google (Gemini)</option>
                    <option value="local">Local Model</option>
                </select>
                <div class="help-text">Choose your preferred AI service provider</div>
            </div>
            
            <div class="form-group" id="apiKeyGroup">
                <label for="apiKey">API Key:</label>
                <input type="password" id="apiKey" placeholder="Enter your API key..." />
                <div class="help-text">Your API key is stored securely in workspace settings</div>
            </div>
            
            <div class="form-group">
                <label for="model">Model:</label>
                <input type="text" id="model" placeholder="e.g., gpt-3.5-turbo, claude-3-sonnet" />
                <div class="help-text" id="modelHelp">Specific model name to use for content generation</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">🎛️ Generation Parameters</div>
            
            <div class="form-group">
                <label for="temperature">Temperature:</label>
                <input type="number" id="temperature" min="0" max="2" step="0.1" />
                <div class="help-text">Controls creativity (0.0 = focused, 2.0 = creative)</div>
            </div>
            
            <div class="form-group">
                <label for="maxTokens">Max Tokens:</label>
                <input type="number" id="maxTokens" min="100" max="8000" step="100" />
                <div class="help-text">Maximum length of generated content</div>
            </div>
        </div>
        
        <div class="button-group">
            <button class="btn btn-primary" onclick="saveConfiguration()">💾 Save Configuration</button>
            <button class="btn btn-secondary" onclick="testConnection()">🔍 Test Connection</button>
            <button class="btn btn-warning" onclick="resetConfiguration()">🔄 Reset to Defaults</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function saveConfiguration() {
            const config = {
                aiProvider: document.getElementById('aiProvider').value,
                apiKey: document.getElementById('apiKey').value,
                model: document.getElementById('model').value,
                temperature: document.getElementById('temperature').value,
                maxTokens: document.getElementById('maxTokens').value
            };

            vscode.postMessage({
                command: 'saveConfig',
                config: config
            });
        }

        function testConnection() {
            vscode.postMessage({
                command: 'testConnection'
            });
        }

        function resetConfiguration() {
            if (confirm('Are you sure you want to reset all configuration to defaults?')) {
                vscode.postMessage({
                    command: 'resetConfig'
                });
            }
        }

        function showMessage(type, text) {
            const messageArea = document.getElementById('messageArea');
            messageArea.innerHTML = \`<div class="message \${type}">\${text}</div>\`;
            
            // Auto-clear messages after 5 seconds
            setTimeout(() => {
                messageArea.innerHTML = '';
            }, 5000);
        }

        function loadConfigValues(config) {
            const provider = config.aiProvider || 'openai';
            document.getElementById('aiProvider').value = provider;
            document.getElementById('apiKey').value = config.apiKey || '';
            document.getElementById('model').value = config.model || 'gpt-3.5-turbo';
            document.getElementById('temperature').value = config.temperature || 0.7;
            document.getElementById('maxTokens').value = config.maxTokens || 2000;
            
            // Update model suggestions and API key visibility based on provider
            updateModelSuggestions(provider);
        }

        function updateModelSuggestions(provider) {
            const modelInput = document.getElementById('model');
            const modelHelp = document.getElementById('modelHelp');
            const apiKeyGroup = document.getElementById('apiKeyGroup');
            
            // Show/hide API key field based on provider
            if (provider === 'local') {
                apiKeyGroup.classList.add('hidden');
            } else {
                apiKeyGroup.classList.remove('hidden');
            }
            
            switch (provider) {
                case 'openai':
                    modelInput.placeholder = 'e.g., gpt-4, gpt-3.5-turbo, gpt-4-turbo';
                    modelHelp.textContent = 'OpenAI models: gpt-4, gpt-3.5-turbo, gpt-4-turbo';
                    if (!modelInput.value || modelInput.value.includes('claude') || modelInput.value.includes('gemini')) {
                        modelInput.value = 'gpt-3.5-turbo';
                    }
                    break;
                case 'anthropic':
                    modelInput.placeholder = 'e.g., claude-3-sonnet-20240229, claude-3-opus-20240229';
                    modelHelp.textContent = 'Claude models: claude-3-sonnet-20240229, claude-3-opus-20240229, claude-3-haiku-20240307';
                    if (!modelInput.value || modelInput.value.includes('gpt') || modelInput.value.includes('gemini')) {
                        modelInput.value = 'claude-3-sonnet-20240229';
                    }
                    break;
                case 'google':
                    modelInput.placeholder = 'e.g., gemini-pro, gemini-pro-vision';
                    modelHelp.textContent = 'Gemini models: gemini-pro, gemini-pro-vision';
                    if (!modelInput.value || modelInput.value.includes('gpt') || modelInput.value.includes('claude')) {
                        modelInput.value = 'gemini-pro';
                    }
                    break;
                case 'local':
                    modelInput.placeholder = 'e.g., llama2, codellama, mistral';
                    modelHelp.textContent = 'Local models (Ollama): llama2, codellama, mistral, phi, neural-chat. No API key required!';
                    if (!modelInput.value || modelInput.value.includes('gpt') || modelInput.value.includes('claude') || modelInput.value.includes('gemini')) {
                        modelInput.value = 'llama2';
                    }
                    break;
            }
        }

        // Add event listener for provider changes
        document.getElementById('aiProvider').addEventListener('change', function(e) {
            updateModelSuggestions(e.target.value);
        });

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'showMessage':
                    showMessage(message.type, message.message);
                    break;
                    
                case 'loadConfig':
                    loadConfigValues(message.config);
                    break;
            }
        });

        // Request initial configuration load
        vscode.postMessage({
            command: 'loadConfig'
        });
    </script>
</body>
</html>`;
    }
}
