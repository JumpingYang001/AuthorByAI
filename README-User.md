# 📚 Book Writing Assistant - VS Code Extension

A powerful VS Code extension designed specifically for authors and educators to create comprehensive training manuals, educational content, and documentation with AI assistance.

## ✨ Features

### 🤖 AI-Powered Content Generation
- Generate complete chapters, lessons, exercises, quizzes, and summaries
- Context-aware AI that understands your book's structure and goals
- Support for multiple AI providers (OpenAI GPT-4, Claude, Local models via Ollama)
- Intelligent fallback to professional templates when AI is unavailable

### 📝 Sidebar Content Tools
- **Chat Assistant**: Interactive writing helper for questions, refinements, and brainstorming
- **Content Generator**: Quick creation of structured educational content
- **Main Panel**: Comprehensive content editing and management

### 🎯 Educational Content Types
- **Chapter Outlines**: Structured learning objectives and section breakdowns
- **Lesson Content**: Detailed explanations with examples and demonstrations
- **Exercises**: Progressive hands-on activities with self-assessment
- **Quizzes**: Multi-format questions with comprehensive answer keys
- **Summaries**: Key concepts, terminology, and action items

### 💡 Smart Features
- Session context tracking across all panels
- Professional markdown formatting
- Direct file saving to workspace
- Template-based fallback system
- Content type-specific AI prompting

## 🚀 Getting Started

### Installation
1. Install the extension from VS Code Marketplace (or load .vsix file)
2. Open VS Code and reload the window
3. The extension will be ready to use!

### First Steps
1. **Open a Workspace**: Ensure you have a folder open in VS Code for saving generated content
2. **Open Sidebar Panels**: 
   - View → Command Palette → "Book Writing Assistant: Open Chat"
   - View → Command Palette → "Book Writing Assistant: Open Content Generator"
3. **Generate Content**: Use the Content Generator to create your first piece of content
4. **Interact with AI**: Ask questions and get help in the Chat panel

## 🎛️ Usage Guide

### Content Generator Panel
1. **Select Content Type**: Choose from Chapter Outline, Lesson Content, Exercise, Quiz, or Summary
2. **Enter Topic**: Provide the main topic or title for your content
3. **Add Context**: Include any specific requirements or additional information
4. **Generate**: Click "Generate Content" to create AI-powered content
5. **Save**: Use "Save to File" to save the generated content directly to your workspace

### Chat Assistant Panel
- Ask questions about your content
- Request modifications or improvements
- Get writing advice and suggestions
- Brainstorm ideas for new sections

### Main Panel
- View and edit generated content
- Access comprehensive content management features
- Generate content with full context awareness

## ⚙️ Configuration

### AI Provider Setup

The extension automatically detects and uses available AI services in the following order:

1. **OpenAI** (if `OPENAI_API_KEY` environment variable is set)
2. **Local AI via Ollama** (if Ollama is running locally)
3. **Template Fallback** (professional templates when AI is unavailable)

#### Setting up OpenAI
```bash
# Set your OpenAI API key as an environment variable
export OPENAI_API_KEY="your-api-key-here"
```

#### Setting up Ollama (Local AI)
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Run: `ollama run llama2` (or your preferred model)
3. The extension will automatically detect and use the local model

### Workspace Configuration
- Ensure you have a folder open in VS Code
- Generated files will be saved to the root of your workspace
- Files are automatically named based on content type and topic

## 🎨 Content Types & Templates

### Chapter Outline
- Learning objectives and prerequisites
- Structured sections with subsections
- Assessment components and exercises
- Time allocations and resources

### Lesson Content
- Detailed explanations with examples
- Step-by-step instructions
- Common challenges and troubleshooting
- Summary and next steps

### Exercise
- Progressive difficulty levels
- Clear instructions and outcomes
- Self-assessment criteria
- Extension activities

### Quiz
- Multiple question types
- Instructions and time estimates
- Comprehensive answer keys
- Difficulty indicators

### Summary
- Key concepts overview
- Terminology definitions
- Best practices checklist
- Reflection questions

## 🔧 Troubleshooting

### AI Not Working?
- Check your API keys and environment variables
- Verify Ollama is running (for local AI)
- The extension will fall back to professional templates automatically

### Content Not Saving?
- Ensure you have a workspace folder open
- Check file permissions in your workspace directory
- Look for error messages in VS Code's output panel

### Panels Not Showing?
- Use Command Palette to open specific panels
- Try reloading VS Code window
- Check that the extension is properly activated

## 📖 Tips for Best Results

### Writing Effective Prompts
- Be specific about your target audience
- Include domain/subject context
- Mention any special requirements or constraints
- Use the chat panel to refine and improve content

### Organizing Your Content
- Use consistent naming conventions for files
- Create folder structures for different chapters/sections
- Leverage the session context to maintain consistency

### Maximizing AI Assistance
- Build context gradually across your session
- Ask follow-up questions in the chat panel
- Use different content types to create comprehensive materials

## 🤝 Support & Feedback

- Report issues and suggest features via GitHub Issues
- Join the community for tips and best practices
- Contribute to the project development

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy Writing! 📚✨**

*Transform your educational content creation with AI-powered assistance.*
