import * as vscode from 'vscode';
import { AIServiceResponse } from './types';
import { TemplateService } from './templateService';

/**
 * Shared AI service for handling different AI providers with configuration support
 */
export class AIService {
    private static _instance: AIService;
    private _templateService = new TemplateService();

    public static getInstance(): AIService {
        if (!AIService._instance) {
            AIService._instance = new AIService();
        }
        return AIService._instance;
    }

    public async getResponse(prompt: string, context: 'chat' | 'content' = 'content'): Promise<AIServiceResponse> {
        const config = vscode.workspace.getConfiguration('bookWritingAssistant');
        const aiProvider = config.get<string>('aiProvider', 'openai');
        
        // Try configured AI provider first
        try {
            switch (aiProvider) {
                case 'openai':
                    const openaiContent = await this._callOpenAI(prompt, context);
                    return { content: openaiContent, source: 'openai' };
                    
                case 'anthropic':
                    const claudeContent = await this._callClaudeAPI(prompt, context);
                    return { content: claudeContent, source: 'claude' };
                    
                case 'google':
                    const geminiContent = await this._callGeminiAPI(prompt, context);
                    return { content: geminiContent, source: 'gemini' };
                    
                case 'local':
                    const localContent = await this._callLocalAI(prompt, context);
                    return { content: localContent, source: 'local' };
                    
                default:
                    throw new Error(`Unknown AI provider: ${aiProvider}`);
            }
        } catch (error) {
            console.log(`Primary AI provider (${aiProvider}) failed:`, error);
        }

        // Try fallback providers if primary fails
        const fallbackProviders = ['openai', 'local', 'anthropic', 'google'].filter(p => p !== aiProvider);
        
        for (const provider of fallbackProviders) {
            try {
                switch (provider) {
                    case 'openai':
                        const content = await this._callOpenAI(prompt, context);
                        return { content, source: 'openai' };
                    case 'local':
                        const localContent = await this._callLocalAI(prompt, context);
                        return { content: localContent, source: 'local' };
                    case 'anthropic':
                        const claudeContent = await this._callClaudeAPI(prompt, context);
                        return { content: claudeContent, source: 'claude' };
                    case 'google':
                        const geminiContent = await this._callGeminiAPI(prompt, context);
                        return { content: geminiContent, source: 'gemini' };
                }
            } catch (error) {
                console.log(`Fallback provider (${provider}) failed:`, error);
            }
        }

        // If all AI services fail, use template fallback for content generation
        if (context === 'content') {
            console.log('All AI services failed, using template fallback');
            const templateContent = this._getTemplateFallback(prompt);
            return { content: templateContent, source: 'template' };
        }

        throw new Error('All AI services unavailable and no template fallback for chat');
    }

