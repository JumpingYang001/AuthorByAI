# Chat Assistant Testing Checklist

## ✅ Basic Functionality
- [ ] Extension loads without errors
- [ ] Chat panel opens correctly via `Ctrl+Shift+C` (Cmd+Shift+C on Mac)
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
- [ ] **Insert button adds content to active editor AND returns focus to editor**
- [ ] **Create file button creates new file AND focuses the new file**
- [ ] **Hover actions appear on assistant messages**
- [ ] Button states update correctly during operations
- [ ] **Action buttons work for both template and AI responses**
- [ ] **No focus remains in webview after insert operations**

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

### 6. Focus Management Tests (Critical)
- **Insert Content Focus Test**:
  1. Open a file in editor and position cursor
  2. Open chat assistant in separate panel/tab
  3. Send message: "Show me a Python function"
  4. Click "Insert" button on the response
  5. **Verify**: Content inserted at cursor AND focus returns to editor (not webview)
  6. **Verify**: Cursor positioned after inserted content
  
- **Create File Focus Test**:
  1. Open chat assistant
  2. Send message: "Show me a Python function"
  3. Click "Create File" button on code block
  4. **Verify**: New file opens with code AND focus is on new file
  5. **Verify**: No focus remains in webview

### 7. Content Generation Template Tests (Critical)
- **Main Panel Content Generation**:
  1. Open Content Generator (`Ctrl+Shift+B`)
  2. Select "Chapter Outline" content type
  3. Enter topic: "JavaScript Fundamentals" 
  4. Enter domain: "Programming"
  5. Click "Generate Content"
  6. **Verify**: Generates actual chapter outline template (NOT markdown examples)
  7. **Verify**: Content includes learning objectives, chapter structure, etc.
  
- **Different Content Types Test**:
  1. Test "Lesson Content" - should generate lesson template
  2. Test "Exercise" - should generate exercise template  
  3. Test "Quiz" - should generate quiz template
  4. Test "Summary" - should generate summary template
  5. **Verify**: Each generates appropriate template structure
  6. **Verify**: Templates contain topic-specific content

## Commands to Test:
- **Ctrl+Shift+C** (Cmd+Shift+C on Mac) - Open Book Writing Assistant Panel
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
