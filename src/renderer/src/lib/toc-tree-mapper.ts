import { levelFormat } from '@/utils/optionsEnums';

interface AttrsProps {
    sectionType?: string;
    [key: string]: any;
}

interface DividerItem {
    type: 'sectionDivider';
    attrs: AttrsProps;
}

function isDividerItem(item: any): item is DividerItem {
    return item
        && item.type === 'sectionDivider'
        && item.attrs
        && typeof item.attrs.sectionType === 'string';
}

/**
 * Se passi un array di nodi o un doc { content: Nodo[] },
 * questa funzione estrae solo i nodi tra il sectionDivider maintext
 * e il successivo sectionDivider.
 */
const extractSectionsFromGlobalText = (
    input: any[] | { content?: any[] },
    sectionType: string
): any[] => {
    // 1) Ricaviamo un array da processare
    const items = Array.isArray(input)
        ? input
        : Array.isArray(input.content)
            ? input.content!
            : [];

    if (items.length === 0) return [];

    // 2) trova inizio e fine
    const startIndex = items.findIndex(item =>
        isDividerItem(item) && item.attrs.sectionType === sectionType
    );
    if (startIndex === -1) return [];

    const endIndex = items.findIndex((_, idx) =>
        idx > startIndex && isDividerItem(items[idx])
    );
    const finalEnd = endIndex === -1 ? items.length : endIndex;

    // 3) ritorna i nodi tra i due divider (escluso il divider d’inizio)
    return items.slice(startIndex + 1, finalEnd);
}

