// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Book Writing Assistant Class
class BookWritingPanel {
    public static currentPanel: BookWritingPanel | undefined;
    public static readonly viewType = 'bookWriting';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (BookWritingPanel.currentPanel) {
            BookWritingPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            BookWritingPanel.viewType,
            'Book Writing Assistant',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        BookWritingPanel.currentPanel = new BookWritingPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'generateContent':
                        this._handleContentGeneration(message.type, message.topic, message.domain);
                        return;
                    case 'createMarkdownFile':
                        this._createMarkdownFile(message.filename, message.content);
                        return;
                    case 'sendMessage':
                        this._handleChatMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private async _handleContentGeneration(type: string, topic: string, domain: string) {
        try {
            // Show loading indicator
            this._panel.webview.postMessage({
                command: 'showLoading',
                message: `Generating ${type} for "${topic}" in ${domain} domain...`
            });

            // Generate content based on type
            let content = '';
            let filename = '';
            
            switch (type) {
                case 'chapter-outline':
                    content = await this._generateChapterOutline(topic, domain);
                    filename = `${this._sanitizeFilename(topic)}-outline.md`;
                    break;
                case 'lesson-content':
                    content = await this._generateLessonContent(topic, domain);
                    filename = `${this._sanitizeFilename(topic)}-lesson.md`;
                    break;
                case 'exercise':
                    content = await this._generateExercise(topic, domain);
                    filename = `${this._sanitizeFilename(topic)}-exercise.md`;
                    break;
                case 'quiz':
                    content = await this._generateQuiz(topic, domain);
                    filename = `${this._sanitizeFilename(topic)}-quiz.md`;
                    break;
                case 'summary':
                    content = await this._generateSummary(topic, domain);
                    filename = `${this._sanitizeFilename(topic)}-summary.md`;
                    break;
                default:
                    throw new Error('Unknown content type');
            }

            // Send generated content back to webview
            this._panel.webview.postMessage({
                command: 'contentGenerated',
                content: content,
                filename: filename,
                type: type
            });

        } catch (error) {
            this._panel.webview.postMessage({
                command: 'showError',
                message: `Failed to generate content: ${error}`
            });
        }
    }

    private async _createMarkdownFile(filename: string, content: string) {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
                return;
            }

            // Create a 'book-content' directory if it doesn't exist
            const bookDir = path.join(workspaceFolders[0].uri.fsPath, 'book-content');
            if (!fs.existsSync(bookDir)) {
                fs.mkdirSync(bookDir, { recursive: true });
            }

            const filePath = path.join(bookDir, filename);
            
            // Write the content to file
            fs.writeFileSync(filePath, content, 'utf8');
            
            // Open the created file
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);

