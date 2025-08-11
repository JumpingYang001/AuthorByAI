import * as vscode from 'vscode';
import { SessionContextManager } from './sessionManager';

/**
 * Service for creating and managing book project structures
 */
export class BookStructureService {
    private static _instance: BookStructureService;

    public static getInstance(): BookStructureService {
        if (!BookStructureService._instance) {
            BookStructureService._instance = new BookStructureService();
        }
        return BookStructureService._instance;
    }

    /**
     * Creates a complete book structure in the current workspace
     */
    public async createBookStructure(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            // Offer to open a folder instead of just showing an error
            const action = await vscode.window.showWarningMessage(
                'No workspace folder is open. Would you like to open a folder to create your book structure?',
                'Open Folder',
                'Cancel'
            );
            
            if (action === 'Open Folder') {
                // Open folder dialog
                const folderUri = await vscode.window.showOpenDialog({
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                    openLabel: 'Select Folder for Book Project'
                });

                if (folderUri && folderUri[0]) {
                    // Open the selected folder as workspace
                    await vscode.commands.executeCommand('vscode.openFolder', folderUri[0], false);
                    // Note: After opening folder, VS Code will reload and the extension will reactivate
                    // So we show a message about what to do next
                    vscode.window.showInformationMessage(
                        'Folder opened! Please run "Create Book Structure" command again after VS Code reloads.'
                    );
                }
            }
            return;
        }