    private async _callOpenAI(prompt: string, context: 'chat' | 'content'): Promise<string> {
        const config = vscode.workspace.getConfiguration('bookWritingAssistant');
        const apiKey = config.get<string>('apiKey', '') || process.env.OPENAI_API_KEY;
        const model = config.get<string>('model', 'gpt-3.5-turbo');
        const temperature = config.get<number>('temperature', 0.7);
        const maxTokens = config.get<number>('maxTokens', context === 'chat' ? 1500 : 3000);
        
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const systemMessage = context === 'chat' 
            ? this._getChatSystemMessage()
            : this._getContentSystemMessage();

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemMessage },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: maxTokens,
                    temperature: temperature
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json() as any;
            return data.choices?.[0]?.message?.content || 'No response from OpenAI';
            
        } catch (error) {
            console.log('OpenAI API error:', error);
            throw error;
        }
    }

    private async _callLocalAI(prompt: string, context: 'chat' | 'content'): Promise<string> {
        const config = vscode.workspace.getConfiguration('bookWritingAssistant');
        const model = config.get<string>('model', 'llama2');
        const temperature = config.get<number>('temperature', 0.7);
        
        const systemPrompt = context === 'chat'
            ? `You are a book writing assistant for VS Code sidebar. Provide concise, helpful advice about educational content creation.`
            : `You are a professional book writing assistant specializing in educational content. Create structured, pedagogically sound learning materials in markdown format. Follow format specifications exactly and include practical examples, clear explanations, and actionable content.`;

        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    prompt: `${systemPrompt}\n\nUser Request: ${prompt}\n\nResponse:`,
                    stream: false,
                    options: {
                        temperature: temperature
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Local AI error: ${response.status}`);
            }

            const data = await response.json() as any;
            return data.response || 'No response from local AI';
            
        } catch (error) {
            console.log('Local AI error:', error);
            throw error;
        }
    }

    private async _callClaudeAPI(prompt: string, context: 'chat' | 'content'): Promise<string> {
        const config = vscode.workspace.getConfiguration('bookWritingAssistant');
        const apiKey = config.get<string>('apiKey', '') || process.env.ANTHROPIC_API_KEY;
        const model = config.get<string>('model', 'claude-3-sonnet-20240229');
        const temperature = config.get<number>('temperature', 0.7);
        const maxTokens = config.get<number>('maxTokens', context === 'chat' ? 1500 : 3000);
        
        if (!apiKey) {
            throw new Error('Anthropic API key not configured');
        }

        const systemContext = context === 'chat'
            ? `You are a book writing assistant for VS Code sidebar chat. Provide concise, helpful responses about educational content creation and book writing.`
            : `You are a professional book writing assistant specializing in educational content creation. You excel at creating structured learning materials that are pedagogically sound, professionally formatted in markdown, and highly practical for learners.

EXPERTISE AREAS:
- Educational content design and structure
- Learning objective creation
- Practical exercise development
- Assessment and quiz creation
- Technical writing and documentation
- Cross-domain knowledge application

QUALITY STANDARDS:
- Follow exact format specifications
- Include specific, actionable content
- Provide relevant examples for the domain
- Maintain consistent professional tone
- Use proper markdown formatting
- Include comprehensive coverage of topics`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: maxTokens,
                    temperature: temperature,
                    messages: [
                        {
                            role: 'user',
                            content: `${systemContext}\n\n${prompt}`
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Claude API error: ${response.status}`);
            }

            const data = await response.json() as any;
            return data.content?.[0]?.text || 'No response from Claude';
            
        } catch (error) {
            console.log('Claude API error:', error);
            throw error;
        }
    }

    private _getChatSystemMessage(): string {
        return `You are a professional book writing assistant for VS Code sidebar chat. Provide concise, helpful responses about educational content creation, book writing, and pedagogical approaches. Keep responses focused and actionable.`;
    }

    private _getContentSystemMessage(): string {
        return `You are a professional book writing assistant specializing in educational content creation. You create high-quality learning materials in markdown format that are:

CHARACTERISTICS:
- Detailed and comprehensive
- Pedagogically sound with clear learning progression
- Professionally structured with consistent formatting
- Practical and applicable to real-world scenarios
- Engaging and accessible to learners

MARKDOWN REQUIREMENTS:
- Use proper heading hierarchy (# ## ### ####)
- Include code blocks with \`\`\` when showing examples
- Use bullet points and numbered lists for clarity
- Include tables for terminology and comparisons
- Use checkboxes [ ] for action items and assessments
- Apply bold **text** and italic *text* for emphasis

CONTENT STANDARDS:
- Always include specific, measurable learning objectives
- Provide concrete examples relevant to the domain
- Include practical exercises and assessments
- Offer clear next steps and further learning resources
- Maintain professional tone while being accessible

Follow the exact format specifications provided in the user prompt.`;
    }

    private async _callGeminiAPI(prompt: string, context: 'chat' | 'content'): Promise<string> {
        const config = vscode.workspace.getConfiguration('bookWritingAssistant');
        const apiKey = config.get<string>('apiKey', '') || process.env.GOOGLE_API_KEY;
        const model = config.get<string>('model', 'gemini-pro');
        const temperature = config.get<number>('temperature', 0.7);
        const maxTokens = config.get<number>('maxTokens', context === 'chat' ? 1500 : 3000);
        
        if (!apiKey) {
            throw new Error('Google API key not configured');
        }

        const systemContext = context === 'chat'
            ? `You are a book writing assistant for VS Code sidebar chat. Provide concise, helpful responses about educational content creation and book writing.`
            : `You are a professional book writing assistant specializing in educational content creation. Create structured, pedagogically sound learning materials in markdown format. Follow format specifications exactly and include practical examples, clear explanations, and actionable content.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${systemContext}\n\n${prompt}`
                        }]
                    }],
                    generationConfig: {
                        temperature: temperature,
                        maxOutputTokens: maxTokens
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json() as any;
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
            
        } catch (error) {
            console.log('Gemini API error:', error);
            throw error;
        }
    }

    private _getTemplateFallback(prompt: string): string {
        // Extract content type and topic from prompt
        const contentTypeMatch = prompt.match(/content type.*?(\w+)/i);
        const topicMatch = prompt.match(/topic.*?["']([^"']+)["']/i) || prompt.match(/about\s+["']?([^"'\n]+)["']?/i);
        const domainMatch = prompt.match(/domain.*?["']([^"']+)["']/i);
        
        const contentType = contentTypeMatch?.[1]?.toLowerCase() || 'lesson_content';
        const topic = topicMatch?.[1] || 'General Topic';
        const domain = domainMatch?.[1] || 'General';
        
        // Use template service for fallback content
        try {
            const templateContent = this._templateService.generateTemplate(contentType, { topic, domain });
            return `${templateContent}\n\n---\n*Note: This content was generated using a template fallback as AI services are currently unavailable.*`;
        } catch (error) {
            // If template service fails, provide a basic fallback
            return this._getBasicFallback(contentType, topic);
        }
    }

    private _getBasicFallback(contentType: string, topic: string): string {
        return `# ${topic}

## Overview
This is a basic template for ${contentType} about ${topic}.

## Content Structure
- Introduction to ${topic}
- Key concepts and definitions
- Practical applications
- Examples and exercises
- Summary and next steps

## Learning Objectives
By the end of this content, learners will be able to:
- [ ] Understand the fundamentals of ${topic}
- [ ] Apply key concepts in practical scenarios
- [ ] Identify common patterns and best practices

## Next Steps
Continue learning about ${topic} through additional resources and practice.

---
*Note: This is a basic template generated as a fallback when AI services are unavailable. Please configure your AI provider in the Model Configuration panel for enhanced content generation.*`;
    }
}