            vscode.window.showInformationMessage(`Created: ${filename}`);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create file: ${error}`);
        }
    }

    private async _handleChatMessage(userMessage: string) {
        try {
            // Show typing indicator
            this._panel.webview.postMessage({
                command: 'addChatMessage',
                sender: 'assistant',
                text: '📝 Writing...'
            });

            // Get AI response focused on book writing
            const aiResponse = await this._getBookWritingResponse(userMessage);
            
            // Replace thinking message with actual response
            this._panel.webview.postMessage({
                command: 'replaceChatMessage',
                sender: 'assistant',
                text: aiResponse
            });
        } catch (error) {
            console.log('AI not available, using fallback responses:', error);
            
            const smartResponse = this._getBookWritingFallback(userMessage);
            
            this._panel.webview.postMessage({
                command: 'replaceChatMessage',
                sender: 'assistant',
                text: smartResponse
            });
        }
    }

    // Content Generation Methods
    private async _generateChapterOutline(topic: string, domain: string): Promise<string> {
        const prompt = `You are a professional educational content writer. Create a detailed chapter outline for a book about "${topic}" in the ${domain} domain.

REQUIRED FORMAT:
- Use markdown formatting
- Include a main title with # Chapter Outline: ${topic}
- Add a domain section with ## Domain: ${domain}
- Create structured sections with clear headings and bullet points

MUST INCLUDE:
1. Learning Objectives (3-5 specific, measurable goals)
2. Chapter Structure with 6 main sections:
   - Introduction (what, why, overview)
   - Core Concepts (terminology, principles, how it works)
   - Practical Applications (examples, use cases, implementations)
   - Best Practices (dos/don'ts, recommendations)
   - Advanced Topics (complex scenarios, integrations)
   - Summary and Next Steps (takeaways, actions, resources)
3. Assessment section (questions, exercises, projects)

Make it comprehensive, pedagogically sound, and suitable for educational use.`;
        
        try {
            return await this._getAIResponse(prompt);
        } catch (error) {
            return this._getChapterOutlineTemplate(topic, domain);
        }
    }

    private async _generateLessonContent(topic: string, domain: string): Promise<string> {
        const prompt = `You are a professional educational content writer. Write a comprehensive lesson about "${topic}" in the ${domain} domain.

REQUIRED FORMAT:
- Use markdown formatting with proper headings, code blocks, and lists
- Include a main title with # Lesson: ${topic}
- Structure content with clear sections and subsections

MUST INCLUDE:
1. Introduction (welcome, learning goals, overview)
2. What You'll Learn (4-5 bullet points of specific outcomes)
3. Core Concepts section with:
   - Clear definition of ${topic}
   - Key components/principles (numbered list)
4. Practical Examples section with:
   - Basic implementation example (with code or steps)
   - Advanced usage example
5. Best Practices section with:
   - Do's and Don'ts
   - Professional tips
6. Common Challenges section (problems, solutions, prevention)
7. Summary (what was covered)
8. Next Steps (actionable items for learners)

Use concrete examples relevant to ${domain}. Include code snippets where appropriate. Make it engaging and practical for learners.`;
        
        try {
            return await this._getAIResponse(prompt);
        } catch (error) {
            return this._getLessonContentTemplate(topic, domain);
        }
    }

    private async _generateExercise(topic: string, domain: string): Promise<string> {
        const prompt = `You are a professional educational content writer. Create practical exercises and hands-on activities for learning "${topic}" in the ${domain} domain.

REQUIRED FORMAT:
- Use markdown formatting
- Include a main title with # Exercises: ${topic}
- Add domain section with ## Domain: ${domain}

MUST INCLUDE:
1. Exercise 1: Basic Understanding
   - Clear objective
   - Step-by-step instructions with specific tasks
   - Expected outcome
2. Exercise 2: Practical Application
   - Real-world scenario relevant to ${domain}
   - Specific deliverables
   - Implementation steps
3. Exercise 3: Problem Solving
   - Challenge scenario
   - Troubleshooting steps
   - Validation methods
4. Self-Assessment section with:
   - Rating scale checkboxes for different skills
   - Reflection questions
5. Additional Practice suggestions

Make exercises progressively challenging. Include specific, actionable tasks that learners can complete. Ensure exercises are practical and relevant to ${domain} professionals.`;
        
        try {
            return await this._getAIResponse(prompt);
        } catch (error) {
            return this._getExerciseTemplate(topic, domain);
        }
    }

    private async _generateQuiz(topic: string, domain: string): Promise<string> {
        const prompt = `You are a professional educational content writer. Create a comprehensive quiz about "${topic}" in the ${domain} domain.

REQUIRED FORMAT:
- Use markdown formatting
- Include a main title with # Quiz: ${topic}
- Add domain section with ## Domain: ${domain}

MUST INCLUDE:
1. Instructions section (how to use the quiz)
2. Multiple Choice Questions (2 questions minimum):
   - 4 options each (A, B, C, D)
   - Questions specific to ${topic} in ${domain} context
3. True/False Questions (2 questions minimum):
   - Clear statements about ${topic}
4. Short Answer Questions (2 questions minimum):
   - Open-ended questions requiring explanation
   - Space for written responses
5. Practical Questions (1 question minimum):
   - Scenario-based application questions
6. Complete Answer Key section with:
   - Correct answers for all questions
   - Explanations for why answers are correct
   - Sample responses for short answer questions
   - Evaluation criteria for practical questions

Make questions challenging but fair. Ensure they test understanding, application, and critical thinking about ${topic} in ${domain} context.`;
        
        try {
            return await this._getAIResponse(prompt);
        } catch (error) {
            return this._getQuizTemplate(topic, domain);
        }
    }

    private async _generateSummary(topic: string, domain: string): Promise<string> {
        const prompt = `You are a professional educational content writer. Write a concise but comprehensive summary of "${topic}" in the ${domain} domain.

REQUIRED FORMAT:
- Use markdown formatting with proper headings and tables
- Include a main title with # Summary: ${topic}
- Add domain section with ## Domain: ${domain}

MUST INCLUDE:
1. Key Concepts section with:
   - Main definition of ${topic}
   - 3-4 core principles with brief explanations
2. Important Terms table with:
   - Key terminology and definitions
   - At least 3 important terms
3. Practical Applications section:
   - 3 real-world use cases
   - Benefits and considerations for each
4. Best Practices Checklist:
   - Do's and Don'ts in checklist format
   - Professional recommendations
5. Common Pitfalls section:
   - 3 common mistakes to avoid
   - How to prevent them
6. Action Items section with:
   - Immediate next steps (checkboxes)
   - Short-term goals (1-2 weeks)
   - Long-term development (1+ months)
7. Further Learning section:
   - Recommended resources
   - Books, courses, documentation
8. Quick Reference section:
   - Essential commands or steps
   - Code snippets if applicable
9. Reflection Questions (3 questions)

Make it a comprehensive reference that learners can return to. Focus on practical, actionable information relevant to ${domain} professionals.`;
        
        try {
            return await this._getAIResponse(prompt);
        } catch (error) {
            return this._getSummaryTemplate(topic, domain);
        }
    }

    // AI Integration Methods
    private async _getBookWritingResponse(userMessage: string): Promise<string> {
        const enhancedPrompt = `You are a professional book writing assistant specializing in creating educational and training content. You help authors create structured learning materials including:

CONTENT TYPES YOU GENERATE:
1. CHAPTER OUTLINES - Structured learning plans with objectives, sections (Introduction, Core Concepts, Practical Applications, Best Practices, Advanced Topics, Summary), and assessments
2. LESSON CONTENT - Comprehensive educational lessons with definitions, examples, best practices, common challenges, and next steps
3. EXERCISES - Hands-on activities with basic understanding, practical application, and problem-solving tasks plus self-assessment
4. QUIZZES - Complete assessments with multiple choice, true/false, short answer, and practical questions plus full answer keys
5. SUMMARIES - Comprehensive reviews with key concepts, terminology tables, best practices checklists, action items, and reflection questions

CONTEXT: The user is working on educational content creation using our Book Writing Assistant VS Code extension. They can generate markdown files for any topic in various domains (Technology, Business, Science, Health, Education, Arts, etc.).

USER QUESTION: ${userMessage}

Please provide helpful, specific advice about book writing, content structure, pedagogical approaches, or how to use the content generation features effectively. If they're asking about a specific topic, help them understand how to structure it for learning.`;
        return await this._getAIResponse(enhancedPrompt);
    }

