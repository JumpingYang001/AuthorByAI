import { AIServiceResponse } from './types';

/**
 * Shared AI service for handling different AI providers
 */
export class AIService {
    private static _instance: AIService;

    public static getInstance(): AIService {
        if (!AIService._instance) {
            AIService._instance = new AIService();
        }
        return AIService._instance;
    }

    public async getResponse(prompt: string, context: 'chat' | 'content' = 'content'): Promise<AIServiceResponse> {
        // Try different AI services in order of preference
        try {
            const content = await this._callOpenAI(prompt, context);
            return { content, source: 'openai' };
        } catch (error) {
            console.log('OpenAI failed, trying other options:', error);
        }

        try {
            const content = await this._callLocalAI(prompt, context);
            return { content, source: 'local' };
        } catch (error) {
            console.log('Local AI failed:', error);
        }

        try {
            const content = await this._callClaudeAPI(prompt, context);
            return { content, source: 'claude' };
        } catch (error) {
            console.log('Claude failed:', error);
        }

        throw new Error('All AI services unavailable');
    }

    private async _callOpenAI(prompt: string, context: 'chat' | 'content'): Promise<string> {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const systemMessage = context === 'chat' 
            ? this._getChatSystemMessage()
            : this._getContentSystemMessage();

        const maxTokens = context === 'chat' ? 1500 : 3000;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: [
                        { role: 'system', content: systemMessage },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: maxTokens,
                    temperature: 0.7
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
                    model: 'llama2',
                    prompt: `${systemPrompt}\n\nUser Request: ${prompt}\n\nResponse:`,
                    stream: false
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
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new Error('Anthropic API key not configured');
        }

        const maxTokens = context === 'chat' ? 1500 : 3000;
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
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: maxTokens,
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
}
