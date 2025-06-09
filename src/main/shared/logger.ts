import { app, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const ENABLE_LOG = false;

enum LogLevel {
    DEBUG = 'DEBUG',
    ERROR = 'ERROR',
    INFO = 'INFO'
}

// MainLogger manages logging, using a singleton pattern.
class MainLogger {
    private static instance: MainLogger;
    private logFile: string;
    private taskTimers: Map<string, number>;

    // Constructor: Initializes log file path, ensures logs directory exists, and sets up IPC listener for logging.
    private constructor() {
        const userDataPath = app.getPath('userData');
        const logDir = path.join(userDataPath, 'logs');

        // Ensures the logs directory exists. if not, creates it.
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        // Creates a log file with the current date.
        this.logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
        this.taskTimers = new Map();

        // Listens for log entries sent via IPC and persists them.
        ipcMain.on('log-entry', (_, entry: LogEntry) => {
            this.persistLog(entry);
        });
    }

    // getInstance: Implements the singleton pattern to ensure only one instance exists.
    public static getInstance(): MainLogger {
        if (!MainLogger.instance) {
            MainLogger.instance = new MainLogger();
        }
        return MainLogger.instance;
    }

    // startTask: Records the start time for a task and logs a start message.
    public startTask(category: string, message: string): string {
        const taskId = `${category}-${Date.now()}`;
        this.taskTimers.set(taskId, performance.now());

        // Performance details initialized, duration will be calculated later.
        const performanceDetails: PerformanceDetails = {
            durationMs: 0
        };

        this.log(LogLevel.DEBUG, category, `START: ${message}`, performanceDetails);
        return taskId;
    }

    // endTask: Calculates task duration and logs an end message.
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

    // debug: Helper method to log debug-level information.
    public debug(category: string, message: string, details?: PerformanceDetails): void {
        this.log(LogLevel.DEBUG, category, message, details);
    }

    // error: Helper method to log error-level information and include error details.
    public error(category: string, message: string, error?: Error): void {
        const errorDetails: ErrorDetails = {
            errorCode: error?.name ? 500 : 0,
            errorMessage: error?.message || message,
            stack: error?.stack
        };

        this.log(LogLevel.ERROR, category, message, errorDetails);
    }

    // info: Helper method to log informational messages.
    public info(category: string, message: string, details?: PerformanceDetails): void {
        this.log(LogLevel.INFO, category, message, details);
    }

    // log: Formats the log entry with timestamp, level, and additional details, then persists it.
    private log(
        level: LogLevel,
        category: string,
        message: string,
        details?: ErrorDetails | PerformanceDetails
    ): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            process: 'main',
            category,
            message,
            details
        };

        this.persistLog(entry);
    }

    // persistLog: Appends the log entry to the log file and optionally prints it to the console.
    persistLog(entry: LogEntry): void {
        fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');

        if (process.env.NODE_ENV !== 'production' && ENABLE_LOG) {
            console.log(JSON.stringify(entry, null, 2));
        }
    }
}

export const mainLogger = MainLogger.getInstance();