
// TODO
type CustomMark = {
    id: string;
    title: string;
    description?: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    author: string;
}

/**
 * Bookmark is a type that represents a single bookmark in the text editor.
 * It is used to store the bookmark data in the text editor.
 * 
 * @property id - The id of the bookmark.
 * @property title - The title of the bookmark.
 * @property description - The description of the bookmark.
 * @property content - The content of the bookmark.
 * @property createdAt - The date and time the bookmark was created.
 * @property updatedAt - The date and time the bookmark was last updated.
 * @property author - The author of the bookmark.
 * @property categoryId - The id of the category the bookmark belongs to.
 * @property visible - Whether the bookmark is visible.
 */
type Bookmark = {
    id: string;
    title: string;
    description?: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    author: string;
    categoryId?: string;
    visible: boolean;
}

/**
 * AppComment is a type that represents a single comment in the text editor.
 * It is used to store the comment data in the text editor.
 * 
 * @property id - The id of the comment.
 * @property description - The description of the comment.      
 * @property content - The content of the comment.
 * @property target - The target of the comment.
 * @property createdAt - The date and time the comment was created.
 * @property updatedAt - The date and time the comment was last updated.
 * @property author - The author of the comment.
 * @property categoryId - The id of the category the comment belongs to.
 * @property visible - Whether the comment is visible.
 */
type AppComment = {
    id: string;
    description?: string;
    content: string;
    target: CommentTarget;
    createdAt: string;
    updatedAt: string;
    author: string;
    categoryId?: string;
    visible: boolean;
}

/**
 * CommentTarget is a type that represents the target of the comment.
 * It is used to store the target of the comment in the text editor.
 * 
 * @property MAIN_TEXT - The main text.
 * @property APPARATUS_TEXT - The apparatus text.
 */
type CommentTarget = 'MAIN_TEXT' | 'APPARATUS_TEXT'

type Category = {
    id: string;
    name: string;
}

type BookmarkCategory = Category<Bookmark>

type CommentCategory = Category<AppComment>

/**
 * Apparatus is a type that represents a single apparatus in the text editor.
 * It is used to store the apparatus data in the text editor.
 * 
 * @property id - The id of the apparatus.
 * @property title - The title of the apparatus.
 * @property type - The type of the apparatus.
 * @property visible - Whether the apparatus is visible.
 */
type Apparatus = {
    id: string;
    title: string;
    type: ApparatusType;
    visible: boolean;
    disabled: boolean;
}

/**
 * ApparatusType is a type that represents the type of the apparatus.
 * It is used to store the type of the apparatus in the text editor.
 * 
 * @property CRITICAL - The critical apparatus.
 * @property PAGE_NOTES - The page notes apparatus.
 * @property SECTION_NOTES - The section notes apparatus.
 * @property INNER_MARGIN - The inner margin apparatus.
 * @property OUTER_MARGIN - The outer margin apparatus.
 */
type ApparatusType = 'CRITICAL' | 'PAGE_NOTES' | 'SECTION_NOTES' | 'INNER_MARGIN' | 'OUTER_MARGIN';

/**
 * DocumentApparatus is a type that represents a single apparatus in the text editor.
 * It is used to store the apparatus data in the text editor.
 * 
 * @property title - The title of the apparatus.
 * @property type - The type of the apparatus.
 */
type DocumentApparatus = Pick<Apparatus, 'title' | 'type'> & {
    content: object | null
}

type FileNameExt = '.critx' | '.pdf' | '.png' | '.jpg' | '.jpeg'

type FileType = FileNameExt extends `.${infer T}` ? T : never

type NodeTextAlign = "left" | "center" | "right" | "justify"

type ElementAttribute = {
    fontSize: string
    fontFamily: string
    fontWeight: string
    fontStyle: string;
    textAlign: NodeTextAlign;
    color: string
    lineHeight: string;
    marginLeft: string;
    marginRight: string;
    marginTop: string;
    marginBottom: string;
}

type TargetTypeStyle =
    "TOC"
    | "TOC_H1"
    | "TOC_H2"
    | "TOC_H3"
    | "TOC_H4"
    | "TOC_H5"
    | "TITLE"
    | "H1"
    | "H2"
    | "H3"
    | "H4"
    | "H5"
    | "P"
    | "APP_LEM"
    | "APP_VAR"
    | "ANN"
    | "NOTE_REF_TXT"
    | "NOTE_REF_FOOT"
    | "NOTE";

/**
 * Represents a text style used in the current template.
 * A style defines how a specific semantic element (e.g., heading, paragraph, note)
 * should be rendered in terms of typography and appearance.
 *
 * This type is used to store all relevant formatting information for that style,
 * and whether it is currently enabled or not.
 *
 * @property name - The display name of the style (e.g., "Title H1", "Note Reference").
 * @property enabled - Whether this style is currently active and usable in the editor.
 * @property type - The semantic category or structural type of the style.
 * @property fontWeight - The font weight (e.g., "normal", "bold").
 * @property fontStyle - The font style (e.g., "normal", "italic").
 * @property color - The text color in CSS format (e.g., "#000000").
 * @property fontFamily - CSS font style (e.g., "Times New Roman").
 * @property fontSize - CSS font size (e.g., "12pt", "1.2em").
 * @property align - Text alignment ("left", "center", "right", "justify").
 * @property lineHeight - Line height (e.g., "1.5", "120%", "1.2em").
 * @property marginTop - Top margin (e.g., "10px", "0.5em").
 * @property marginBottom - Bottom margin (e.g., "10px", "0.5em").
 */
type Style = {
    name: string;
    enabled: boolean;
    type: TargetTypeStyle;
    fontWeight: string
    color: string
    fontFamily: string
    fontSize: string
    align: NodeTextAlign;
    lineHeight: string;
    marginTop: string;
    marginBottom: string;
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

type Route = '/' | '/file-viewer' | '/browser-tab-bar' | '/about';

type WebContentsRoute = Partial<Route, '/' | '/file-viewer'>

type TabType = FileType

type TabInfo = {
    id: number
    name: string
    type: TabType
    changed: boolean
}

type Tab = {
    id: number
    route: WebContentsRoute
    selected: boolean
    filePath: string | null
}
