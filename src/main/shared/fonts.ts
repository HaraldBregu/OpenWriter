import fs from 'fs';
import os from 'os';
import path from 'path';
import * as fontkit from 'fontkit';
import { unicodeName } from 'unicode-name';
import { getCachePath } from './util';

if (!fs.existsSync(getCachePath())) {
    fs.mkdirSync(getCachePath());
}

const CACHE_FILE = path.join(getCachePath(), 'fonts.json');

let fontCache = {};

const unicodeSubsets: Subset[] = [
    { "name": "Basic Latin", "start": 160, "end": 591 },
    { "name": "Greek and Coptic", "start": 880, "end": 1023 },
    { "name": "Cyrillic", "start": 1024, "end": 1279 },
    { "name": "Cyrillic Supplement", "start": 1280, "end": 1327 },
    { "name": "Hebrew", "start": 1424, "end": 1535 },
    { "name": "Arabic", "start": 1536, "end": 1791 },
    { "name": "Arabic Supplement", "start": 1872, "end": 1919 },
    { "name": "Arabic Extended-A", "start": 2208, "end": 2303 },
    { "name": "Arabic Presentation Forms-A", "start": 64336, "end": 65023 },
    { "name": "Arabic Presentation Forms-B", "start": 65136, "end": 65279 },
    { "name": "Devanagari", "start": 2304, "end": 2431 },
    { "name": "Devanagari Extended", "start": 43296, "end": 43311 },
    { "name": "Arrows", "start": 8592, "end": 8703 },
    { "name": "Mathematical Operators", "start": 8704, "end": 8959 },
    { "name": "Misc Technical", "start": 8960, "end": 9215 },
    { "name": "Geometric Shapes", "start": 9632, "end": 9727 },
    { "name": "Misc Symbols", "start": 9728, "end": 9983 },
    { "name": "Dingbats", "start": 9984, "end": 10175 },
    { "name": "Currency Symbols", "start": 8352, "end": 8399 },
    { "name": "Box Drawing", "start": 9472, "end": 9599 },
    { "name": "General Punctuation", "start": 8192, "end": 8303 },
    { "name": "Superscripts and Subscripts", "start": 8304, "end": 8351 },
    { "name": "Spacing Modifier Letters", "start": 688, "end": 767 },
    { "name": "Combining Diacritical Marks", "start": 768, "end": 879 },
    { "name": "Misc Symbols and Pictographs", "start": 127744, "end": 128511 },
    { "name": "Emoticons", "start": 128512, "end": 128591 },
    { "name": "Transport and Map Symbols", "start": 128640, "end": 128767 },
    { "name": "Alchemical Symbols", "start": 128768, "end": 128895 },
];

const getSystemFontDirs = (): string[] =>  {
    const platform = os.platform();
    if (platform === 'win32') {
        return ['C:\\Windows\\Fonts'];
    } else if (platform === 'darwin') {
        return ['/System/Library/Fonts', '/Library/Fonts', path.join(os.homedir(), 'Library/Fonts')];
    } else {
        return ['/usr/share/fonts', '/usr/local/share/fonts', path.join(os.homedir(), '.fonts')];
    }
}

const walk = (dir: string): string[] => {
    const results: string[] = [];
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                results.push(...walk(fullPath));
            } else {
                results.push(fullPath);
            }
        }
    } catch {
        console.log('error');
    }
    return results;
}

const filterSymbols = (characterSet: number[]): CharacterSet => {
    if (!characterSet) {
        return [];
    }
    const grouped: CharacterSet[] = Array.from({ length: unicodeSubsets.length }, () => []);
    for (const code of characterSet) {
        const subsetIndex = unicodeSubsets.findIndex(range => code >= range.start && code <= range.end);
        if (subsetIndex !== -1) {
            grouped[subsetIndex].push({
                code,
                name: unicodeName(code) || "UNKNOWN",
            });
        }
    }
    return grouped.flat();
}

const scanFonts = (): Fonts => {
    const dirs = getSystemFontDirs();
    const fonts = {};
    for (const dir of dirs) {
        const files = walk(dir);
        for (const filePath of files) {
            try {
                const font = fontkit.openSync(filePath);
                if (!fonts[font.familyName] && font.subfamilyName.toLowerCase() === 'regular') {
                    const symbols = filterSymbols(font.characterSet);
                    const fontData = {
                        name: font.familyName,
                        path: filePath,
                        symbols
                    };
                    fonts[font.familyName] = fontData;
                }
            } catch {
                console.log(filePath, 'error loading font file');
            }
        }
    }
    return fonts;
}

// Save cache to disk when updated
const saveCacheToFile = (): void =>  {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(fontCache, null, 2), 'utf-8');
    } catch (e) {
        console.error('Error writing font cache to disk:', e);
    }
}

export const getFonts = (): Fonts => fontCache;

export const getSubsets = (): Subset[] => unicodeSubsets;

export const getSymbols = (fontName: string): CharacterSet[] => {
    if (!fontName) return [];
    return fontCache[fontName]?.symbols || [];
}; 

const initializeFonts = (): void => {
    // Load cache from disk
    try {
        console.log('file exists => ', fs.existsSync(CACHE_FILE));
        const startTime = Date.now();
        if (fs.existsSync(CACHE_FILE)) {
            const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
            fontCache = JSON.parse(raw);
        } else {
            fontCache = scanFonts();
            saveCacheToFile();
        }
        console.log(`${Object.keys(fontCache).length} font load time => `, Date.now() - startTime);
    } catch (err) {
        console.warn('Failed to read font cache:', err);
    }
}

export default initializeFonts;