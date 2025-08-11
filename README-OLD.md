# Book Writing Assistant VS Code Extension

A powerful VS Code extension designed specifically for **book writers** and **educators** to generate structured learning content and training materials in markdown format. Perfect for creating educational books, training manuals, course materials, and learning guides.

## ✨ Features

- 📚 **Educational Content Generation**: Create chapters, lessons, exercises, quizzes, and summaries
- 🤖 **AI-Powered Writing**: Integrates with OpenAI GPT, local AI models, or Anthropic Claude
- � **Structured Templates**: Professional templates for different content types
- 💾 **Auto-Save to Markdown**: Generated content automatically saved as .md files
- � **Domain-Specific**: Tailored for Technology, Business, Science, Health, Education, Arts, and more
- 🏗️ **Book Structure Creator**: Automatically creates organized folder structure for your book
- � **Writing Assistant Chat**: Get writing advice and content suggestions
- � **VS Code Integration**: Beautiful interface that matches your VS Code theme

## � Content Types You Can Generate

### 📋 Chapter Outlines
- Structured learning objectives
- Main topics and subtopics
- Assessment strategies
- Professional formatting

### 📖 Lesson Content
- Comprehensive explanations
- Practical examples
- Step-by-step instructions
- Best practices

### 💪 Exercises
- Hands-on activities
- Skill-building tasks
- Real-world scenarios
- Self-assessment tools

### 🧠 Quizzes
- Multiple choice questions
- True/false assessments
- Short answer questions
- Complete answer keys

### 📝 Summaries
- Key concept reviews
- Important terminology
- Action items
- Further reading suggestions

## 📦 Installation

### From Source Code (Development)

1. **Clone or Download** the project to `D:\AIAuthorEditor`
2. **Open in VS Code**: Open the project folder in VS Code
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Compile the Extension**:
   ```bash
   npm run compile
   ```
5. **Test the Extension**: Press `F5` to open a new Extension Development Host window
6. **Test Commands**: Open Command Palette (`Ctrl+Shift+P`) and type "Chat Robot"

### Create Installable Package

1. **Install VSCE** (VS Code Extension CLI):
   ```bash
   npm install -g vsce
   ```
2. **Package the Extension**:
   ```bash
   npx vsce package
   ```
3. **Install VSIX File**: In VS Code, go to Extensions → Install from VSIX → Select the `.vsix` file

## ⚙️ Configuration (Optional AI Setup)

To enable real AI responses, set up one of these options:

### OpenAI Setup
1. Get API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to your environment variables:
   - **Windows**: `setx OPENAI_API_KEY "your-api-key-here"`
   - **macOS/Linux**: Add `export OPENAI_API_KEY="your-api-key-here"` to `.bashrc` or `.zshrc`
3. Restart VS Code