    private async _getAIResponse(prompt: string): Promise<string> {
        // Try different AI services in order of preference
        try {
            return await this._callOpenAI(prompt);
        } catch (error) {
            console.log('OpenAI failed, trying other options:', error);
        }

        try {
            return await this._callLocalAI(prompt);
        } catch (error) {
            console.log('Local AI failed:', error);
        }

        try {
            return await this._callClaudeAPI(prompt);
        } catch (error) {
            console.log('Claude failed:', error);
        }

        throw new Error('All AI services unavailable');
    }

    // OpenAI API integration
    private async _callOpenAI(prompt: string): Promise<string> {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

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
                        {
                            role: 'system',
                            content: `You are a professional book writing assistant specializing in educational content creation. You create high-quality learning materials in markdown format that are:

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

Follow the exact format specifications provided in the user prompt.`
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 3000,
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

    // Local AI integration (Ollama)
    private async _callLocalAI(prompt: string): Promise<string> {
        try {
            const systemPrompt = `You are a professional book writing assistant specializing in educational content. Create structured, pedagogically sound learning materials in markdown format. Follow format specifications exactly and include practical examples, clear explanations, and actionable content.`;
            
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

    // Anthropic Claude API integration
    private async _callClaudeAPI(prompt: string): Promise<string> {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new Error('Anthropic API key not configured');
        }

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
                    max_tokens: 3000,
                    messages: [
                        {
                            role: 'user',
                            content: `You are a professional book writing assistant specializing in educational content creation. You excel at creating structured learning materials that are pedagogically sound, professionally formatted in markdown, and highly practical for learners.

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
- Include comprehensive coverage of topics

${prompt}`
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

    // Template Methods (fallbacks when AI is unavailable)
    private _getChapterOutlineTemplate(topic: string, domain: string): string {
        return `# Chapter Outline: ${topic}

## Domain: ${domain}

### Learning Objectives
- Understand the fundamentals of ${topic}
- Apply key concepts in practical scenarios
- Identify best practices and common pitfalls

### Chapter Structure

#### 1. Introduction
- What is ${topic}?
- Why is it important in ${domain}?
- Overview of what you'll learn

#### 2. Core Concepts
- Key terminology
- Fundamental principles
- How it works

#### 3. Practical Applications
- Real-world examples
- Use cases in ${domain}
- Step-by-step implementations

#### 4. Best Practices
- Dos and don'ts
- Common mistakes to avoid
- Professional recommendations

#### 5. Advanced Topics
- Complex scenarios
- Integration with other concepts
- Future considerations

#### 6. Summary and Next Steps
- Key takeaways
- Action items
- Further learning resources

### Assessment
- Knowledge check questions
- Practical exercises
- Project assignments

---
*Generated by Book Writing Assistant*
`;
    }

    private _getLessonContentTemplate(topic: string, domain: string): string {
        return `# Lesson: ${topic}

## Introduction

Welcome to this lesson on **${topic}** in the context of ${domain}. By the end of this lesson, you will have a solid understanding of the key concepts and be able to apply them in real-world scenarios.

## What You'll Learn

- Core concepts of ${topic}
- Practical applications in ${domain}
- Best practices and common patterns
- Hands-on examples

## Core Concepts

### Definition
${topic} is a fundamental concept in ${domain} that involves...

### Key Components
1. **Component 1**: Description and importance
2. **Component 2**: How it relates to the overall concept
3. **Component 3**: Practical considerations

## Practical Examples

### Example 1: Basic Implementation
\`\`\`
// Example code or step-by-step process
Step 1: Initial setup
Step 2: Core implementation
Step 3: Testing and validation
\`\`\`

### Example 2: Advanced Usage
\`\`\`
// More complex example
Advanced implementation details
\`\`\`

## Best Practices

- ✅ **Do**: Follow these recommended approaches
- ❌ **Don't**: Avoid these common mistakes
- 💡 **Tip**: Professional insights and shortcuts

## Common Challenges

### Challenge 1: [Common Issue]
**Problem**: Description of the issue
**Solution**: How to address it
**Prevention**: How to avoid it in the future

## Summary

In this lesson, we covered:
- The fundamentals of ${topic}
- How it applies to ${domain}
- Practical implementation strategies
- Best practices for success

## Next Steps

1. Practice with the provided exercises
2. Explore additional resources
3. Apply concepts to your own projects

---
*Generated by Book Writing Assistant*
`;
    }

    private _getExerciseTemplate(topic: string, domain: string): string {
        return `# Exercises: ${topic}

## Domain: ${domain}

### Exercise 1: Basic Understanding
**Objective**: Test your foundational knowledge of ${topic}

**Instructions**:
1. Review the core concepts
2. Complete the following tasks:
   - Task A: [Specific instruction]
   - Task B: [Specific instruction]
   - Task C: [Specific instruction]

**Expected Outcome**: You should be able to demonstrate basic understanding

### Exercise 2: Practical Application
**Objective**: Apply ${topic} concepts to a real-world scenario

**Scenario**: You are working on a ${domain} project that requires...

**Your Task**:
1. Analyze the requirements
2. Design a solution using ${topic}
3. Implement your approach
4. Document your process

**Deliverables**:
- Solution design document
- Implementation code/steps
- Reflection on challenges faced

### Exercise 3: Problem Solving
**Objective**: Troubleshoot and optimize

**Problem Statement**: Given a scenario where ${topic} is not working as expected...

**Your Challenge**:
1. Identify the root cause
2. Propose solutions
3. Implement the best approach
4. Test and validate

### Self-Assessment

Rate your understanding (1-5 scale):
- [ ] Core concepts of ${topic}
- [ ] Practical applications
- [ ] Problem-solving abilities
- [ ] Confidence in implementation

### Additional Practice

For more practice:
1. Create your own examples
2. Explore edge cases
3. Research advanced techniques
4. Share with peers for feedback

---
*Generated by Book Writing Assistant*
`;
    }

    private _getQuizTemplate(topic: string, domain: string): string {
        return `# Quiz: ${topic}

## Domain: ${domain}

### Instructions
- Answer all questions to the best of your ability
- Review your answers before submitting
- Use this as a learning tool to identify areas for improvement

---

### Multiple Choice Questions

**Question 1**: What is the primary purpose of ${topic} in ${domain}?
- [ ] A) Option A
- [ ] B) Option B
- [ ] C) Option C
- [ ] D) Option D

**Question 2**: Which of the following is a best practice for ${topic}?
- [ ] A) Option A
- [ ] B) Option B
- [ ] C) Option C
- [ ] D) Option D

### True/False Questions

**Question 3**: ${topic} is essential for all ${domain} applications.
- [ ] True
- [ ] False

**Question 4**: The main benefit of ${topic} is improved performance.
- [ ] True
- [ ] False

### Short Answer Questions

**Question 5**: Explain in your own words what ${topic} means in the context of ${domain}.

_Your answer:_


**Question 6**: Describe a real-world scenario where ${topic} would be particularly important.

_Your answer:_


### Practical Questions

**Question 7**: Given the following scenario, how would you apply ${topic}?

*Scenario description...*

_Your solution:_


---

## Answer Key

### Multiple Choice
1. **C** - Explanation of why this is correct
2. **B** - Explanation of why this is correct

### True/False
3. **False** - Explanation
4. **True** - Explanation

### Short Answer (Sample Responses)
5. A good answer should include: key concepts, practical applications, importance in domain
6. Examples might include: specific use cases, industry applications, problem-solving scenarios

### Practical (Evaluation Criteria)
7. Look for: understanding of concepts, practical approach, consideration of constraints

---
*Generated by Book Writing Assistant*
`;
    }

    private _getSummaryTemplate(topic: string, domain: string): string {
        return `# Summary: ${topic}

## Domain: ${domain}

### Key Concepts

**Main Definition**: ${topic} is...

**Core Principles**:
1. **Principle 1**: Brief explanation
2. **Principle 2**: Brief explanation
3. **Principle 3**: Brief explanation

### Important Terms

| Term | Definition |
|------|------------|
| Term 1 | Explanation of the term |
| Term 2 | Explanation of the term |
| Term 3 | Explanation of the term |

### Practical Applications

- **Use Case 1**: Where and how it's applied
- **Use Case 2**: Benefits and considerations
- **Use Case 3**: Real-world examples

### Best Practices Checklist

- ✅ Always remember to...
- ✅ Consider the impact of...
- ✅ Validate your approach by...
- ❌ Avoid doing...
- ❌ Don't forget to...

### Common Pitfalls

1. **Pitfall 1**: What to watch out for
2. **Pitfall 2**: How to prevent it
3. **Pitfall 3**: Warning signs

### Action Items

After learning about ${topic}, you should:

**Immediate Next Steps**:
- [ ] Practice with basic examples
- [ ] Review core concepts
- [ ] Complete exercises

**Short-term Goals** (1-2 weeks):
- [ ] Apply to a small project
- [ ] Explore advanced features
- [ ] Seek feedback from peers

**Long-term Development** (1+ months):
- [ ] Master advanced techniques
- [ ] Teach others
- [ ] Contribute to community resources

### Further Learning

**Recommended Resources**:
- Books: [Suggested reading]
- Online Courses: [Course recommendations]
- Documentation: [Official docs and guides]
- Communities: [Forums and discussion groups]

### Quick Reference

**Essential Commands/Steps**:
\`\`\`
// Quick reference for implementation
Key steps or code snippets
\`\`\`

---

### Reflection Questions

1. How will you apply ${topic} in your work?
2. What aspects need more practice?
3. What questions do you still have?

---
*Generated by Book Writing Assistant*
`;
    }

    // Utility Methods
    private _sanitizeFilename(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    private _getBookWritingFallback(userMessage: string): string {
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.includes('outline') || lowerMessage.includes('structure')) {
            return "I can help you create chapter outlines! Use the quick actions above to generate structured outlines for any topic in your domain.";
        }
        
        if (lowerMessage.includes('lesson') || lowerMessage.includes('content')) {
            return "Let's create engaging lesson content! The lesson generator can help you build comprehensive educational materials with examples and explanations.";
        }
        
        if (lowerMessage.includes('exercise') || lowerMessage.includes('practice')) {
            return "Practical exercises are crucial for learning! I can generate hands-on activities and practice problems tailored to your topic and domain.";
        }
        
        if (lowerMessage.includes('quiz') || lowerMessage.includes('test') || lowerMessage.includes('assessment')) {
            return "Assessments help reinforce learning! Try the quiz generator to create comprehensive tests with multiple question types and answer keys.";
        }
        
        if (lowerMessage.includes('summary') || lowerMessage.includes('review')) {
            return "Summaries are perfect for reinforcing key concepts! Generate structured summaries with key terms, best practices, and action items.";
        }

        const responses = [
            "I'm your book writing assistant! I can help you create chapters, lessons, exercises, quizzes, and summaries for educational content.",
            "What type of learning material would you like to create? I specialize in generating structured educational content in markdown format.",
            "I can help you write comprehensive training materials. What subject area or domain are you focusing on?",
            "Let's create some engaging educational content! Use the quick actions above or tell me what specific help you need with your book.",
            "I'm here to assist with all aspects of educational book writing. What can I help you generate today?"
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    public dispose() {
        BookWritingPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book Writing Assistant</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .container {
            flex: 1;
            display: flex;
            flex-direction: column;
            max-width: 1000px;
            margin: 0 auto;
            width: 100%;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            color: var(--vscode-textLink-foreground);
        }
        
        .quick-actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
            padding: 20px;
            background: var(--vscode-textBlockQuote-background);
            border-radius: 8px;
            border-left: 4px solid var(--vscode-textLink-foreground);
        }
        
        .action-button {
            padding: 15px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-family: inherit;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
            text-align: center;
        }
        
        .action-button:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-2px);
        }
        
        .action-button:active {
            transform: translateY(0);
        }
        
        .input-section {
            margin-bottom: 20px;
            padding: 20px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
        }
        
        .input-row {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            align-items: end;
        }
        
        .input-group {
            flex: 1;
        }
        
        .input-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }
        
        .input-group input, .input-group select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
        }
        
        .generate-btn {
            padding: 10px 20px;
            background: var(--vscode-textLink-foreground);
            color: var(--vscode-editor-background);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-family: inherit;
            font-weight: 500;
        }
        
        .generate-btn:hover {
            opacity: 0.9;
        }
        
        .generate-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .content-display {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            overflow: hidden;
        }
        
        .content-header {
            padding: 15px;
            background: var(--vscode-textBlockQuote-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .content-body {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family);
            line-height: 1.6;
        }
        
        .save-btn {
            padding: 8px 16px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 3px;
            cursor: pointer;
            font-family: inherit;
        }
        
        .save-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .chat-section {
            margin-top: 20px;
            padding: 20px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 6px;
            border: 1px solid var(--vscode-panel-border);
        }
        
        .chat-messages {
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 15px;
            padding: 10px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
        }
        
        .chat-message {
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 4px;
        }
        
        .user-message {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 20%;
        }
        
        .assistant-message {
            background: var(--vscode-textBlockQuote-background);
            margin-right: 20%;
        }
        
        .chat-input {
            display: flex;
            gap: 10px;
        }
        
        .chat-input input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        
        .error {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 10px;
            border-radius: 3px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 Book Writing Assistant</h1>
            <p>Generate structured learning content and training materials in markdown format</p>
        </div>
        
        <div class="quick-actions">
            <button class="action-button" onclick="setContentType('chapter-outline')">
                📋 Chapter Outline
            </button>
            <button class="action-button" onclick="setContentType('lesson-content')">
                📖 Lesson Content
            </button>
            <button class="action-button" onclick="setContentType('exercise')">
                💪 Exercise
            </button>
            <button class="action-button" onclick="setContentType('quiz')">
                🧠 Quiz
            </button>
            <button class="action-button" onclick="setContentType('summary')">
                📝 Summary
            </button>
        </div>
        
        <div class="input-section">
            <div class="input-row">
                <div class="input-group">
                    <label for="contentType">Content Type</label>
                    <select id="contentType">
                        <option value="chapter-outline">Chapter Outline</option>
                        <option value="lesson-content">Lesson Content</option>
                        <option value="exercise">Exercise</option>
                        <option value="quiz">Quiz</option>
                        <option value="summary">Summary</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="topic">Topic</label>
                    <input type="text" id="topic" placeholder="e.g., Machine Learning Basics" />
                </div>
                <div class="input-group">
                    <label for="domain">Domain</label>
                    <select id="domain">
                        <option value="Technology">Technology</option>
                        <option value="Business">Business</option>
                        <option value="Science">Science</option>
                        <option value="Health">Health</option>
                        <option value="Education">Education</option>
                        <option value="Arts">Arts</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <button class="generate-btn" onclick="generateContent()">Generate</button>
            </div>
        </div>
        
        <div class="content-display">
            <div class="content-header">
                <span id="contentTitle">Generated content will appear here</span>
                <button class="save-btn" id="saveBtn" onclick="saveToFile()" style="display: none;">
                    💾 Save as Markdown
                </button>
            </div>
            <div class="content-body" id="contentBody">
                <div class="loading">
                    Select a content type and topic above, then click "Generate" to create your content.
                </div>
            </div>
        </div>
        
        <div class="chat-section">
            <h3>💬 Writing Assistant Chat</h3>
            <div class="chat-messages" id="chatMessages">
                <div class="chat-message assistant-message">
                    <strong>Assistant:</strong> Hello! I'm here to help you write educational content. Ask me anything about book writing, content structure, or pedagogical approaches.
                </div>
            </div>
            <div class="chat-input">
                <input type="text" id="chatInput" placeholder="Ask me about book writing..." />
                <button class="generate-btn" onclick="sendChatMessage()">Send</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentContent = '';
        let currentFilename = '';

        function setContentType(type) {
            document.getElementById('contentType').value = type;
        }

        function generateContent() {
            const type = document.getElementById('contentType').value;
            const topic = document.getElementById('topic').value.trim();
            const domain = document.getElementById('domain').value;

            if (!topic) {
                alert('Please enter a topic');
                return;
            }

            document.getElementById('contentBody').innerHTML = '<div class="loading">🔄 Generating content...</div>';
            document.getElementById('saveBtn').style.display = 'none';

            vscode.postMessage({
                command: 'generateContent',
                type: type,
                topic: topic,
                domain: domain
            });
        }

        function saveToFile() {
            if (currentContent && currentFilename) {
                vscode.postMessage({
                    command: 'createMarkdownFile',
                    filename: currentFilename,
                    content: currentContent
                });
            }
        }

        function sendChatMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            
            if (!message) return;

            addChatMessage('user', message);
            input.value = '';

            vscode.postMessage({
                command: 'sendMessage',
                text: message
            });
        }

        function addChatMessage(sender, text) {
            const messagesContainer = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`chat-message \${sender}-message\`;
            messageDiv.innerHTML = \`<strong>\${sender.charAt(0).toUpperCase() + sender.slice(1)}:</strong> \${text}\`;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Handle Enter key in inputs
        document.getElementById('topic').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') generateContent();
        });
        
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'showLoading':
                    document.getElementById('contentBody').innerHTML = \`<div class="loading">\${message.message}</div>\`;
                    break;
                    
                case 'contentGenerated':
                    currentContent = message.content;
                    currentFilename = message.filename;
                    document.getElementById('contentTitle').textContent = \`\${message.type.replace('-', ' ')} - \${currentFilename}\`;
                    document.getElementById('contentBody').textContent = message.content;
                    document.getElementById('saveBtn').style.display = 'block';
                    break;
                    
                case 'showError':
                    document.getElementById('contentBody').innerHTML = \`<div class="error">\${message.message}</div>\`;
                    break;
                    
                case 'addChatMessage':
                    addChatMessage(message.sender, message.text);
                    break;
                    
                case 'replaceChatMessage':
                    const messages = document.querySelectorAll('.assistant-message');
                    if (messages.length > 0) {
                        const lastMessage = messages[messages.length - 1];
                        lastMessage.innerHTML = \`<strong>Assistant:</strong> \${message.text}\`;
                    }
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Book Writing Assistant extension is now active!');

    // Register command to open book writing assistant
    const openBookWriting = vscode.commands.registerCommand('Author-AI-Assistant.openBookWriting', () => {
        BookWritingPanel.createOrShow(context.extensionUri);
    });

    // Register legacy commands for backwards compatibility
    const openChat = vscode.commands.registerCommand('Author-AI-Assistant.openChat', () => {
        BookWritingPanel.createOrShow(context.extensionUri);
    });

    const helloCommand = vscode.commands.registerCommand('Author-AI-Assistant.helloWorld', () => {
        vscode.window.showInformationMessage('Hello from Book Writing Assistant! Use "Open Book Writing Assistant" to start creating educational content.');
    });

    // Register command to create new book structure
    const createBookStructure = vscode.commands.registerCommand('Author-AI-Assistant.createBookStructure', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Please open a workspace folder first.');
            return;
        }

        try {
            const bookTitle = await vscode.window.showInputBox({
                prompt: 'Enter your book title',
                placeHolder: 'My Learning Guide'
            });

            if (!bookTitle) {
                return;
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            const bookPath = path.join(rootPath, 'book-content');

            // Create directory structure
            const dirs = [
                bookPath,
                path.join(bookPath, 'chapters'),
                path.join(bookPath, 'exercises'),
                path.join(bookPath, 'quizzes'),
                path.join(bookPath, 'resources')
            ];

            dirs.forEach(dir => {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            });

            // Create initial files
            const readmeContent = `# ${bookTitle}

## Structure

- \`chapters/\` - Main learning content
- \`exercises/\` - Practical exercises
- \`quizzes/\` - Assessment materials
- \`resources/\` - Additional resources

## Getting Started

Use the Book Writing Assistant to generate content for each section.

Generated with Book Writing Assistant for VS Code.
`;

            fs.writeFileSync(path.join(bookPath, 'README.md'), readmeContent, 'utf8');

            vscode.window.showInformationMessage(`Book structure created for "${bookTitle}"!`);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create book structure: ${error}`);
        }
    });

    context.subscriptions.push(openBookWriting, openChat, helloCommand, createBookStructure);
}

// This method is called when your extension is deactivated
export function deactivate() {}
