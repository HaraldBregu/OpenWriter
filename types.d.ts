//global types definition must not be abused,
//only use it when you need to extend the global object to let communicate electron with the renderer process (react)

interface Alert {
    message: string,
    type: string,
    comments?: CategoryState[] | [];
}

interface EditorContent {
    mainText: string;
    apparatusText: string;
    comments?: CategoryState[] | [];

}

type JsonValue = string | number | boolean | null;
type JsonArray = Array<JsonValue | JsonObject>;
interface JsonObject {
    [key: string]: JsonValue | JsonObject | JsonArray;
}

interface DocumentContentParsed {
    mainText: JsonObject | null;
    apparatusText: JsonObject | null
    comments?: CategoryState[] | [];
}

interface ErrorDetails {
    errorCode: number;
    errorMessage: string;
    stack?: string;
}

interface PerformanceDetails {
    durationMs: number;
    memoryUsage?: number;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    process: 'main' | 'renderer';
    category: string;
    message: string;
    details?: ErrorDetails | PerformanceDetails;
    duration?: number;
}

type LigatureType = "standard" | "all" | "none";

interface CommentState {
    id: string;
    title: string;
    selectedText: string;
    comment: string;
}

interface CategoryState {
    id: string;
    name: string;
    comments: CommentState[];
}