//ORIGINAL SOLUTION
/*const createTocTreeStructure = (
    jsonText: {},
    tocSettings?: {
        show?: boolean;
        levels: number;
        indentLevels?: boolean;
        title?: string;
        tabLeaderFormat?: string;
        showHeadingNumbers?: boolean;
        numberSeparator?: string;
        level1Format?: string;
        level2Format?: string;
        level3Format?: string;
        level4Format?: string;
        level5Format?: string;
        level6Format?: string;
    }
): TreeItem[] => {
    const maxLevel = (tocSettings?.levels || 3);
    try {
        const jsonData = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;

        if (!jsonData.content || !Array.isArray(jsonData.content)) {
            console.error("Formato JSON non valido: manca il campo 'content' o non è un array");
            return [];
        }

        const headings = jsonData.content.filter(item =>
            item.type === 'heading' &&
            item.content &&
            item.content.length > 0 &&
            item.attrs.level <= maxLevel
        );

        const extractText = (contentArray: any[]): string => {
            if (!contentArray || !Array.isArray(contentArray)) return "Nameless";
            return contentArray.map(item => item.text || "").join(" ").trim() || "Nameless";
        };

        const orderedHeadings = [...headings].sort((a, b) => {
            return jsonData.content.indexOf(a) - jsonData.content.indexOf(b);
        });

        const result: TreeItem[] = [];
        const headingStack: (TreeItem | null)[] = Array(maxLevel + 1).fill(null);
        const levelCounters: Record<string, number> = {};

        const getSeparator = (): string => {
            switch (tocSettings?.numberSeparator) {
                case '1': return ')';
                case '2': return '.';
                case '3': return '-';
                default: return '.';
            }
        };

        const separator = getSeparator();

        const generateStandardId = (level: number, parentId: string | null = null): string => {
            const parentKey = parentId || 'root';
            const counterKey = `standard_${level}_${parentKey}`;

            if (!levelCounters[counterKey]) levelCounters[counterKey] = 1;
            else levelCounters[counterKey]++;

            const num = levelCounters[counterKey];

            if (level === 1) {
                return String(num);
            } else if (parentId) {
                return `${parentId}.${num}`;
            }
            return String(num);
        };

        const generateHeadingId = (level: number, parentId: string | null = null): string | undefined => {
            if (!tocSettings?.showHeadingNumbers) {
                return undefined;
            }

            const parentKey = parentId || 'root';
            const counterKey = `custom_${level}_${parentKey}`;

            if (!levelCounters[counterKey]) levelCounters[counterKey] = 1;
            else levelCounters[counterKey]++;

            const num = levelCounters[counterKey];

            // Get format for the current level
            let formatType = "1"; // Default numeric format
            if (tocSettings) {
                switch (level) {
                    case 1: formatType = tocSettings.level1Format || "1"; break;
                    case 2: formatType = tocSettings.level2Format || "2"; break;
                    case 3: formatType = tocSettings.level3Format || "3"; break;
                    case 4: formatType = tocSettings.level4Format || "4"; break;
                    case 5: formatType = tocSettings.level5Format || "5"; break;
                    case 6: formatType = tocSettings.level6Format || "6"; break;
                    default: formatType = "1";
                }
            }

            // Format the number based on the format type
            const formattedNumber = formatNumber(num, formatType);

            if (level === 1) {
                return formattedNumber;
            } else if (parentId) {
                return `${parentId}${separator}${formattedNumber}`;
            }
            return formattedNumber;
        };

        // Helper function to format numbers according to the specified type from settings
        const formatNumber = (num: number, formatType: string): string => {
            // Cerchiamo il formato corrispondente in levelFormat usando il valore di configurazione
            const format = levelFormat.find(item => item.value === formatType);

            // Se non troviamo il formato, o se è "1" (numerazione standard), usiamo i numeri
            if (!format || format.value === "1") {
                return String(num);
            }

            // Altrimenti applichiamo il formato in base al tipo
            switch (format.value) {
                case '2': // Lowercase letters
                    return String.fromCharCode(96 + (num <= 26 ? num : 26));
                case '3': // Uppercase letters
                    return String.fromCharCode(64 + (num <= 26 ? num : 26));
                case '4': // Lowercase Roman numerals
                    return toRoman(num).toLowerCase();
                case '5': // Uppercase Roman numerals
                    return toRoman(num).toUpperCase();
                default: // Fallback a numeric
                    return String(num);
            }
        };

        // Helper function to convert number to Roman numeral
        const toRoman = (num: number): string => {
            const romanNumerals = [
                { value: 1000, symbol: 'M' },
                { value: 900, symbol: 'CM' },
                { value: 500, symbol: 'D' },
                { value: 400, symbol: 'CD' },
                { value: 100, symbol: 'C' },
                { value: 90, symbol: 'XC' },
                { value: 50, symbol: 'L' },
                { value: 40, symbol: 'XL' },
                { value: 10, symbol: 'X' },
                { value: 9, symbol: 'IX' },
                { value: 5, symbol: 'V' },
                { value: 4, symbol: 'IV' },
                { value: 1, symbol: 'I' }
            ];

            let result = '';
            for (let i = 0; i < romanNumerals.length; i++) {
                while (num >= romanNumerals[i].value) {
                    result += romanNumerals[i].symbol;
                    num -= romanNumerals[i].value;
                }
            }
            return result;
        };

        orderedHeadings.forEach(heading => {
            const level = heading.attrs.level;
            const name = extractText(heading.content);

            // Aggiorna lo stack per il livello corrente
            // Quando incontriamo un livello, resettiamo tutti i livelli successivi
            for (let i = level + 1; i <= maxLevel; i++) {
                headingStack[i] = null;
            }

            // Trova il genitore appropriato (il più vicino con livello inferiore)
            let parent: TreeItem | null = null;
            for (let i = level - 1; i >= 1; i--) {
                if (headingStack[i]) {
                    parent = headingStack[i];
                    break;
                }
            }

            // Genera sia l'ID standard che quello personalizzato
            const standardId = generateStandardId(level, parent?.id);
            const headingId = generateHeadingId(level, parent?.headingsId);

            const newHeading: TreeItem = {
                id: standardId,
                headingsId: headingId,
                name,
                customName: headingId ? headingId + ' - ' + name : name,
                showHeadingNumbers: tocSettings?.showHeadingNumbers,
                level,
                children: []
            };

            // Aggiungi la nuova intestazione al genitore o alla radice
            if (parent) {
                parent.children.push(newHeading);
            } else {
                result.push(newHeading);
            }

            // Aggiorna lo stack per questo livello
            headingStack[level] = newHeading;
        });

        return result;
    } catch (error) {
        console.error("Errore nella creazione della struttura TOC:", error);
        return [];
    }
};*/

const extractText = (contentArray: any[]): string => {
    if (!contentArray || !Array.isArray(contentArray)) return "Nameless";
    return contentArray.map(item => item.text || "").join(" ").trim() || "Nameless";
};

