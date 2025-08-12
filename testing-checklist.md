# Chat Assistant Testing Checklist

## ✅ Basic Functionality
- [ ] Extension loads without errors
- [ ] Chat panel opens correctly via `Ctrl+Shift+W` (Cmd+Shift+W on Mac)
- [ ] Messages send successfully through webview
- [ ] Send button disables/enables properly during processing

## ✅ Message Rendering (Enhanced)
- [ ] User messages display correctly (right-aligned, user icon)
- [ ] Assistant messages render markdown (left-aligned, bot icon)
- [ ] Headers (# ## ###) render as HTML headers
- [ ] **Bold text** and *italic text* render correctly
- [ ] `Inline code` has code styling
- [ ] Line breaks preserve formatting
- [ ] **Tables render with proper HTML structure**
- [ ] **Lists (ordered and unordered) display correctly**
- [ ] **Blockquotes render with proper indentation**

## ✅ Code Block Features (Enhanced)
- [ ] **Python code blocks have syntax highlighting**
- [ ] **Multi-line code blocks preserve formatting**
- [ ] Code blocks have action buttons (Copy, Insert, Create File)
- [ ] Copy code functionality works correctly
- [ ] Insert code functionality adds to active editor
- [ ] Create file functionality creates new file with code content
- [ ] **Code block placeholders prevent double-processing**

## ✅ Interactive Features
- [ ] Copy button works for all message types
- [ ] Insert button adds content to active editor
- [ ] **Hover actions appear on assistant messages**
- [ ] Button states update correctly during operations
- [ ] **Action buttons work for both template and AI responses**

## ✅ Fallback Content System (New)
- [ ] **TemplateService provides responses when AI unavailable**
- [ ] **Python function examples display with syntax highlighting**
- [ ] **Markdown formatting examples render correctly**
- [ ] **Table examples show proper HTML table structure**
- [ ] **Template responses include action buttons**
- [ ] **Context-aware template selection works**

## ✅ User Experience
- [ ] No duplicate messages appear
- [ ] Thinking/processing indicator shows during AI calls
- [ ] Messages scroll properly in chat container
- [ ] **Auto-scroll to bottom when new messages arrive**
- [ ] **Message timestamps preserved in conversation history**
- [ ] **Smooth transitions between loading and content states**

## ✅ Conversation Persistence
- [ ] Messages persist when panel is closed and reopened
- [ ] Conversation history loads correctly on startup
- [ ] Message timestamps are preserved across sessions
- [ ] Clear conversation command works (`Command Palette` → "Clear Chat History")
- [ ] Auto-scroll to latest messages on load
- [ ] **Message formatting preserved in history (including code blocks)**
- [ ] **Large conversation history loads without performance issues**

## ✅ Architecture Validation (New)
- [ ] **Modular file structure loads correctly**
- [ ] **Shared markdown renderer works consistently**
- [ ] **webviewChatPanel.ts handles all chat logic**
- [ ] **markdownRenderer.ts processes all markdown content**
- [ ] **templateService.ts provides comprehensive fallback**
- [ ] **No conflicts between modules**

## ✅ Edge Cases
- [ ] Empty messages don't send
- [ ] Multiple rapid clicks handled gracefully
- [ ] Long responses render properly without truncation
- [ ] Special characters display correctly in all contexts
- [ ] Error messages show when AI services fail
- [ ] **Markdown with mixed content (code + tables + headers) renders correctly**
- [ ] **Very long code blocks scroll properly**
- [ ] **Nested markdown elements render correctly**

## Test Messages to Try:

### 1. Basic Responses
- "hello" - Basic template response
- "How do I write a book outline?" - Structured content

### 2. Code Examples (Enhanced)
- "Show me a Python function" - **Template with syntax highlighting**
- "python function example" - **Alternative trigger for Python templates**
- "Create a Python class" - **Test AI response with code blocks**

### 3. Markdown Features (Enhanced)
- "Give me markdown formatting examples" - **Test comprehensive markdown**
- "markdown" - **Test table examples specifically**
- "show me a table" - **Test markdown table rendering**
- "formatting examples" - **Test headers, lists, bold, italic**

### 4. Educational Content
- "Create lesson plan structure" - Educational template
- "book writing tips" - Context-aware suggestions

### 5. Stress Tests (New)
- Very long message with multiple code blocks
- Message with mixed markdown (tables + code + headers)
- Rapid fire of multiple messages
- Large Python code example with complex formatting

## Commands to Test:
- **Ctrl+Shift+W** (Cmd+Shift+W on Mac) - Open Book Writing Assistant Panel
- **Ctrl+Shift+B** (Cmd+Shift+B on Mac) - Create Book Structure
- **Command Palette** → "Clear Chat History" - Clear conversation history

## Expected Behaviors:

### Message Display
- User messages: Plain text, right-aligned, user icon
- Assistant messages: Markdown rendered, left-aligned, bot icon, action buttons
- **Template responses: Same formatting as AI responses**

### Code Block Rendering
- **Python syntax highlighting with proper color coding**
- Copy/Insert/Create file buttons on all code blocks
- **Proper indentation preservation**
- **Multi-line code blocks maintain structure**

### Markdown Features
- **Tables: HTML table structure with borders**
- **Headers: H1, H2, H3 with proper hierarchy**
- **Lists: Ordered (1,2,3) and unordered (•) with proper nesting**
- **Mixed content: All elements render correctly together**

### UI Consistency
- **Copilot-like appearance maintained**
- **Smooth interactions without flickering**
- **Consistent button behavior across all message types**
- **Proper loading states during AI processing**

## Performance Expectations:
- **Initial load: < 2 seconds**
- **Message rendering: < 500ms**
- **Code block highlighting: Immediate**
- **Large conversation history: < 3 seconds to load**
- **No memory leaks during extended use**
