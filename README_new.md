# Book Writing Assistant

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue?logo=visual-studio-code)](https://marketplace.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AI Powered](https://img.shields.io/badge/AI-Powered-green?logo=openai)](https://openai.com/)

A professional VS Code extension for creating structured educational content and training materials with AI-powered assistance.

## 🎯 Features

### 📚 **Content Generation**
- **Chapter Outlines**: Comprehensive learning plans with objectives and structured sections
- **Lesson Content**: Detailed educational lessons with examples and practical applications
- **Exercises**: Hands-on activities with progressive difficulty and self-assessment
- **Quizzes**: Complete assessments with multiple question types and answer keys
- **Summaries**: Review materials with key concepts and action items

### 🤖 **AI Integration**
- **Multiple AI Providers**: OpenAI GPT, Anthropic Claude, Local AI (Ollama)
- **Context-Aware Generation**: AI considers your project history and session context
- **Smart Fallbacks**: Professional templates when AI is unavailable
- **Intelligent Chat**: Modify and improve existing content through natural conversation

### 🎨 **User Interface**
- **Sidebar Chat**: Interactive writing assistant in VS Code sidebar
- **Content Generator**: Quick content creation panel
- **Main Editor**: Rich content editing and preview interface
- **Cross-Panel Communication**: Seamless workflow between components

### 💾 **File Management**
- **Markdown Export**: Save generated content as structured markdown files
- **Workspace Integration**: Works with any VS Code workspace
- **File Organization**: Automatic naming and organization

## 🚀 Quick Start

### Installation

1. **Install the Extension**:
   - Open VS Code
   - Go to Extensions (Ctrl/Cmd + Shift + X)
   - Search for "Book Writing Assistant"
   - Click Install

2. **Setup AI Integration** (Optional but Recommended):
   ```bash
   # Set environment variables for AI services
   export OPENAI_API_KEY="your_openai_api_key"
   export ANTHROPIC_API_KEY="your_claude_api_key"
   export LOCAL_AI_URL="http://localhost:11434"  # For Ollama
   ```

3. **Open the Extension**:
   - Use Command Palette (Ctrl/Cmd + Shift + P)
   - Type "Book Writing" to see available commands
   - Or click the Book icon in the Activity Bar

### Basic Usage

1. **Quick Content Generation**:
   - Open the "Content Generator" in the sidebar
   - Select content type (Chapter Outline, Lesson, Exercise, Quiz, Summary)
   - Enter topic and domain
   - Click "Generate Content"
   - Main panel opens with generated content

2. **Interactive Chat**:
   - Use the "Writing Assistant Chat" in the sidebar
   - Ask questions about book writing
   - Request content modifications: "Make this lesson more advanced"
   - Get writing advice and suggestions

3. **Save Your Work**:
   - Review generated content in the main panel
   - Click "Save to File" to export as markdown
   - Files are saved in your current workspace

## 📖 Usage Examples

### Creating a Programming Course

```
Topic: "JavaScript Fundamentals"
Domain: "Programming"
Content Type: "Chapter Outline"

Generated: Complete chapter structure with:
- Learning objectives
- Core concepts (variables, functions, objects)
- Practical applications
- Exercises and assessments
```

### Business Training Material

```
Topic: "Leadership Skills"
Domain: "Business"
Content Type: "Exercise"

Generated: Hands-on leadership activities with:
- Team-building scenarios
- Communication challenges
- Self-assessment tools
- Real-world applications
```

### Academic Content

```
Topic: "Data Science Basics"
Domain: "Analytics"
Content Type: "Quiz"

Generated: Comprehensive assessment with:
- Multiple choice questions
- Practical problems
- Detailed answer explanations
- Difficulty progression
```

## 🛠️ Configuration

### AI Service Setup

#### OpenAI (Recommended)
```bash
export OPENAI_API_KEY="sk-your-api-key-here"
```

#### Anthropic Claude
```bash
export ANTHROPIC_API_KEY="your-claude-api-key"
```

#### Local AI (Ollama)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Set the URL (default)
export LOCAL_AI_URL="http://localhost:11434"
```

### Extension Settings

The extension works out-of-the-box with professional templates. AI integration enhances the experience but is not required.

## 📋 Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `Book Writing: Open Assistant` | Open the main writing panel | - |
| `Book Writing: Open Chat Sidebar` | Open sidebar chat interface | - |
| `Book Writing: Create Book Structure` | Quick book structure generator | - |

## 🔧 Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/JumpingYang001/AuthorByAI.git
cd AuthorByAI

# Install dependencies
npm install

# Compile the extension
npm run compile

# Package the extension
npx vsce package
```

### Architecture

The extension uses a modular architecture with:

- **TypeScript**: Type-safe development
- **Singleton Services**: AI, Session, and Template management
- **Webview Providers**: Sidebar chat and content generation
- **Context Management**: Session-aware content generation

For detailed technical documentation, see [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎉 Acknowledgments

- Built with VS Code Extension API
- AI integration with OpenAI, Anthropic, and Ollama
- Inspired by modern educational content creation needs

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/JumpingYang001/AuthorByAI/issues)
- **Documentation**: [System Architecture](./SYSTEM_ARCHITECTURE.md)
- **AI Setup Guide**: [AI Integration Setup](./AI_INTEGRATION.md)

---

**Happy Writing!** 📝✨

Create professional educational content with the power of AI and the convenience of VS Code.
