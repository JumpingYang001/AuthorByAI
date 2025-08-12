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

        // For content generation context, throw an error to trigger template fallback in the main panel
        if (context === 'content') {
            throw new Error('All AI services unavailable, triggering template fallback');
        }

        // For chat context, use fallback response system
        console.log('All external AI services unavailable, using fallback responses');
        const content = this._getFallbackResponse(prompt, context);
        return { content, source: 'fallback' };
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

    /**
     * Fallback response system when no external AI services are available
     */
    private _getFallbackResponse(prompt: string, context: 'chat' | 'content'): string {
        // Use TemplateService for comprehensive fallback responses
        try {
            const { TemplateService } = require('./templateService');
            const templateService = TemplateService.getInstance();
            
            if (context === 'chat') {
                return templateService.generateChatResponse(prompt);
            } else {
                // For content generation, try to extract content type and topic from prompt
                return this._handleContentGenerationFallback(prompt, templateService);
            }
        } catch (error) {
            console.log('TemplateService fallback failed:', error);
            // Ultimate fallback if TemplateService fails
            return this._getBasicFallbackResponse(prompt, context);
        }
    }

    /**
     * Handle content generation fallback by parsing the prompt for content type and topic
     */
    private _handleContentGenerationFallback(prompt: string, templateService: any): string {
        const lowerPrompt = prompt.toLowerCase();
        
        // Try to extract content type from prompt
        let contentType = 'lesson_content'; // default
        let topic = 'Sample Topic';
        let domain = 'General';
        
        if (lowerPrompt.includes('chapter') && lowerPrompt.includes('outline')) {
            contentType = 'chapter_outline';
        } else if (lowerPrompt.includes('exercise')) {
            contentType = 'exercise';
        } else if (lowerPrompt.includes('quiz')) {
            contentType = 'quiz';
        } else if (lowerPrompt.includes('summary')) {
            contentType = 'summary';
        }
        
        // Try to extract topic (look for quoted strings or common patterns)
        const topicMatch = prompt.match(/topic[:\s]+"([^"]+)"/i) || 
                          prompt.match(/about\s+"([^"]+)"/i) ||
                          prompt.match(/"([^"]+)"/);
        if (topicMatch) {
            topic = topicMatch[1];
        }
        
        // Try to extract domain
        const domainMatch = prompt.match(/domain[:\s]+"([^"]+)"/i) ||
                           prompt.match(/subject[:\s]+"([^"]+)"/i);
        if (domainMatch) {
            domain = domainMatch[1];
        }
        
        console.log(`Fallback content generation: type=${contentType}, topic=${topic}, domain=${domain}`);
        
        // Generate using template service
        return templateService.generateTemplate(contentType, {
            topic: topic,
            domain: domain,
            context: ''
        });
    }

    /**
     * Basic fallback response as last resort
     */
    private _getBasicFallbackResponse(prompt: string, context: 'chat' | 'content'): string {
        const lowerPrompt = prompt.toLowerCase();
        
        // Code examples
        if (lowerPrompt.includes('python') && lowerPrompt.includes('function')) {
            return `# Python Function Example

Here's a simple Python function that demonstrates common programming concepts:

\`\`\`python
def calculate_fibonacci(n):
    """
    Calculate the nth Fibonacci number using iteration.
    
    Args:
        n (int): The position in the Fibonacci sequence
        
    Returns:
        int: The nth Fibonacci number
    """
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    
    a, b = 0, 1
    for i in range(2, n + 1):
        a, b = b, a + b
    
    return b

# Example usage
if __name__ == "__main__":
    # Test the function
    for i in range(10):
        print(f"Fibonacci({i}) = {calculate_fibonacci(i)}")
    
    # Calculate a larger Fibonacci number
    result = calculate_fibonacci(20)
    print(f"The 20th Fibonacci number is: {result}")
\`\`\`

## Key Features Demonstrated:

- **Docstring**: Clear documentation with Args and Returns
- **Edge Cases**: Handling n <= 0 and n == 1
- **Iteration**: Using a for loop instead of recursion for efficiency
- **Multiple Assignment**: Using \`a, b = b, a + b\` for clean swapping
- **Main Guard**: Using \`if __name__ == "__main__":\` for testing
- **Examples**: Showing both loop usage and single calculation

This function is efficient with O(n) time complexity and O(1) space complexity.`;
        }
        
        // Writing assistance
        if (lowerPrompt.includes('write') || lowerPrompt.includes('book') || lowerPrompt.includes('chapter')) {
            return `# Writing Assistant Response

I'm here to help with your writing projects! Here are some ways I can assist:

## **Content Creation**
- **Chapter outlines** with clear structure and flow
- **Character development** templates and exercises  
- **Plot structure** guidance using proven frameworks
- **Dialog writing** techniques and examples

## **Writing Process**
- **Research organization** methods
- **Daily writing goals** and tracking
- **Revision strategies** for different draft stages
- **Publishing pathways** for different genres

## **Tools & Techniques**
- **Markdown formatting** for structured documents
- **Version control** for manuscript management
- **Collaboration** workflows for co-authors
- **Export options** to various publishing formats

**What specific aspect of writing would you like help with?** I can provide detailed guidance on any of these topics.

*Note: AI services are currently offline, but I can still provide helpful writing guidance and code examples.*`;
        }
        
        // General programming
        if (lowerPrompt.includes('code') || lowerPrompt.includes('program') || lowerPrompt.includes('function')) {
            return `# Programming Assistance

I can help you with various programming topics! Here are some areas I cover:

## **Languages & Frameworks**
- **Python**: Data structures, functions, classes, libraries
- **JavaScript/TypeScript**: Modern ES6+, Node.js, frameworks
- **VS Code Extensions**: Development, debugging, publishing
- **Web Development**: HTML, CSS, React, APIs

## **Best Practices**
- **Clean Code**: Naming, structure, documentation
- **Testing**: Unit tests, integration tests, TDD
- **Version Control**: Git workflows, collaboration
- **Performance**: Optimization techniques, profiling

## **Example Code Templates**
- Functions with proper documentation
- Class structures with inheritance
- API integration examples
- File processing utilities

**What programming topic or language would you like help with?** I can provide specific examples and explanations.

*Note: External AI services are currently unavailable, but I can still provide code examples and programming guidance.*`;
        }
        
        // Fallback for any other queries
        return `# Book Writing Assistant

Hello! I'm your VS Code Book Writing Assistant. While my AI services are currently offline, I can still help you with:

## **Available Features**
- **Content Templates**: Pre-built structures for chapters, lessons, exercises
- **Markdown Examples**: Properly formatted educational content
- **Code Examples**: Programming tutorials and documentation
- **Writing Guidance**: Best practices for technical and educational writing

## **Quick Examples**
Want to see a **Python function**? Just ask!
Need help with **markdown formatting**? I've got templates!
Looking for **writing structure** ideas? I can provide outlines!

## **How to Get Started**
1. Ask for specific code examples (e.g., "Show me a Python class")
2. Request writing templates (e.g., "Create a chapter outline")
3. Get formatting help (e.g., "How do I make tables in markdown?")

**What would you like help with today?**

*Note: This is a demonstration mode. For full AI capabilities, configure API keys in the extension settings.*`;
    }
}