### Local AI Setup (Ollama)
1. Install [Ollama](https://ollama.ai/)
2. Pull a model: `ollama pull llama2` or `ollama pull codellama`
3. Start Ollama service (usually auto-starts)
4. The extension will automatically detect and use local models

### Claude API Setup
1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to environment variables: `ANTHROPIC_API_KEY="your-api-key-here"`
3. Restart VS Code

> **Note**: The extension works perfectly without any AI setup using smart fallback responses!

## 🎯 Usage

### Quick Start

1. **Open the Book Writing Assistant**:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Open Book Writing Assistant"
   - Press Enter

2. **Create Book Structure** (Optional):
   - Use "Create Book Structure" command to set up organized folders
   - Creates `/book-content/` with chapters, exercises, quizzes, and resources folders

3. **Generate Content**:
   - Select content type (Chapter Outline, Lesson, Exercise, Quiz, Summary)
   - Enter your topic (e.g., "Machine Learning Basics")
   - Choose domain (Technology, Business, Science, etc.)
   - Click "Generate"

4. **Save and Edit**:
   - Review generated content in the preview
   - Click "Save as Markdown" to create the file
   - File automatically opens in VS Code for further editing

### Content Generation Workflow

```
Topic Input → AI Processing → Template Fallback → Markdown File → VS Code Editor
```

### Example Topics by Domain

- **Technology**: "Docker Containers", "React Hooks", "API Design"
- **Business**: "Project Management", "Marketing Strategy", "Financial Planning"
- **Science**: "Data Analysis", "Research Methods", "Statistics"
- **Health**: "Nutrition Basics", "Exercise Physiology", "Mental Health"
- **Education**: "Learning Theory", "Curriculum Design", "Assessment Methods"

## 🔧 Development

### Project Structure

```
├── src/
│   ├── extension.ts          # Main extension entry point with AI integration
│   └── test/
│       └── extension.test.ts # Test files
├── .vscode/
│   ├── launch.json          # Debug configuration
│   ├── tasks.json           # Build tasks
│   └── settings.json        # Project settings
├── package.json             # Extension manifest and dependencies
├── tsconfig.json           # TypeScript configuration
├── webpack.config.js       # Webpack bundling configuration
├── AI_INTEGRATION.md       # AI setup guide
├── REAL_AI_SETUP.md       # Detailed AI configuration
└── README.md               # This file
```

### Key Components

- **ChatRobotPanel**: Main class handling the webview panel and chat interface
- **AI Integration**: Real AI model connections (OpenAI, local, Claude)
- **Smart Fallbacks**: Context-aware responses when AI is unavailable
- **Message Handling**: Communication between extension and webview
- **UI Styling**: CSS that integrates with VS Code's theme system

### AI Response Flow

1. **User Input**: Message sent from webview to extension
2. **AI Attempt**: Try OpenAI → Local AI → Claude (in order)
3. **Fallback**: If AI fails, use smart contextual responses
4. **Response**: Send answer back to webview for display

## 🐛 Troubleshooting

### Common Issues

1. **AI not responding**:
   - Check API key environment variables
   - Verify internet connection (for OpenAI/Claude)
   - Check Ollama service status (for local AI)
   - Fallback responses should still work

2. **Extension not loading**:
   - Ensure VS Code version is 1.102.0 or higher
   - Check the output panel for error messages
   - Try `npm run compile` to rebuild

3. **Chat interface not opening**:
   - Try reloading VS Code window (`Ctrl+R`)
   - Check if extension is properly activated
   - Look for errors in Developer Tools

### Getting Help

1. Check VS Code Developer Console (`Help > Toggle Developer Tools`)
2. Review Output panel (`View > Output`, select extension name)
3. Check the `AI_INTEGRATION.md` and `REAL_AI_SETUP.md` files for setup help

## 📋 Extension Commands

| Command ID | Title | Description |
|------------|-------|-------------|
| `Author-AI-Assistant.openBookWriting` | Open Book Writing Assistant | Opens the main book writing interface |
| `Author-AI-Assistant.openChat` | Open Book Writing Assistant | Alternative command for backwards compatibility |
| `Author-AI-Assistant.createBookStructure` | Create Book Structure | Creates organized folder structure for your book |
| `Author-AI-Assistant.helloWorld` | Hello World | Shows a simple greeting message |

## 🔮 Future Enhancements

- 📖 Multi-chapter book projects with cross-references
- 🔗 Interactive content with embedded links and media
- 📊 Content analytics and readability scoring
- 🌍 Multi-language content generation
- 📱 Export to multiple formats (PDF, EPUB, HTML)
- 🎥 Integration with multimedia content
- 👥 Collaborative writing features
- 🔍 Content search and organization tools

## 📄 License

This project is licensed under the MIT License.

## 📝 Version History

### 0.0.1 (Current Release)
- Complete transformation from chat robot to book writing assistant
- Support for 5 content types: outlines, lessons, exercises, quizzes, summaries
- AI integration with OpenAI, local AI (Ollama), and Claude
- Professional templates for educational content
- Automatic markdown file creation and organization
- Book structure creator for organized projects
- VS Code theme integration and responsive design

---

**Ready to write your next educational masterpiece!** 📚✨

Transform your ideas into structured learning content with the power of AI and professional templates.

For detailed AI setup instructions, see:
- [`AI_INTEGRATION.md`](./AI_INTEGRATION.md) - Overview and concepts
- [`REAL_AI_SETUP.md`](./REAL_AI_SETUP.md) - Step-by-step setup guide
