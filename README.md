# Chat Robot VS Code Extension

A powerful and intelligent chat robot extension for Visual Studio Code that provides real AI-powered assistance right within your editor.

## ✨ Features

- 🤖 **Real AI Integration**: Connect to OpenAI GPT, local AI models, or Anthropic Claude
- 💬 **Interactive Chat Interface**: Clean and intuitive chat UI that matches VS Code's theme
- 🧠 **Smart Fallback Responses**: Contextual responses even without AI services
- 🎨 **Theme Integration**: Seamlessly integrates with VS Code's color themes (dark/light mode)
- ⚡ **Multiple AI Options**: OpenAI API, local models (Ollama), or Claude API
- 🔧 **Easy Setup**: Simple command palette integration with optional AI configuration
- 🆓 **Works Offline**: Smart responses work without internet or AI services

## 🚀 AI Integration Options

### Option 1: OpenAI API (Recommended)
- **Cost**: ~$0.002 per 1K tokens (very affordable)
- **Setup**: Get API key from [OpenAI Platform](https://platform.openai.com/)
- **Quality**: High-quality responses from GPT models

### Option 2: Local AI Models (Free)
- **Cost**: Free after setup
- **Setup**: Install [Ollama](https://ollama.ai/) or [LM Studio](https://lmstudio.ai/)
- **Privacy**: Runs completely offline on your machine

### Option 3: Anthropic Claude
- **Cost**: Competitive with OpenAI
- **Setup**: Get API key from [Anthropic Console](https://console.anthropic.com/)
- **Quality**: Excellent for code analysis and explanations

### Option 4: Smart Fallback Only
- **Cost**: Free
- **Setup**: None required
- **Features**: Context-aware responses for coding questions

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

### Opening the Chat Robot

1. **Via Command Palette**:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Open Chat Robot"
   - Press Enter

### Using the Chat Interface

1. **Type your message** in the input field at the bottom of the chat panel
2. **Press Enter** or click the "Send" button to send your message
3. **Receive responses** from the AI-powered chat robot
4. **Continue the conversation** - the chat history is maintained during the session

### Example Interactions

- **Coding Help**: "How do I create a REST API in Node.js?"
- **Debugging**: "Why am I getting a TypeScript error here?"
- **General Questions**: "What's the difference between let and const?"
- **Code Review**: "Can you review this function for me?"

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
| `Author-AI-Assistant.openChat` | Open Chat Robot | Opens the AI-powered chat interface |
| `Author-AI-Assistant.helloWorld` | Hello World | Shows a simple greeting message |
| `Author-AI-Assistant.listCommands` | List Copilot Commands (Debug) | Debug command to list available Copilot commands |

## 🔮 Future Enhancements

- Chat history persistence across VS Code sessions
- Multiple conversation threads
- Code snippet integration and execution
- Custom AI model configuration
- Voice input/output support
- Integration with more AI providers

## 📄 License

This project is licensed under the MIT License.

## 📝 Version History

### 0.0.1 (Current Release)
- Basic chat robot functionality with AI integration
- Support for OpenAI, local AI (Ollama), and Claude
- Smart fallback responses for offline usage
- Interactive webview interface with VS Code theme integration
- Command palette integration

---

**Ready to chat with your AI-powered VS Code companion!** 🤖✨

For detailed AI setup instructions, see:
- [`AI_INTEGRATION.md`](./AI_INTEGRATION.md) - Overview and concepts
- [`REAL_AI_SETUP.md`](./REAL_AI_SETUP.md) - Step-by-step setup guide
