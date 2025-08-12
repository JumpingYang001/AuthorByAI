# Chat Assistant Testing Checklist

## ✅ Basic Functionality
- [ ] Extension loads without errors
- [ ] Chat panel opens correctly
- [ ] Messages send successfully
- [ ] Send button disables/enables properly

## ✅ Message Rendering
- [ ] User messages display correctly
- [ ] Assistant messages render markdown
- [ ] Headers (# ## ###) render as HTML headers
- [ ] **Bold text** renders bold
- [ ] `Inline code` has code styling
- [ ] Line breaks preserve formatting

## ✅ Interactive Features
- [ ] Copy button works for messages
- [ ] Insert button adds content to active editor
- [ ] Code blocks have action buttons
- [ ] Copy code functionality works
- [ ] Insert code functionality works
- [ ] Create file functionality works

## ✅ User Experience
- [ ] No duplicate messages appear
- [ ] Thinking/processing indicator shows
- [ ] Messages scroll properly
- [ ] Hover actions appear on messages
- [ ] Button states update correctly

## ✅ Conversation Persistence
- [ ] Messages persist when panel is closed and reopened
- [ ] Conversation history loads correctly on startup
- [ ] Message timestamps are preserved
- [ ] Clear conversation command works
- [ ] Auto-scroll to latest messages on load
- [ ] Message formatting preserved in history
## ✅ Edge Cases
- [ ] Empty messages don't send
- [ ] Multiple rapid clicks handled
- [ ] Long responses render properly
- [ ] Special characters display correctly
- [ ] Error messages show when needed
- [ ] Large conversation history loads without lag

## Test Messages to Try:
1. "hello" - Basic response
2. "How do I write a book outline?" - Structured content
3. "Show me a Python function" - **Code example with syntax highlighting**
4. "Give me markdown formatting examples" - **Test rendering & formatting**
5. "Create lesson plan structure" - Educational content

## Commands to Test:
- **Ctrl+Shift+W** (Cmd+Shift+W on Mac) - Open Book Writing Assistant Panel
- **Ctrl+Shift+B** (Cmd+Shift+B on Mac) - Create Book Structure
- **Command Palette** → "Clear Chat History" - Clear conversation history

## Expected Behaviors:
- User messages: Plain text, right-aligned, user icon
- Assistant messages: Markdown rendered, left-aligned, bot icon, action buttons
- Code blocks: Syntax highlighting, copy/insert/create file buttons
- UI: Copilot-like appearance, smooth interactions

## New Test Templates Added:
### Python Function Test:
- **Trigger**: "Show me a Python function" or "python function"
- **Expected**: Multi-line Python code block with syntax highlighting
- **Features to test**: Copy code, Insert code, Create file buttons

### Markdown Formatting Test:
- **Trigger**: "Give me markdown formatting examples" or "markdown formatting"
- **Expected**: Headers, bold, italic, code, lists, blockquotes
- **Features to test**: Proper HTML rendering, Insert button for formatted content