const createTocTreeStructure = (
    jsonText: any,
    tocSettings?: {
        show?: boolean;
        levels: number;
        indentLevels?: boolean;
        title?: string;
        tabLeaderFormat?: string;
        showHeadingNumbers?: boolean;
        numberSeparator?: string;
        level1Format?: string;
        level2Format?: string;
        level3Format?: string;
        level4Format?: string;
        level5Format?: string;
        level6Format?: string;
    }
): TreeItem[] => {
    const maxLevel = (tocSettings?.levels || 3);
    const jsonData = jsonText;

    if (!jsonData.content || !Array.isArray(jsonData.content)) {
        console.error("Formato JSON non valido: manca il campo 'content' o non è un array");
        return [];
    }

    const headings = jsonData.content.filter(item =>
        item.type === 'heading' &&
        item.content &&
        item.content.length > 0 &&
        item.attrs.level <= maxLevel
    );

    const orderedHeadings = [...headings].sort((a, b) => {
        return jsonData.content.indexOf(a) - jsonData.content.indexOf(b);
    });

    const result: TreeItem[] = [];
    const headingStack: (TreeItem | null)[] = Array(maxLevel + 1).fill(null);
    const levelCounters: Record<string, number> = {};

    const getSeparator = (): string => {
        switch (tocSettings?.numberSeparator) {
            case '1': return ')';
            case '2': return '.';
            case '3': return '-';
            default: return '.';
        }
    };

    const separator = getSeparator();

    const generateStandardId = (level: number, parentId: string | null = null): string => {
        const parentKey = parentId || 'root';
        const counterKey = `standard_${level}_${parentKey}`;

        if (!levelCounters[counterKey]) levelCounters[counterKey] = 1;
        else levelCounters[counterKey]++;

        const num = levelCounters[counterKey];

        if (level === 1) {
            return String(num);
        } else if (parentId) {
            return `${parentId}.${num}`;
        }
        return String(num);
    };

    const generateHeadingId = (level: number, parentId: string | null = null): string | undefined => {
        if (!tocSettings?.showHeadingNumbers) {
            return undefined;
        }

        const parentKey = parentId || 'root';
        const counterKey = `custom_${level}_${parentKey}`;

        if (!levelCounters[counterKey]) levelCounters[counterKey] = 1;
        else levelCounters[counterKey]++;

        const num = levelCounters[counterKey];

        // Get format for the current level
        let formatType = "1"; // Default numeric format
        if (tocSettings) {
            switch (level) {
                case 1: formatType = tocSettings.level1Format || "1"; break;
                case 2: formatType = tocSettings.level2Format || "2"; break;
                case 3: formatType = tocSettings.level3Format || "3"; break;
                case 4: formatType = tocSettings.level4Format || "4"; break;
                case 5: formatType = tocSettings.level5Format || "5"; break;
                case 6: formatType = tocSettings.level6Format || "6"; break;
                default: formatType = "1";
            }
        }

        // Format the number based on the format type
        const formattedNumber = formatNumber(num, formatType);

        if (level === 1) {
            return formattedNumber;
        } else if (parentId) {
            return `${parentId}${separator}${formattedNumber}`;
        }
        return formattedNumber;
    };

    // Helper function to format numbers according to the specified type from settings
    const formatNumber = (num: number, formatType: string): string => {
        // Cerchiamo il formato corrispondente in levelFormat usando il valore di configurazione
        const format = levelFormat.find(item => item.value === formatType);

        // Se non troviamo il formato, o se è "1" (numerazione standard), usiamo i numeri
        if (!format || format.value === "1") {
            return String(num);
        }

        // Altrimenti applichiamo il formato in base al tipo
        switch (format.value) {
            case '2': // Lowercase letters
                return String.fromCharCode(96 + (num <= 26 ? num : 26));
            case '3': // Uppercase letters
                return String.fromCharCode(64 + (num <= 26 ? num : 26));
            case '4': // Lowercase Roman numerals
                return toRoman(num).toLowerCase();
            case '5': // Uppercase Roman numerals
                return toRoman(num).toUpperCase();
            default: // Fallback a numeric
                return String(num);
        }
    };

    // Helper function to convert number to Roman numeral
    const toRoman = (num: number): string => {
        const romanNumerals = [
            { value: 1000, symbol: 'M' },
            { value: 900, symbol: 'CM' },
            { value: 500, symbol: 'D' },
            { value: 400, symbol: 'CD' },
            { value: 100, symbol: 'C' },
            { value: 90, symbol: 'XC' },
            { value: 50, symbol: 'L' },
            { value: 40, symbol: 'XL' },
            { value: 10, symbol: 'X' },
            { value: 9, symbol: 'IX' },
            { value: 5, symbol: 'V' },
            { value: 4, symbol: 'IV' },
            { value: 1, symbol: 'I' }
        ];

        let result = '';
        for (let i = 0; i < romanNumerals.length; i++) {
            while (num >= romanNumerals[i].value) {
                result += romanNumerals[i].symbol;
                num -= romanNumerals[i].value;
            }
        }
        return result;
    };

    orderedHeadings.forEach((heading, index) => {
        const level = heading.attrs.level;
        const name = extractText(heading.content);

        // Aggiorna lo stack per il livello corrente
        // Quando incontriamo un livello, resettiamo tutti i livelli successivi
        for (let i = level + 1; i <= maxLevel; i++) {
            headingStack[i] = null;
        }

        // Trova il genitore appropriato (il più vicino con livello inferiore)
        let parent: TreeItem | null = null;
        for (let i = level - 1; i >= 1; i--) {
            if (headingStack[i]) {
                parent = headingStack[i];
                break;
            }
        }

        // Genera sia l'ID standard che quello personalizzato
        const standardId = generateStandardId(level, parent?.id);
        const headingId = generateHeadingId(level, parent?.headingsId);

        const newHeading: TreeItem = {
            id: standardId,
            headingsId: headingId,
            name,
            customName: headingId ? headingId + ' - ' + name : name,
            showHeadingNumbers: tocSettings?.showHeadingNumbers,
            level,
            children: [],
            headingIndex: index,
        };

        // Aggiungi la nuova intestazione al genitore o alla radice
        if (parent) {
            parent.children.push(newHeading);
        } else {
            result.push(newHeading);
        }

        // Aggiorna lo stack per questo livello
        headingStack[level] = newHeading;
    });

    return result;
};

