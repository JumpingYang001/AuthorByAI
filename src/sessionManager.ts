import { ActivityRecord, SessionContext, ProjectContext } from './types';

/**
 * Singleton class to manage session context across the extension
 */
export class SessionContextManager {
    private static _instance: SessionContextManager;
    
    private _context: SessionContext = {
        recentActivities: [],
        currentProject: {
            generatedFiles: []
        }
    };

    public static getInstance(): SessionContextManager {
        if (!SessionContextManager._instance) {
            SessionContextManager._instance = new SessionContextManager();
        }
        return SessionContextManager._instance;
    }

    public addToContext(action: ActivityRecord['action'], details: string, metadata?: any): void {
        this._context.recentActivities.push({
            timestamp: new Date(),
            action,
            details,
            ...metadata
        });
        
        // Keep only last 10 activities to prevent memory issues
        if (this._context.recentActivities.length > 10) {
            this._context.recentActivities = this._context.recentActivities.slice(-10);
        }
    }

    public addActivity(activity: ActivityRecord): void {
        this._context.recentActivities.push(activity);
        
        // Keep only last 10 activities to prevent memory issues
        if (this._context.recentActivities.length > 10) {
            this._context.recentActivities = this._context.recentActivities.slice(-10);
        }
    }

    public setCurrentProject(project: Partial<ProjectContext>): void {
        this._context.currentProject = {
            ...this._context.currentProject,
            ...project
        };
    }

    public addGeneratedFile(filename: string): void {
        this._context.currentProject.generatedFiles.push(filename);
    }

    public getContextSummary(): string {
        const recent = this._context.recentActivities.slice(-5); // Last 5 activities
        const project = this._context.currentProject;
        
        let contextSummary = '';
        
        if (project.mainTopic && project.domain) {
            contextSummary += `CURRENT PROJECT CONTEXT:\n`;
            contextSummary += `- Main Topic: ${project.mainTopic}\n`;
            contextSummary += `- Domain: ${project.domain}\n`;
            contextSummary += `- Generated Files: ${project.generatedFiles.length > 0 ? project.generatedFiles.join(', ') : 'None yet'}\n\n`;
        }
        
        if (recent.length > 0) {
            contextSummary += `RECENT ACTIVITIES:\n`;
            recent.forEach((activity, index) => {
                const timeAgo = Math.round((Date.now() - activity.timestamp.getTime()) / 60000); // minutes ago
                contextSummary += `${index + 1}. ${activity.details} (${timeAgo} min ago)\n`;
            });
            contextSummary += '\n';
        }
        
        return contextSummary;
    }

    public getCurrentProject(): ProjectContext {
        return this._context.currentProject;
    }

    public getRecentContext(actionType: ActivityRecord['action']): ActivityRecord[] {
        return this._context.recentActivities
            .filter(activity => activity.action === actionType)
            .slice(-3); // Get last 3 activities of this type
    }

    public reset(): void {
        this._context = {
            recentActivities: [],
            currentProject: {
                generatedFiles: []
            }
        };
    }
}
