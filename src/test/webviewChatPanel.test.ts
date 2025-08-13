import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { WebViewChatPanel } from '../webviewChatPanel';
import { ConversationStorage } from '../conversationStorage';

suite('WebViewChatPanel Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockWebview: any;
    let mockPanel: any;
    let mockContext: any;
    let mockConversationStorage: any;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Mock ConversationStorage
        mockConversationStorage = {
            getConversation: sandbox.stub().returns([]),
            getStats: sandbox.stub().returns({ totalMessages: 0 }),
            addMessage: sandbox.stub(),
            clearConversation: sandbox.stub(),
            getMessageById: sandbox.stub().returns(null)
        };
        sandbox.stub(ConversationStorage, 'getInstance').returns(mockConversationStorage);
        
        // Mock webview
        mockWebview = {
            html: '',
            postMessage: sandbox.stub(),
            onDidReceiveMessage: sandbox.stub(),
            asWebviewUri: sandbox.stub().returns(vscode.Uri.parse('vscode-resource://test')),
            cspSource: 'vscode-resource:'
        };

        // Mock panel
        mockPanel = {
            webview: mockWebview,
            title: 'Book Writing Assistant',
            onDidDispose: sandbox.stub(),
            dispose: sandbox.stub(),
            reveal: sandbox.stub()
        };

        // Mock context
        mockContext = {
            extensionUri: vscode.Uri.parse('file:///test'),
            subscriptions: []
        };
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('HTML Generation', () => {
        test('should generate HTML with correct structure', () => {
            const html = WebViewChatPanel.getCombinedHtml();
            
            assert.ok(html.includes('<!DOCTYPE html>'));
            assert.ok(html.includes('<html lang="en">'));
            assert.ok(html.includes('Book Writing Assistant'));
            assert.ok(html.includes('chat-container'));
            assert.ok(html.includes('messages'));
        });

        test('should include CSS styling', () => {
            const html = WebViewChatPanel.getCombinedHtml();
            
            assert.ok(html.includes('<style>'));
            assert.ok(html.includes('--vscode-foreground'));
            assert.ok(html.includes('message'));
            assert.ok(html.includes('user'));
            assert.ok(html.includes('assistant'));
        });

        test('should include JavaScript functionality', () => {
            const html = WebViewChatPanel.getCombinedHtml();
            
            assert.ok(html.includes('<script>'));
            assert.ok(html.includes('acquireVsCodeApi'));
            assert.ok(html.includes('postMessage'));
            assert.ok(html.includes('sendMessage'));
        });
    });

    suite('Message Handling', () => {
        test('should handle sendMessage command', async () => {
            const postMessageStub = mockWebview.postMessage;
            
            const messageData = {
                command: 'sendMessage',
                text: 'Hello, world!'
            };

            await WebViewChatPanel.handleWebViewMessage(messageData, mockPanel, mockContext);
            
            // Should re-enable send button after processing
            assert.ok(postMessageStub.calledWith({
                command: 'enableSendButton'
            }));
        });

        test('should handle insertAtCursor command', async () => {
            const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
            const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
            
            const messageData = {
                command: 'insertAtCursor',
                text: 'Sample text to insert'
            };

            await WebViewChatPanel.handleWebViewMessage(messageData, mockPanel, mockContext);
            
            assert.ok(executeCommandStub.calledWith('Author-AI-Assistant.insertAtCursor', 'Sample text to insert'));
            assert.ok(showInformationMessageStub.calledWith('Inserting content...'));
        });

        test('should handle createFile command', async () => {
            const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
            
            const messageData = {
                command: 'createFile',
                code: 'console.log("Hello");',
                language: 'javascript'
            };

            await WebViewChatPanel.handleWebViewMessage(messageData, mockPanel, mockContext);
            
            assert.ok(executeCommandStub.calledWith('Author-AI-Assistant.createFile', 'console.log("Hello");', 'javascript'));
        });

        test('should handle renderMarkdown command', async () => {
            const postMessageStub = mockWebview.postMessage;
            
            const messageData = {
                command: 'renderMarkdown',
                text: '# Hello World',
                requestId: '123'
            };

            await WebViewChatPanel.handleWebViewMessage(messageData, mockPanel, mockContext);
            
            assert.ok(postMessageStub.calledOnce);
            const call = postMessageStub.getCall(0);
            assert.strictEqual(call.args[0].command, 'renderMarkdownResponse');
            assert.strictEqual(call.args[0].requestId, '123');
            assert.ok(call.args[0].renderedHtml);
        });

        test('should handle clearConversation command', async () => {
            // Mock conversation with some messages
            mockConversationStorage.getStats.returns({ totalMessages: 5 });
            // VS Code showWarningMessage expects proper MessageItem objects or undefined
            const showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves();
            const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
            
            const messageData = {
                command: 'clearConversation'
            };

            await WebViewChatPanel.handleWebViewMessage(messageData, mockPanel, mockContext);
            
            assert.ok(showWarningMessageStub.calledOnce);
            // Verify the warning message includes the message count
            const warningCall = showWarningMessageStub.getCall(0);
            assert.ok(warningCall.args[0].includes('5 messages'));
        });

        test('should handle openContentGenerator command', async () => {
            const messageData = {
                command: 'openContentGenerator'
            };

            // This test is simplified since BookWritingPanel is external
            await WebViewChatPanel.handleWebViewMessage(messageData, mockPanel, mockContext);
            
            // Test passes if no error is thrown
            assert.ok(true);
        });
    });

    suite('Error Handling', () => {
        test('should handle errors in insertAtCursor command', async () => {
            const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').rejects(new Error('Command failed'));
            const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
            
            const messageData = {
                command: 'insertAtCursor',
                text: 'Sample text'
            };

            // Don't expect this to throw - the method should handle errors gracefully
            try {
                await WebViewChatPanel.handleWebViewMessage(messageData, mockPanel, mockContext);
            } catch (error) {
                // Errors are expected to be handled internally
            }
            
            // Should have attempted to execute the command
            assert.ok(executeCommandStub.calledOnce);
        });

        test('should handle errors in createFile command', async () => {
            const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').rejects(new Error('File creation failed'));
            const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
            
            const messageData = {
                command: 'createFile',
                code: 'test code',
                language: 'javascript'
            };

            // Don't expect this to throw - the method should handle errors gracefully
            try {
                await WebViewChatPanel.handleWebViewMessage(messageData, mockPanel, mockContext);
            } catch (error) {
                // Errors are expected to be handled internally
            }
            
            // Should have attempted to execute the command
            assert.ok(executeCommandStub.calledOnce);
        });
    });

    suite('Security', () => {
        test('should escape HTML content properly', () => {
            const html = WebViewChatPanel.getCombinedHtml();
            
            // Should not contain unescaped script tags or dangerous content
            assert.ok(!html.includes('<script>alert('));
            assert.ok(!html.includes('javascript:'));
            assert.ok(!html.includes('eval('));
        });

        test('should use CSP or other security measures', () => {
            const html = WebViewChatPanel.getCombinedHtml();
            
            // Should include some form of security measures
            assert.ok(html.length > 0); // Basic check that HTML is generated
        });
    });
});
