// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Import our organized modules
import { SessionContextManager } from './sessionManager';
import { BookStructureService } from './bookStructureService';
import { ConversationStorage } from './conversationStorage';
import { ContentType, ContentGenerationRequest, WebviewMessage } from './types';
import { sanitizeInput, sanitizeFilename, getFileExtension } from './utils';
import { ErrorHandler } from './errorHandler';
import { ConfigurationManager } from './configurationManager';
import { AIResponseCache } from './responseCache';

// Import webview providers
import { BookWritingPanel } from './providers/mainPanel';
import { WebViewChatPanel } from './webviewChatPanel';

/**
 * This method is called when your extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Book Writing Assistant extension is now active!');

    // Initialize configuration manager
    const configManager = ConfigurationManager.getInstance();
    console.log('Configuration manager initialized');

    // Initialize conversation storage
    ConversationStorage.getInstance(context);

    // Register command to create book structure
    const createBookStructure = vscode.commands.registerCommand('Author-AI-Assistant.createBookStructure', async () => {
        const bookStructureService = BookStructureService.getInstance();
        await bookStructureService.createBookStructure();
    });

    // Register command to open combined chat + main panel (no Explorer conflict)
    const openChatPanel = vscode.commands.registerCommand('Author-AI-Assistant.openChatPanel', () => {
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
        panel.webview.html = WebViewChatPanel.getCombinedHtml();
        
        // Handle messages from chat using the WebViewChatPanel
        panel.webview.onDidReceiveMessage(async (data) => {
            await WebViewChatPanel.handleWebViewMessage(data, panel, context);
        });

        // Handle panel disposal
        panel.onDidDispose(() => {
            // Clean up any resources if needed
        });
    });

    // Register the secondary command alias
    const openChatAssistant = vscode.commands.registerCommand('Author-AI-Assistant.openChatAssistant', () => {
        vscode.commands.executeCommand('Author-AI-Assistant.openChatPanel');
    });

    // Register the main content generator command
    const openContentGenerator = vscode.commands.registerCommand('Author-AI-Assistant.openContentGenerator', () => {
        BookWritingPanel.createOrShow(context.extensionUri);
    });

    // Register insert at cursor command for webview
    const insertAtCursor = vscode.commands.registerCommand('Author-AI-Assistant.insertAtCursor', async (text: string) => {
        console.log('insertAtCursor command received text:', text?.substring(0, 100) + '...');
        
        // For insert at cursor, we want to preserve the original markdown content
        // Only do basic safety checks without HTML escaping
        if (!text || typeof text !== 'string') {
            console.log('Invalid text provided');
            vscode.window.showErrorMessage('Invalid content provided for insertion');
            return;
        }
        
        console.log('Using original text without HTML escaping for insertion');
        
        let editor = vscode.window.activeTextEditor;
        
        // If no active editor, try to find any visible editor
        if (!editor) {
            const visibleEditors = vscode.window.visibleTextEditors;
            if (visibleEditors.length > 0) {
                editor = visibleEditors[0];
                // Focus the editor first
                await vscode.window.showTextDocument(editor.document, {
                    viewColumn: editor.viewColumn,
                    preserveFocus: false
                });
                console.log('Focused on available editor:', editor.document.fileName);
            }
        }
        
        // If still no editor, prompt user to open a file
        if (!editor) {
            console.log('No editors available');
            const choice = await vscode.window.showInformationMessage(
                'No active editor found. Would you like to create a new file to insert the content?',
                'Create New File',
                'Cancel'
            );
            
            if (choice === 'Create New File') {
                // Create a new untitled document
                const newDoc = await vscode.workspace.openTextDocument({
                    content: '',
                    language: 'markdown' // Default to markdown for writing content
                });
                editor = await vscode.window.showTextDocument(newDoc);
                console.log('Created new document for content insertion');
            } else {
                return; // User cancelled
            }
        }
        
        if (editor) {
            console.log('Active editor found, inserting text at position:', editor.selection.active);
            const position = editor.selection.active;
            await editor.edit(editBuilder => {
                editBuilder.insert(position, text); // Insert original text without sanitization
            });
            console.log('Text insertion completed');
            
            // Ensure the editor stays focused after insertion
            await vscode.window.showTextDocument(editor.document, {
                viewColumn: editor.viewColumn,
                preserveFocus: false,
                selection: new vscode.Selection(
                    position.line, 
                    position.character + text.length,
                    position.line, 
                    position.character + text.length
                )
            });
        }
    });

    // Register create file command for webview
    const createFileFromCode = vscode.commands.registerCommand('Author-AI-Assistant.createFile', async (code: string, language: string) => {
        try {
            // Validate and sanitize inputs
            const sanitizedCode = sanitizeInput(code);
            const sanitizedLanguage = language.replace(/[^a-zA-Z0-9]/g, ''); // Only allow alphanumeric
            const extension = getFileExtension(sanitizedLanguage);
            
            // Ask user for filename with validation
            const fileName = await vscode.window.showInputBox({
                prompt: `Enter filename for ${sanitizedLanguage} code`,
                value: `untitled${extension}`,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Filename cannot be empty';
                    }
                    if (value.length > 100) {
                        return 'Filename too long (max 100 characters)';
                    }
                    // Check for dangerous characters
                    if (/[<>:"/\\|?*\x00-\x1f]/.test(value)) {
                        return 'Filename contains invalid characters';
                    }
                    return null;
                }
            });

            if (fileName) {
                // Sanitize the filename
                const sanitizedFileName = sanitizeFilename(fileName);
                
                // Create new untitled document with the sanitized code
                const doc = await vscode.workspace.openTextDocument({
                    content: sanitizedCode,
                    language: sanitizedLanguage === 'text' ? undefined : sanitizedLanguage
                });
                
                // Show the document
                await vscode.window.showTextDocument(doc);
                
                // Suggest saving with the specified filename
                if (sanitizedFileName !== 'untitled' + extension) {
                    vscode.window.showInformationMessage(
                        `Code loaded. Save as "${sanitizedFileName}" when ready.`,
                        'Save Now'
                    ).then(choice => {
                        if (choice === 'Save Now') {
                            vscode.commands.executeCommand('workbench.action.files.save');
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error in createFileFromCode:', error);
            const extensionError = ErrorHandler.handleFileError(error, 'Create File from Code');
            await ErrorHandler.showError(extensionError);
        }
    });

    // Register configuration management commands
    const openConfigurationCommand = vscode.commands.registerCommand('Author-AI-Assistant.openConfiguration', async () => {
        try {
            const configManager = ConfigurationManager.getInstance();
            const config = configManager.getConfig();
            
            // Create a new document with current configuration as JSON
            const configJson = JSON.stringify(config, null, 2);
            const doc = await vscode.workspace.openTextDocument({
                content: configJson,
                language: 'json'
            });
            
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(
                'Current configuration displayed. You can also modify settings via VS Code Settings (Ctrl+,) under "Author AI".',
                'Open Settings'
            ).then(choice => {
                if (choice === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'authorAI');
                }
            });
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'openConfiguration');
            await ErrorHandler.showError(extensionError);
        }
    });

    const exportConfigurationCommand = vscode.commands.registerCommand('Author-AI-Assistant.exportConfiguration', async () => {
        try {
            const configManager = ConfigurationManager.getInstance();
            const configData = {
                version: "1.0.0",
                timestamp: new Date().toISOString(),
                config: configManager.getConfig(),
                metadata: {
                    extensionVersion: "0.0.1",
                    platform: process.platform,
                    exportSource: "user_command"
                }
            };
            
            // Save to file
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('author-ai-config.json'),
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            });
            
            if (saveUri) {
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(JSON.stringify(configData, null, 2), 'utf8'));
                vscode.window.showInformationMessage('Configuration exported successfully!');
            }
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'exportConfiguration');
            await ErrorHandler.showError(extensionError);
        }
    });

    const importConfigurationCommand = vscode.commands.registerCommand('Author-AI-Assistant.importConfiguration', async () => {
        try {
            // Open file dialog
            const openUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            });
            
            if (openUri && openUri[0]) {
                const configData = await vscode.workspace.fs.readFile(openUri[0]);
                const configJson = Buffer.from(configData).toString('utf8');
                
                const configManager = ConfigurationManager.getInstance();
                await configManager.importConfig(configJson);
            }
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'importConfiguration');
            await ErrorHandler.showError(extensionError);
        }
    });

    const resetConfigurationCommand = vscode.commands.registerCommand('Author-AI-Assistant.resetConfiguration', async () => {
        try {
            const configManager = ConfigurationManager.getInstance();
            await configManager.resetToDefaults();
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'resetConfiguration');
            await ErrorHandler.showError(extensionError);
        }
    });

    // Register cache management commands
    const viewCacheStatsCommand = vscode.commands.registerCommand('Author-AI-Assistant.viewCacheStats', async () => {
        try {
            const cache = AIResponseCache.getInstance();
            const stats = cache.getStats();
            
            const statsMessage = `
📊 AI Response Cache Statistics

🎯 Performance:
• Total Requests: ${stats.totalRequests}
• Cache Hits: ${stats.cacheHits}
• Cache Misses: ${stats.cacheMisses}
• Hit Rate: ${stats.hitRate.toFixed(1)}%

💰 Savings:
• API Calls Saved: ${stats.totalSaved}
• Estimated Cost Savings: $${(stats.totalSaved * 0.002).toFixed(2)}

💾 Memory:
• Memory Usage: ${(stats.memoryUsage / 1024).toFixed(1)} KB
• Last Cleanup: ${new Date(stats.lastCleanup).toLocaleString()}

⚡ Cache Contents:
• Current Entries: ${cache.getCacheContents().length}
            `.trim();
            
            vscode.window.showInformationMessage(statsMessage, { modal: true });
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'viewCacheStats');
            await ErrorHandler.showError(extensionError);
        }
    });

    const clearCacheCommand = vscode.commands.registerCommand('Author-AI-Assistant.clearCache', async () => {
        try {
            const action = await vscode.window.showWarningMessage(
                'Are you sure you want to clear the AI response cache? This will remove all cached responses and may increase API usage.',
                'Clear Cache',
                'Cancel'
            );

            if (action === 'Clear Cache') {
                const cache = AIResponseCache.getInstance();
                cache.clear();
                vscode.window.showInformationMessage('AI response cache cleared successfully!');
            }
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'clearCache');
            await ErrorHandler.showError(extensionError);
        }
    });

    const cleanupCacheCommand = vscode.commands.registerCommand('Author-AI-Assistant.cleanupCache', async () => {
        try {
            const cache = AIResponseCache.getInstance();
            const removedCount = cache.cleanup();
            
            if (removedCount > 0) {
                vscode.window.showInformationMessage(`Cache cleanup completed! Removed ${removedCount} expired entries.`);
            } else {
                vscode.window.showInformationMessage('Cache cleanup completed! No expired entries found.');
            }
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'cleanupCache');
            await ErrorHandler.showError(extensionError);
        }
    });

    const exportCacheCommand = vscode.commands.registerCommand('Author-AI-Assistant.exportCache', async () => {
        try {
            const cache = AIResponseCache.getInstance();
            const cacheData = cache.exportCache();
            
            // Save to file
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('ai-response-cache.json'),
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            });
            
            if (saveUri) {
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(cacheData, 'utf8'));
                vscode.window.showInformationMessage('AI response cache exported successfully!');
            }
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'exportCache');
            await ErrorHandler.showError(extensionError);
        }
    });

    const importCacheCommand = vscode.commands.registerCommand('Author-AI-Assistant.importCache', async () => {
        try {
            // Open file dialog
            const openUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            });
            
            if (openUri && openUri[0]) {
                const cacheData = await vscode.workspace.fs.readFile(openUri[0]);
                const cacheJson = Buffer.from(cacheData).toString('utf8');
                
                const cache = AIResponseCache.getInstance();
                const success = cache.importCache(cacheJson);
                
                if (success) {
                    vscode.window.showInformationMessage('AI response cache imported successfully!');
                } else {
                    vscode.window.showErrorMessage('Failed to import cache data. Please check the file format.');
                }
            }
        } catch (error) {
            const extensionError = ErrorHandler.handle(error as Error, 'importCache');
            await ErrorHandler.showError(extensionError);
        }
    });

    // Add all disposables to context
    context.subscriptions.push(
        createBookStructure,
        openChatPanel,
        openChatAssistant,
        openContentGenerator,
        insertAtCursor,
        createFileFromCode,
        openConfigurationCommand,
        exportConfigurationCommand,
        importConfigurationCommand,
        resetConfigurationCommand,
        viewCacheStatsCommand,
        clearCacheCommand,
        cleanupCacheCommand,
        exportCacheCommand,
        importCacheCommand
    );
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {
    // Clean up resources
    const configManager = ConfigurationManager.getInstance();
    configManager.dispose();
    
    const cache = AIResponseCache.getInstance();
    cache.dispose();
    
    console.log('Book Writing Assistant extension deactivated and resources cleaned up');
}
