// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Import our organized modules
import { SessionContextManager } from './sessionManager';
import { BookStructureService } from './bookStructureService';
import { ConversationStorage } from './conversationStorage';
import { ContentType, ContentGenerationRequest, WebviewMessage } from './types';
import { sanitizeInput, sanitizeFilename } from './utils';

// Import webview providers
import { BookWritingPanel } from './providers/mainPanel';
import { WebViewChatPanel } from './webviewChatPanel';

/**
 * This method is called when your extension is activated
 */
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
        // Validate and sanitize the text before insertion
        const sanitizedText = sanitizeInput(text);
        
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const position = editor.selection.active;
            await editor.edit(editBuilder => {
                editBuilder.insert(position, sanitizedText);
            });
        }
    });

    // Register create file command for webview
    const createFileFromCode = vscode.commands.registerCommand('Author-AI-Assistant.createFile', async (code: string, language: string) => {
        try {
            const { getFileExtension } = await import('./utils');
            
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
            vscode.window.showErrorMessage(`Failed to create file: ${error}`);
        }
    });

    // Add all disposables to context
    context.subscriptions.push(
        createBookStructure,
        openChatPanel,
        openChatAssistant,
        openContentGenerator,
        insertAtCursor,
        createFileFromCode
    );
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {
    // Clean up resources
}
