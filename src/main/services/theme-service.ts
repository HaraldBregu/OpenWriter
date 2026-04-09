import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { LoggerService } from './logger';
import type { CustomThemeManifest, CustomThemeInfo, ThemeTokens } from '../../shared/types';

const THEME_FILE_NAME = 'theme.json';

const THEME_TOKEN_KEYS: readonly (keyof ThemeTokens)[] = [
	'colorScheme',
	'background',
	'foreground',
	'card',
	'cardForeground',
	'popover',
	'popoverForeground',
	'primary',
	'primaryForeground',
	'secondary',
	'secondaryForeground',
	'muted',
	'mutedForeground',
	'accent',
	'accentForeground',
	'destructive',
	'destructiveForeground',
	'border',
	'input',
	'ring',
	'radius',
	'success',
	'successForeground',
	'warning',
	'warningForeground',
	'info',
	'infoForeground',
	'sidebarBackground',
	'sidebarForeground',
	'sidebarPrimary',
	'sidebarPrimaryForeground',
	'sidebarAccent',
	'sidebarAccentForeground',
	'sidebarBorder',
	'sidebarRing',
] as const;

const MANIFEST_REQUIRED_FIELDS = ['name', 'description', 'author', 'version', 'license'] as const;

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
				const manifest = this.validateManifest(parsed);

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

	importThemeFromPath(sourcePath: string): CustomThemeInfo {
		const manifestPath = path.join(sourcePath, THEME_FILE_NAME);
		if (!fs.existsSync(manifestPath)) {
			throw new Error(`No ${THEME_FILE_NAME} found in the selected folder`);
		}

		const raw = fs.readFileSync(manifestPath, 'utf-8');
		const parsed: unknown = JSON.parse(raw);
		const manifest = this.validateManifest(parsed);

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

	private validateManifest(data: unknown): CustomThemeManifest {
		if (typeof data !== 'object' || data === null) {
			throw new Error('Theme manifest must be a JSON object');
		}

		const obj = data as Record<string, unknown>;

		for (const field of MANIFEST_REQUIRED_FIELDS) {
			if (typeof obj[field] !== 'string' || (obj[field] as string).trim().length === 0) {
				throw new Error(`Theme manifest is missing required field: "${field}"`);
			}
		}

		this.validateTokens(obj['light'], 'light');
		this.validateTokens(obj['dark'], 'dark');

		return data as CustomThemeManifest;
	}

	private validateTokens(tokens: unknown, variant: string): void {
		if (typeof tokens !== 'object' || tokens === null) {
			throw new Error(`Theme manifest is missing "${variant}" token object`);
		}

		const obj = tokens as Record<string, unknown>;
		for (const key of THEME_TOKEN_KEYS) {
			if (typeof obj[key] !== 'string') {
				throw new Error(`Theme "${variant}" tokens missing required key: "${key}"`);
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
