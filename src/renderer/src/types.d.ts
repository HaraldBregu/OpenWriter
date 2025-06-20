interface HistoryAction {
    id: string;
    type: string;
    timestamp: number;
    content: string;
    description: string;
}

type BulletStyleType = 'ORDER' | 'BULLET' | '';

type BulletStyle = {
    type: BulletStyleType;
    style: 'decimal' | 'upper-alpha' | 'lower-alpha' | 'disc' | 'circle' | 'square' | '';
    previousType: BulletStyleType;
}

interface Spacing {
    before: number | null;
    after: number | null;
    line: number;
}

interface EmphasisState {
    headingLevel: number;
    fontFamily: string;
    fontSize: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    alignment: string;
    blockquote: boolean;
    isCodeBlock: boolean;
    bulletStyle: BulletStyle;
    highlight: string;
    textColor: string;
    superscript: boolean;
    subscript: boolean;
    spacing: Spacing;
    showNonPrintingCharacters: boolean;
}

interface HistoryState {
    lastAction: HistoryAction | null;
    recentActions: HistoryAction[];
    canUndo: boolean;
    canRedo: boolean;
    currentPosition: number;
}

type BubbleToolbarItemOption = {
    label: string;
    value?: string | null;
}

interface BubbleToolbarItem {
    icon: React.ReactNode;
    type: "button" | "dropdown";
    disabled?: boolean;
    options?: BubbleToolbarItemOption[];
    onClick?: (data?: any) => void;
}

interface UserInfo {
    gid: number
    homedir: string
    shell: string | null
    uid: number
    username: string
}

type SetupOptionType = {
    template_type: 'Community' | 'Personal',
    paperSize_name: PaperSizeName,
    paperSize_width: number,
    paperSize_height: number,
    paperSize_orientation: 'horizontal' | 'vertical',
    header_show: boolean,
    header_weight: number,
    footer_show: boolean,
    footer_weight: number,
    margin_top: number,
    margin_bottom: number,
    margin_left: number,
    margin_right: number,
    innerMarginNote_show: boolean,
    innerMarginNote_weight: number,
    outerMarginNote_show: boolean,
    outerMarginNote_weight: number,
}

type SetupDialogStateKeys = 'toc' | 'intro' | 'critical' | 'bibliography'

type SetupDialogStateType = {
    [key in SetupDialogStateKeys]: {
        visible: boolean,
        required: boolean,
        layout: LayoutType,
        apparatusDetails: TElement[]
    }
}

interface FontStyle {
    color: string,
    fontSize: string,
    fontStyle: string,
    fontWeight: string,
    type: string
}

interface PageSetupInterface {
    pageSetup: SetupOptionType,
    sort: SetupDialogStateKeys[],
    layoutTemplate: setupDialogState,
    styles?: FontStyle,
    templateName?: string
}

interface PaginationSetupProps {
    settings: HeaderSettings;
    setSettings: (settings: HeaderSettings) => void;
}

interface Template {
    template: PageSetupInterface
}

type CasingType = 'none-case' | 'all-caps' | 'small-caps' | 'title-case' | 'start-case'

type TreeItem = {
    id: string;
    headingsId?: string; // ID personalizzato per la visualizzazione
    headingIndex: number;
    name: string;
    customName: string; // Nome personalizzato per la visualizzazione
    showHeadingNumbers?: boolean; // Indica se mostrare i numeri di intestazione
    level: number;
    children: TreeItem[];
}

type TTextPosition = { from: number; to: number };