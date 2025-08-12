import * as vscode from 'vscode';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    isMarkdown?: boolean;
}

export class ConversationStorage {
    private static instance: ConversationStorage;
    private context: vscode.ExtensionContext;
    private currentConversation: ChatMessage[] = [];
    private readonly STORAGE_KEY = 'bookWriting.conversation';
    private readonly MAX_MESSAGES = 100; // Limit conversation length

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadConversation();
    }

    public static getInstance(context?: vscode.ExtensionContext): ConversationStorage {
        if (!ConversationStorage.instance && context) {
            ConversationStorage.instance = new ConversationStorage(context);
        }
        return ConversationStorage.instance;
    }

    /**
     * Add a new message to the conversation
     */
    public addMessage(role: 'user' | 'assistant', content: string, isMarkdown: boolean = false): ChatMessage {
        const message: ChatMessage = {
            id: this.generateMessageId(),
            role,
            content,
            timestamp: Date.now(),
            isMarkdown
        };

        this.currentConversation.push(message);

        // Keep only the last MAX_MESSAGES to prevent storage bloat
        if (this.currentConversation.length > this.MAX_MESSAGES) {
            this.currentConversation = this.currentConversation.slice(-this.MAX_MESSAGES);
        }

        this.saveConversation();
        return message;
    }

    /**
     * Get all messages in the current conversation
     */
    public getConversation(): ChatMessage[] {
        return [...this.currentConversation];
    }

    /**
     * Clear the current conversation
     */
    public clearConversation(): void {
        this.currentConversation = [];
        this.saveConversation();
    }

    /**
     * Get conversation count
     */
    public getMessageCount(): number {
        return this.currentConversation.length;
    }

    /**
     * Save conversation to workspace state
     */
    private saveConversation(): void {
        try {
            this.context.workspaceState.update(this.STORAGE_KEY, this.currentConversation);
        } catch (error) {
            console.error('Failed to save conversation:', error);
        }
    }

    /**
     * Load conversation from workspace state
     */
    private loadConversation(): void {
        try {
            const saved = this.context.workspaceState.get<ChatMessage[]>(this.STORAGE_KEY);
            if (saved && Array.isArray(saved)) {
                this.currentConversation = saved;
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
            this.currentConversation = [];
        }
    }

    /**
     * Generate a unique message ID
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Export conversation as text (for backup/sharing)
     */
    public exportConversation(): string {
        const header = `# Book Writing Assistant Conversation\nExported: ${new Date().toLocaleString()}\n\n`;
        
        const messages = this.currentConversation.map(msg => {
            const timestamp = new Date(msg.timestamp).toLocaleTimeString();
            const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
            return `## ${role} (${timestamp})\n\n${msg.content}\n\n---\n`;
        }).join('\n');

        return header + messages;
    }

    /**
     * Get conversation stats
     */
    public getStats(): { totalMessages: number; userMessages: number; assistantMessages: number; oldestMessage?: Date } {
        const total = this.currentConversation.length;
        const userCount = this.currentConversation.filter(m => m.role === 'user').length;
        const assistantCount = this.currentConversation.filter(m => m.role === 'assistant').length;
        const oldest = total > 0 ? new Date(this.currentConversation[0].timestamp) : undefined;

        return {
            totalMessages: total,
            userMessages: userCount,
            assistantMessages: assistantCount,
            oldestMessage: oldest
        };
    }
}
