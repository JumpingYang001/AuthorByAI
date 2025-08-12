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

## ✅ Edge Cases
- [ ] Empty messages don't send
- [ ] Multiple rapid clicks handled
- [ ] Long responses render properly
- [ ] Special characters display correctly
- [ ] Error messages show when needed

## Test Messages to Try:
1. "hello" - Basic response
2. "How do I write a book outline?" - Structured content
3. "Show me a Python function" - Code example
4. "Give me markdown formatting examples" - Test rendering
5. "Create lesson plan structure" - Educational content

## Expected Behaviors:
- User messages: Plain text, right-aligned, user icon
- Assistant messages: Markdown rendered, left-aligned, bot icon, action buttons
- Code blocks: Syntax highlighting, copy/insert/create file buttons
- UI: Copilot-like appearance, smooth interactions
