import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { LoggerService } from './logger';
import type { Theme, CustomThemeInfo, ThemeData } from '../../shared/types';

const THEME_FILE_NAME = 'theme.json';

const THEME_DATA_KEYS: readonly (keyof Omit<ThemeData, 'titleBar'>)[] = [
	'background',
	'foreground',
	'text',
	'icon',
] as const;

const TITLE_BAR_KEYS: readonly (keyof ThemeData['titleBar'])[] = [
	'background',
	'foreground',
	'text',
	'icon',
] as const;

const THEME_REQUIRED_FIELDS = ['name', 'description', 'author', 'version', 'license'] as const;

/**
 * Service responsible for discovering and importing custom themes
 * stored in the application's userData/themes directory.
 */
export class ThemeService {
	private readonly logger: LoggerService;

	constructor(logger: LoggerService) {
		this.logger = logger;
	}

	getThemesDirectory(): string {
		const themesDir = path.join(app.getPath('userData'), 'themes');
		fs.mkdirSync(themesDir, { recursive: true });
		return themesDir;
	}

	listThemes(): CustomThemeInfo[] {
		const themesDir = this.getThemesDirectory();
		const themes: CustomThemeInfo[] = [];

		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(themesDir, { withFileTypes: true });
		} catch (err) {
			this.logger.error('ThemeService', 'Failed to read themes directory', err);
			return [];
		}

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const manifestPath = path.join(themesDir, entry.name, THEME_FILE_NAME);
			if (!fs.existsSync(manifestPath)) continue;

			try {
				const raw = fs.readFileSync(manifestPath, 'utf-8');
				const parsed: unknown = JSON.parse(raw);
				const manifest = this.validateTheme(parsed);

				themes.push({
					id: entry.name,
					name: manifest.name,
					description: manifest.description,
					author: manifest.author,
					version: manifest.version,
					license: manifest.license,
				});
			} catch (err) {
				this.logger.warn('ThemeService', `Skipping invalid theme "${entry.name}"`, err);
			}
		}

		return themes;
	}

	getThemeById(id: string): Theme | null {
		const manifestPath = path.join(this.getThemesDirectory(), id, THEME_FILE_NAME);
		if (!fs.existsSync(manifestPath)) return null;

		try {
			const raw = fs.readFileSync(manifestPath, 'utf-8');
			const parsed: unknown = JSON.parse(raw);
			return this.validateTheme(parsed);
		} catch (err) {
			this.logger.warn('ThemeService', `Failed to load theme "${id}"`, err);
			return null;
		}
	}

	importThemeFromPath(sourcePath: string): CustomThemeInfo {
		const manifestPath = path.join(sourcePath, THEME_FILE_NAME);
		if (!fs.existsSync(manifestPath)) {
			throw new Error(`No ${THEME_FILE_NAME} found in the selected folder`);
		}

		const raw = fs.readFileSync(manifestPath, 'utf-8');
		const parsed: unknown = JSON.parse(raw);
		const manifest = this.validateTheme(parsed);

		const folderName = this.sanitizeFolderName(manifest.name);
		if (folderName.length === 0) {
			throw new Error('Theme name results in an empty folder name after sanitization');
		}

		const destPath = path.join(this.getThemesDirectory(), folderName);
		fs.cpSync(sourcePath, destPath, { recursive: true });

		this.logger.info('ThemeService', `Imported theme "${manifest.name}" to ${destPath}`);

		return {
			id: folderName,
			name: manifest.name,
			description: manifest.description,
			author: manifest.author,
			version: manifest.version,
			license: manifest.license,
		};
	}

	private validateTheme(data: unknown): Theme {
		if (typeof data !== 'object' || data === null) {
			throw new Error('Theme manifest must be a JSON object');
		}

		const obj = data as Record<string, unknown>;

		for (const field of THEME_REQUIRED_FIELDS) {
			if (typeof obj[field] !== 'string' || (obj[field] as string).trim().length === 0) {
				throw new Error(`Theme manifest is missing required field: "${field}"`);
			}
		}

		this.validateThemeData(obj['light'], 'light');
		this.validateThemeData(obj['dark'], 'dark');

		return data as Theme;
	}

	private validateThemeData(data: unknown, variant: string): void {
		if (typeof data !== 'object' || data === null) {
			throw new Error(`Theme is missing "${variant}" data object`);
		}

		const obj = data as Record<string, unknown>;
		for (const key of THEME_DATA_KEYS) {
			if (typeof obj[key] !== 'string') {
				throw new Error(`Theme "${variant}" data missing required key: "${key}"`);
			}
		}

		if (typeof obj['titleBar'] !== 'object' || obj['titleBar'] === null) {
			throw new Error(`Theme "${variant}" data missing required "titleBar" object`);
		}

		const titleBar = obj['titleBar'] as Record<string, unknown>;
		for (const key of TITLE_BAR_KEYS) {
			if (typeof titleBar[key] !== 'string') {
				throw new Error(`Theme "${variant}" titleBar missing required key: "${key}"`);
			}
		}
	}

	private sanitizeFolderName(name: string): string {
		return name
			.replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
			.replace(/\s+/g, '_')
			.trim();
	}
}
