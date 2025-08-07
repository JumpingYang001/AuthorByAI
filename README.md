# Author# Chat Robot VS Code Extension

A simple and friendly chat robot extension for Visual Studio Code that provides an interactive chat interface right within your editor.

## Features

- 🤖 **Interactive Chat Interface**: Clean and intuitive chat UI that matches VS Code's theme
- 💬 **Real-time Messaging**: Send messages and receive instant responses from the chat robot
- 🎨 **Theme Integration**: Seamlessly integrates with VS Code's color themes (dark/light mode)
- ⚡ **Fast and Lightweight**: Built with TypeScript and optimized for performance
- 🔧 **Easy to Use**: Simple command palette integration

## Installation

### Option 1: Install from VSIX (Recommended for local use)

1. **Build the extension** (see Build Instructions below)
2. **Package the extension**:
   ```bash
   npx vsce package
   ```
3. **Install the generated VSIX file**:
   - Open VS Code
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Extensions: Install from VSIX..."
   - Select the generated `.vsix` file

### Option 2: Development Installation

1. **Clone or download** this repository
2. **Open the project** in VS Code
3. **Press F5** to run the extension in a new Extension Development Host window

## Build Instructions

### Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)
- **VS Code** (version 1.102.0 or higher)

### Build Steps

1. **Navigate to the project directory**:
   ```bash
   cd d:\AIAuthorEditor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Compile the extension**:
   ```bash
   npm run compile
   ```

4. **Watch for changes during development** (optional):
   ```bash
   npm run watch
   ```

5. **Run tests** (optional):
   ```bash
   npm test
   ```

### Build Scripts

- `npm run compile` - Compile TypeScript to JavaScript using webpack
- `npm run watch` - Watch for changes and recompile automatically
- `npm run package` - Create production build with source maps
- `npm run lint` - Run ESLint for code quality checks
- `npm test` - Run the test suite

## Usage

### Opening the Chat Robot

1. **Via Command Palette**:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Open Chat Robot"
   - Press Enter

2. **Via Menu**: The command will also appear in the command palette under the "Chat Robot" category

### Using the Chat Interface

1. **Type your message** in the input field at the bottom of the chat panel
2. **Press Enter** or click the "Send" button to send your message
3. **Receive responses** from the friendly chat robot
4. **Continue the conversation** - the chat history is maintained during the session

### Features of the Chat Interface

- **Responsive Design**: Adapts to VS Code's theme and window size
- **Message History**: Scroll through previous messages in the conversation
- **Keyboard Shortcuts**: Press Enter to send messages quickly
- **Visual Feedback**: Clear distinction between user and bot messages

## Development

### Project Structure

```
├── src/
│   ├── extension.ts          # Main extension entry point
│   └── test/
│       └── extension.test.ts # Test files
├── .vscode/
│   ├── launch.json          # Debug configuration
│   ├── tasks.json           # Build tasks
│   └── settings.json        # Project settings
├── package.json             # Extension manifest and dependencies
├── tsconfig.json           # TypeScript configuration
├── webpack.config.js       # Webpack bundling configuration
└── README.md               # This file
```

### Key Components

- **ChatRobotPanel**: Main class handling the webview panel and chat interface
- **Message Handling**: Communication between the extension and webview
- **Bot Responses**: Simple response system with randomized friendly messages
- **UI Styling**: CSS that integrates with VS Code's theme system

### Debugging

1. **Open the project** in VS Code
2. **Press F5** to launch a new Extension Development Host
3. **Set breakpoints** in `src/extension.ts`
4. **Use the chat robot** in the development host to trigger breakpoints

### Adding Features

To extend the chat robot's capabilities:

1. **Modify bot responses** in the `_handleUserMessage` method
2. **Add new commands** by registering them in the `activate` function
3. **Enhance the UI** by updating the HTML/CSS in `_getHtmlForWebview`
4. **Add persistence** by using VS Code's storage APIs

## Extension Commands

| Command ID | Title | Description |
|------------|-------|-------------|
| `Author-AI-Assistant.openChat` | Open Chat Robot | Opens the chat robot interface |
| `Author-AI-Assistant.helloWorld` | Hello World | Shows a simple greeting message |

## Configuration

Currently, this extension doesn't require any configuration. Future versions may include:

- Custom bot personality settings
- Response customization
- Theme preferences
- Chat history persistence

## Troubleshooting

### Common Issues

1. **Extension not loading**:
   - Ensure VS Code version is 1.102.0 or higher
   - Check the output panel for error messages

2. **Chat interface not opening**:
   - Try reloading the VS Code window (`Ctrl+R`)
   - Check if the extension is properly activated

3. **Build errors**:
   - Run `npm install` to ensure all dependencies are installed
   - Check Node.js version (should be 16+)

### Getting Help

If you encounter issues:

1. Check the VS Code Developer Console (`Help > Toggle Developer Tools`)
2. Look at the Output panel (`View > Output`, select "Chat Robot")
3. Review the extension logs in the Extension Development Host

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Version History

### 0.0.1 (Initial Release)
- Basic chat robot functionality
- Interactive webview interface
- Command palette integration
- Theme-aware styling
- Simple bot response system

---

**Enjoy chatting with your new VS Code robot companion!** 🤖✨ssistant README

This is the README for your extension "Author-AI-Assistant". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