        try {
            // Ask user for book title
            const bookTitle = await this._promptForBookTitle();
            if (!bookTitle) {
                return; // User cancelled
            }

            // Create the complete structure
            await this._createDirectories(workspaceFolder.uri);
            await this._createInitialFiles(workspaceFolder.uri, bookTitle);
            await this._updateSessionContext(bookTitle);

            // Show success message and open outline
            vscode.window.showInformationMessage(
                `Book structure created successfully for "${bookTitle}"! Check your workspace for the new folders and files.`
            );

            // Open the book outline file
            await this._openBookOutline(workspaceFolder.uri);

            // Automatically open the Book Writing Assistant sidebar for immediate use
            await this._openBookWritingSidebar();

        } catch (error) {
            console.error('Error creating book structure:', error);
            vscode.window.showErrorMessage(`Failed to create book structure: ${error}`);
        }
    }

    /**
     * Prompts user for book title with validation
     */
    private async _promptForBookTitle(): Promise<string | undefined> {
        return await vscode.window.showInputBox({
            prompt: 'Enter your book title',
            placeHolder: 'e.g., Advanced JavaScript Programming',
            validateInput: (value) => {
                return value.trim() ? null : 'Book title cannot be empty';
            }
        });
    }

    /**
     * Creates the directory structure for the book
     */
    private async _createDirectories(baseUri: vscode.Uri): Promise<void> {
        const folders = [
            'chapters',
            'exercises',
            'quizzes',
            'summaries',
            'assets/images',
            'assets/code-examples',
            'templates'
        ];

        for (const folder of folders) {
            const folderUri = vscode.Uri.joinPath(baseUri, folder);
            await vscode.workspace.fs.createDirectory(folderUri);
        }
    }

    /**
     * Creates initial files with content templates
     */
    private async _createInitialFiles(baseUri: vscode.Uri, bookTitle: string): Promise<void> {
        const files = [
            {
                path: 'README.md',
                content: this._generateReadmeContent(bookTitle)
            },
            {
                path: 'book-outline.md',
                content: this._generateBookOutlineContent(bookTitle)
            },
            {
                path: 'chapters/.gitkeep',
                content: ''
            },
            {
                path: 'exercises/.gitkeep',
                content: ''
            },
            {
                path: 'quizzes/.gitkeep',
                content: ''
            },
            {
                path: 'summaries/.gitkeep',
                content: ''
            }
        ];

        for (const file of files) {
            const fileUri = vscode.Uri.joinPath(baseUri, file.path);
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(file.content, 'utf8'));
        }
    }

    /**
     * Generates README.md content for the book project
     */
    private _generateReadmeContent(bookTitle: string): string {
        return `# ${bookTitle}

## Book Structure

This book is organized into the following sections:

- **chapters/**: Main content chapters
- **exercises/**: Hands-on activities and exercises
- **quizzes/**: Assessment materials
- **summaries/**: Chapter and section summaries
- **assets/**: Images, code examples, and other resources
- **templates/**: Reusable content templates

## Getting Started

Use the Book Writing Assistant extension to generate content for each section.

### Available Commands

- **Create Content**: Use the Content Generator sidebar to create new chapters, lessons, exercises, quizzes, and summaries
- **Chat Assistant**: Ask questions and get help with your writing in the Chat sidebar
- **Content Types**: Generate different types of educational content with AI assistance

### Content Generation Workflow

1. Open the **Content Generator** sidebar panel
2. Select the type of content you want to create
3. Enter the topic and any specific requirements
4. Click "Generate Content" to create AI-powered educational material
5. Save the generated content to appropriate folders

### Tips for Best Results

- Be specific about your target audience
- Include relevant context and examples
- Use the chat assistant to refine and improve content
- Organize content into logical chapter structures

## Project Structure

\`\`\`
${bookTitle}/
├── README.md                 # This file
├── book-outline.md          # Overall book structure and outline
├── chapters/                # Main content chapters
├── exercises/               # Hands-on activities
├── quizzes/                # Assessment materials
├── summaries/              # Chapter summaries
├── assets/                 # Images, code examples, resources
│   ├── images/
│   └── code-examples/
└── templates/              # Reusable content templates
\`\`\`

---

*Generated by Book Writing Assistant - VS Code Extension*
`;
    }

    /**
     * Generates book-outline.md content template
     */
    private _generateBookOutlineContent(bookTitle: string): string {
        return `# ${bookTitle} - Book Outline

## Target Audience
[Describe your target readers - their background, experience level, and what they hope to achieve]

## Learning Objectives
By the end of this book, readers will be able to:
- [Objective 1]
- [Objective 2] 
- [Objective 3]
- [Add more objectives as needed]

## Prerequisites
- [Required knowledge or skills]
- [Recommended background]
- [Tools or software needed]

## Chapter Structure

### Chapter 1: Introduction
- Overview of the subject matter
- Why this topic is important
- How to use this book
- Prerequisites and setup
- Learning objectives

### Chapter 2: [Foundation Concepts]
- [Core concept 1]
- [Core concept 2]
- [Core concept 3]
- Practical examples
- Chapter summary
- Exercises

### Chapter 3: [Building on Basics]
- [Advanced topic 1]
- [Advanced topic 2]
- Real-world applications
- Best practices
- Common pitfalls
- Exercises and quiz

### Chapter 4: [Practical Applications]
- [Hands-on project 1]
- [Hands-on project 2]
- Step-by-step tutorials
- Troubleshooting guide
- Exercises

### Chapter 5: [Advanced Topics]
- [Complex concept 1]
- [Complex concept 2]
- Integration techniques
- Performance considerations
- Advanced exercises

### Chapter 6: [Best Practices and Conclusion]
- Industry best practices
- Common patterns and anti-patterns
- Future trends and developments
- Additional resources
- Final project

## Appendices

### Appendix A: Glossary
[Key terms and definitions]

### Appendix B: Resources
- Further reading
- Online resources
- Tools and libraries
- Community forums

### Appendix C: Quick Reference
- Command reference
- Code snippets
- Cheat sheets

## Assessment Strategy

### Exercises
- Hands-on coding exercises at the end of each chapter
- Progressive difficulty levels
- Real-world scenarios

### Quizzes
- Knowledge check questions
- Multiple choice and short answer
- Practical problem-solving

### Projects
- Capstone project incorporating all concepts
- Portfolio-ready examples
- Peer review opportunities

## Writing Style Guide

- Clear, concise explanations
- Step-by-step instructions
- Code examples with explanations
- Visual aids and diagrams where helpful
- Consistent terminology and formatting

---

*Use the Book Writing Assistant extension to generate content for each section of this outline.*
`;
    }

    /**
     * Updates session context with book creation activity
     */
    private async _updateSessionContext(bookTitle: string): Promise<void> {
        const sessionManager = SessionContextManager.getInstance();
        
        // Add the book creation activity
        sessionManager.addToContext('file_creation', `Created book structure for: ${bookTitle}`, {
            type: 'book_structure',
            title: bookTitle,
            timestamp: new Date().toISOString()
        });

        // Update the current project context to reflect the new book
        const currentProject = sessionManager.getCurrentProject();
        currentProject.mainTopic = bookTitle;
        currentProject.domain = 'Educational Content';
        currentProject.lastActivity = new Date();
        
        // Add initial context about the book project structure
        sessionManager.addToContext('content_generation', `Book project "${bookTitle}" initialized with complete folder structure`, {
            type: 'project_setup',
            bookTitle: bookTitle,
            folders: ['chapters', 'exercises', 'quizzes', 'summaries', 'assets', 'templates'],
            files: ['README.md', 'book-outline.md']
        });
    }

    /**
     * Opens the book outline file in the editor
     */
    private async _openBookOutline(baseUri: vscode.Uri): Promise<void> {
        const outlineUri = vscode.Uri.joinPath(baseUri, 'book-outline.md');
        const document = await vscode.workspace.openTextDocument(outlineUri);
        await vscode.window.showTextDocument(document);
    }

    /**
     * Opens the Book Writing Assistant sidebar for immediate use
     */
    private async _openBookWritingSidebar(): Promise<void> {
        // Open the Book Writing Assistant sidebar
        await vscode.commands.executeCommand('workbench.view.extension.bookWriting');
        
        // Wait a moment for the sidebar to load, then show a helpful tip
        setTimeout(() => {
            vscode.window.showInformationMessage(
                '📚 Book Writing Assistant sidebar is now open! Use the Content Generator to start creating chapters, exercises, and more.',
                'Got it!'
            );
        }, 1000);
    }
}