const createTiptapJSONStructure = (treeItems: TreeItem[], TocSettings: TocSettings, containerWidth?: number): any => {
    const tabLeaderFormat = TocSettings.tabLeaderFormat || '1';
    if (!treeItems || treeItems.length === 0) {
        return { type: 'doc', content: [] };
    }

    // Default container width of 200 if not specified
    const CONTAINER_WIDTH = containerWidth || 200;

    const convertTreeItemToTiptap = (item: TreeItem): any => {

        const getFontSize = (level: number): string => {
            switch (level) {
                case 1: return '18';
                case 2: return '16';
                case 3: return '14';
                case 4: return '12';
                case 5: return '12';
                case 6: return '10';
                default: return '12';
            }
        };

        const shouldBeItalic = (level: number): boolean => {
            return level >= 4;
        };

        const shouldBeBold = (level: number): boolean => {
            return level <= 4;
        };

        // Get font properties for this TOC item
        const fontSize = parseInt(getFontSize(item.level));
        const isBold = shouldBeBold(item.level);
        const isItalic = shouldBeItalic(item.level);

        // Get the heading text and page number text
        const titleText = (item.headingsId ? item.headingsId + ' - ' : '') + item.name;

        // Calculate indentation if enabled
        const indentationWidth = TocSettings.indentLevels ? ((item.level - 1) * fontSize * 1.2) : 0;

        // Add some padding between elements
        const padding = fontSize * 0.5; // Half of font size as padding

        // Select tab leader character
        let spacingType = '.';
        switch (tabLeaderFormat) {
            case '0': spacingType = '\u00A0'; break; // Non-breaking space
            case '1': spacingType = '.'; break;      // Dots
            case '2': spacingType = '-'; break;      // Hyphen
            case '3': spacingType = '_'; break;      // Underscore
            default: spacingType = '.';              // Default to dots
        }

        // COMPREHENSIVE FONT-AWARE APPROACH: Calculate dots precisely

        // Target position for page numbers (90% of container width for better alignment)
        const targetPosition = CONTAINER_WIDTH * 0.90;

        // Precise heading font width factor based on style
        const headingFontFactor = isBold
            ? (isItalic ? 0.75 : 0.7)    // Bold or Bold+Italic (wider)
            : (isItalic ? 0.6 : 0.65);   // Italic or Normal

        // Calculate exact width of the heading text with all factors considered
        const titleFullWidth = titleText.length * fontSize * headingFontFactor +
            indentationWidth + padding;

        // Dots use Times New Roman at 12pt
        const dotFontSize = 12; // Fixed at 12pt for dots

        // Dot width depends on character used and Times New Roman font metrics
        const dotCharWidths = {
            '\u00A0': 0.3,  // Space
            '.': 0.3,       // Dot (narrower in Times New Roman)
            '-': 0.45,      // Hyphen 
            '_': 0.52       // Underscore
        };

        // Get width for current dot character
        const dotCharWidth = dotCharWidths[spacingType] || 0.3;

        // Calculate single dot width in pixels
        const singleDotWidth = dotFontSize * dotCharWidth;

        // Calculate available width for dots
        const availableWidth = targetPosition - titleFullWidth;

        // Calculate how many dots needed to reach the target position
        const exactDotCount = Math.max(Math.round(availableWidth / singleDotWidth), 5);

        // Base minimum dots for visual appeal
        let minDots = 10;

        // Adjust minimum dots based on heading text length
        if (titleText.length < 8) {
            minDots = 50;        // Very short heading
        } else if (titleText.length < 15) {
            minDots = 40;        // Short heading
        } else if (titleText.length < 25) {
            minDots = 30;        // Medium-short heading
        } else if (titleText.length < 40) {
            minDots = 20;        // Medium heading
        }

        // Adjust for font size (smaller fonts need more dots)
        const fontSizeAdjustment = 14 / fontSize;
        minDots = Math.round(minDots * fontSizeAdjustment);

        // Final dot count is the maximum of calculated or minimum
        const finalDotCount = Math.max(exactDotCount, minDots);

        // Generate dot text
        const dotText = spacingType.repeat(finalDotCount);

        const headingNode = {
            type: 'paragraph',
            attrs: {
                class: 'toc-line',
                level: item.level
            },
            content: [
                {
                    type: 'text',
                    text: (item.headingsId ? item.headingsId + ' - ' : '') + item.name + ' ',
                    marks: [
                        ...(shouldBeBold(item.level) ? [{ type: 'bold' }] : []),
                        ...(shouldBeItalic(item.level) ? [{ type: 'italic' }] : []),
                        { type: 'textStyle', attrs: { fontSize: getFontSize(item.level) + "pt" } }
                    ]
                },
                {
                    type: 'text',
                    text: dotText,
                    marks: [
                        {
                            type: 'textStyle',
                            attrs: {
                                fontSize: "12pt",
                                fontFamily: "Times New Roman",
                                letterSpacing: "0px"
                            }
                        }
                    ]
                },
                {
                    type: 'text',
                    text: ' TDB',
                    marks: [
                        ...(shouldBeBold(item.level) ? [{ type: 'bold' }] : []),
                        ...(shouldBeItalic(item.level) ? [{ type: 'italic' }] : []),
                        { type: 'textStyle', attrs: { fontSize: getFontSize(item.level) + "pt" } }
                    ]
                }
            ]
        };

        // Create content array with the heading and all children
        const contentArray = [headingNode];

        // Process children recursively
        if (item.children && item.children.length > 0) {
            item.children.forEach(child => {
                const childNodes = convertTreeItemToTiptap(child);
                contentArray.push(...childNodes.content);
            });
        }

        return { type: 'doc', content: contentArray };
    };

    // Combine all top-level items into one document
    // const spacer = {
    //     type: 'paragraph',
    //     attrs: { class: 'toc-spacer', level: 5 },
    //     content: []
    // }
    const content: any[] = [
        // { ...spacer },
        {
            type: 'paragraph',
            attrs: {
                level: 1,
            },
            content: [
                {
                    type: 'text',
                    text: (TocSettings.title || 'TABLE OF CONTENTS').toUpperCase(),
                    marks: [
                        { type: 'textStyle', attrs: { fontSize: "18pt" } }
                    ]
                }
            ]
        },
    ];
    treeItems.forEach(item => {
        const tiptapNodes = convertTreeItemToTiptap(item);
        content.push(...tiptapNodes.content);
        // content.push({ ...spacer });
    });

    return { type: 'doc', content };
};

export { createTocTreeStructure, createTiptapJSONStructure, extractSectionsFromGlobalText };