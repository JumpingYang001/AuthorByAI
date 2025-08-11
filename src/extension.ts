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

    // Add all commands to subscriptions
    context.subscriptions.push(
        createBookStructure,
        openChatSidebar
    );
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('Book Writing Assistant extension is now deactivated!');
}
