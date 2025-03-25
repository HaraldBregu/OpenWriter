import { LogLevel } from "./logEnum";

class RendererLogger {
    private static instance: RendererLogger;
    private taskTimers: Map<string, number>;

    // Constructor: Initializes the task timers map.
    private constructor() {
        this.taskTimers = new Map();
    }

    // getInstance: Implements singleton pattern to ensure only one instance is created.
    public static getInstance(): RendererLogger {
        if (!RendererLogger.instance) {
            RendererLogger.instance = new RendererLogger();
        }
        return RendererLogger.instance;
    }

    // startTask: Starts a new task by recording its start time and logging the start message.
    public startTask(category: string, message: string): string {
        const taskId = `${category}-${Date.now()}`;
        this.taskTimers.set(taskId, performance.now());

        const performanceDetails: PerformanceDetails = {
            durationMs: 0  // Duration will be updated upon task completion.
        };

        this.log(LogLevel.DEBUG, category, `START: ${message}`, performanceDetails);
        return taskId;
    }

    // endTask: Ends a task, computes its duration and logs the end message.
    public endTask(taskId: string, category: string, message: string): void {
        const startTime = this.taskTimers.get(taskId);
        if (startTime) {
            const duration = performance.now() - startTime;
            const performanceDetails: PerformanceDetails = {
                durationMs: Number(duration.toFixed(2))
            };

            this.log(LogLevel.DEBUG, category, `END: ${message}`, performanceDetails);
            this.taskTimers.delete(taskId);
        }
    }

    // debug: Logs a debug-level message with optional performance details.
    public debug(category: string, message: string, details?: PerformanceDetails): void {
        this.log(LogLevel.DEBUG, category, message, details);
    }

    // error: Logs an error-level message with error details if provided.
    public error(category: string, message: string, error?: Error): void {
        const errorDetails: ErrorDetails = {
            errorCode: error?.name ? 500 : 0,
            errorMessage: error?.message || message,
            stack: error?.stack
        };

        this.log(LogLevel.ERROR, category, message, errorDetails);
    }

    // log: Formats the log entry and sends it to the main process via window.electron.sendLog.
    private log(
        level: LogLevel,
        category: string,
        message: string,
        details?: ErrorDetails | PerformanceDetails
    ): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            process: 'renderer',
            category,
            message,
            details
        };

        // Sends the log entry via the defined electron API.
        //window.electron.sendLog(entry);
        window.electron.ipcRenderer.send('log-entry', entry)

        if (process.env.NODE_ENV !== 'production') {
            console.log(JSON.stringify(entry, null, 2));
        }
    }
}

export const rendererLogger = RendererLogger.getInstance();