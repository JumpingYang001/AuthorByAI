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

    // Register command to open chat as floating panel (no Explorer conflict)
    const openChatPanel = vscode.commands.registerCommand('Author-AI-Assistant.openChatPanel', () => {
        // Create a floating chat panel
        const panel = vscode.window.createWebviewPanel(
            'bookWritingChat',
            '💬 Book Writing Chat',
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
            {
                enableScripts: true,
                localResourceRoots: [context.extensionUri]
            }
        );

        // Set up the chat webview content using the same HTML as the sidebar
        const chatProvider = new BookWritingChatProvider(context.extensionUri);
        panel.webview.html = chatProvider._getChatHtml();
        
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'sendMessage':
                    await chatProvider._handleChatMessage(data.text, panel.webview);
                    break;
            }
        });
    });

    // Register command to open content generator as floating panel
    const openContentPanel = vscode.commands.registerCommand('Author-AI-Assistant.openContentPanel', () => {
        // Create a floating content generator panel
        const panel = vscode.window.createWebviewPanel(
            'bookWritingContent',
            '📝 Content Generator',
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
            {
                enableScripts: true,
                localResourceRoots: [context.extensionUri]
            }
        );

        // Set up the content generator webview
        const contentProvider = new BookWritingContentProvider(context.extensionUri);
        panel.webview.html = contentProvider._getContentGeneratorHtml();
        
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'generateContent':
                    await contentProvider._handleContentGeneration(message, panel.webview);
                    break;
            }
        });
    });

    // Add all commands to subscriptions
    context.subscriptions.push(
        createBookStructure,
        openChatSidebar,
        openChatPanel,
        openContentPanel
    );
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('Book Writing Assistant extension is now deactivated!');
}
