/**
 * Shared prompt utilities for AI content generation
 */

export class PromptBuilder {
    private static readonly CONTENT_TYPE_DESCRIPTIONS: Record<string, string> = {
        'chapter_outline': 'a comprehensive chapter outline with learning objectives, structured sections, and assessment components',
        'lesson_content': 'detailed lesson content with explanations, examples, best practices, and practical applications',
        'exercise': 'hands-on exercises with progressive difficulty levels, practical tasks, and self-assessment components',
        'quiz': 'a complete quiz with multiple question types, clear instructions, and comprehensive answer keys',
        'summary': 'a comprehensive summary with key concepts, terminology, best practices, and action items'
    };

    public static buildContentGenerationPrompt(request: any, contextSummary: string): string {
        const contentDescription = this.CONTENT_TYPE_DESCRIPTIONS[request.contentType] || 'educational content';

        return `You are a professional educational content creator and book writing assistant. Create ${contentDescription} based on the following requirements:

${contextSummary}

CONTENT REQUIREMENTS:
- Content Type: ${request.contentType.replace('_', ' ').toUpperCase()}
- Topic/Title: ${request.topic}
- Domain/Subject: ${request.domain || 'General'}
- Additional Context: ${request.context || 'None provided'}

INSTRUCTIONS:
Create high-quality, professional educational content that is:
1. **Pedagogically Sound**: Follows best practices for learning and instruction
2. **Well-Structured**: Clear organization with logical flow and progression
3. **Comprehensive**: Covers all essential aspects of the topic
4. **Practical**: Includes real-world applications and examples
5. **Engaging**: Uses varied formats and interactive elements where appropriate

FORMATTING REQUIREMENTS:
- Use proper markdown formatting
- Include clear headings and subheadings
- Add bullet points, numbered lists, and tables where appropriate
- Include code blocks, examples, or practical demonstrations as relevant
- Ensure professional presentation and readability

CONTENT SPECIFICS:
${this.getContentTypeSpecificInstructions(request.contentType)}

Generate ONLY the markdown content without any meta-commentary or explanations about the generation process.`;
    }

    private static getContentTypeSpecificInstructions(contentType: string): string {
        switch (contentType) {
            case 'chapter_outline':
                return `For CHAPTER OUTLINE:
- Start with clear learning objectives
- Structure with main sections (Introduction, Core Concepts, Applications, Best Practices, Advanced Topics, Summary)
- Include subsections with specific topics
- Add assessment components and suggested exercises
- Provide estimated time allocations
- Include resources and further reading`;

            case 'lesson_content':
                return `For LESSON CONTENT:
- Begin with lesson objectives and prerequisites
- Include detailed explanations with examples
- Add practical demonstrations or code samples
- Provide step-by-step instructions where applicable
- Include common challenges and troubleshooting
- End with summary and next steps`;

            case 'exercise':
                return `For EXERCISES:
- Create progressive difficulty levels (basic, intermediate, advanced)
- Include clear instructions and expected outcomes
- Provide practical, hands-on activities
- Add self-assessment criteria
- Include solution hints or guidance
- Offer extension activities for advanced learners`;

            case 'quiz':
                return `For QUIZ:
- Include multiple question types (multiple choice, true/false, short answer, practical)
- Provide clear instructions and time estimates
- Create questions that test understanding, application, and analysis
- Include comprehensive answer key with explanations
- Add difficulty indicators and point values`;

            case 'summary':
                return `For SUMMARY:
- Create comprehensive overview of key concepts
- Include terminology definitions table
- Add best practices checklist
- Provide action items and next steps
- Include reflection questions
- Add quick reference sections`;

            default:
                return `Create comprehensive, well-structured educational content appropriate for the specified content type.`;
        }
    }
}
