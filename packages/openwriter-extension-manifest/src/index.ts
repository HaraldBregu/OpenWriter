import path from 'node:path';
import {
	commandActivationEvent,
	type ExtensionActivationEvent,
	type ExtensionCapability,
	type ExtensionCommandContribution,
	type ExtensionDocPageContribution,
	type ExtensionDocPanelContribution,
	type ExtensionManifest,
	type ExtensionPermission,
	EXTENSION_CAPABILITIES,
	EXTENSION_PERMISSIONS,
	isCommandActivationEvent,
	OPENWRITER_EXTENSION_API_VERSION,
} from '../../openwriter-extension-types/src/index';

export interface ParsedExtensionManifest {
	manifest: ExtensionManifest;
	errors: string[];
}

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const EXTENSION_ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

function asString(value: unknown): string | null {
	return typeof value === 'string' ? value.trim() : null;
}

function asBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

function asArray<T>(value: unknown, guard: (entry: unknown) => entry is T): T[] {
	if (!Array.isArray(value)) return [];
	return value.filter(guard);
}

function isCapability(value: unknown): value is ExtensionCapability {
	return typeof value === 'string' && EXTENSION_CAPABILITIES.includes(value as ExtensionCapability);
}

function isPermission(value: unknown): value is ExtensionPermission {
	return typeof value === 'string' && EXTENSION_PERMISSIONS.includes(value as ExtensionPermission);
}

function isActivationEvent(value: unknown): value is ExtensionActivationEvent {
	if (typeof value !== 'string') return false;
	return (
		value === 'onStartup' ||
		value === 'onWorkspaceOpened' ||
		value === 'onDocumentOpened' ||
		value.startsWith('onCommand:')
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function normalizeIcon(value: unknown): ExtensionDocPanelContribution['icon'] | undefined {
	if (typeof value === 'string') {
		const icon = asString(value);
		return icon || undefined;
	}

	if (!isRecord(value)) return undefined;
	if (value.type !== 'asset') return undefined;

	const iconPath = asString(value.path);
	if (!iconPath) return undefined;
	return {
		type: 'asset',
		path: iconPath,
	};
}

function normalizeCommands(value: unknown): ExtensionCommandContribution[] {
	if (!Array.isArray(value)) return [];

	return value
		.filter(isRecord)
		.map((entry) => {
			const id = asString(entry.id) ?? '';
			const title = asString(entry.title) ?? '';
			const description = asString(entry.description) ?? '';
			const when: ExtensionCommandContribution['when'] =
				entry.when === 'document' ? 'document' : 'always';
			return { id, title, description, when };
		})
		.filter((command) => command.id.length > 0 && command.title.length > 0);
}

function normalizeDocPanels(value: unknown): ExtensionDocPanelContribution[] {
	if (!Array.isArray(value)) return [];

	return value
		.filter(isRecord)
		.map((entry) => {
			const id = asString(entry.id) ?? '';
			const title = asString(entry.title) ?? '';
			const description = asString(entry.description) ?? undefined;
			const icon = normalizeIcon(entry.icon);
			const when: ExtensionDocPanelContribution['when'] = 'document';
			const order = typeof entry.order === 'number' && Number.isFinite(entry.order) ? entry.order : undefined;
			return { id, title, description, when, icon, order };
		})
		.filter((panel) => panel.id.length > 0 && panel.title.length > 0);
}

function normalizeDocPages(value: unknown): ExtensionDocPageContribution[] {
	if (!Array.isArray(value)) return [];

	return value
		.filter(isRecord)
		.map((entry) => {
			const id = asString(entry.id) ?? '';
			const title = asString(entry.title) ?? '';
			const description = asString(entry.description) ?? undefined;
			const icon = normalizeIcon(entry.icon);
			const order = typeof entry.order === 'number' && Number.isFinite(entry.order) ? entry.order : undefined;
			return { id, title, description, icon, order };
		})
		.filter((page) => page.id.length > 0 && page.title.length > 0);
}

function validateRelativeMain(main: string): string | null {
	if (!main) return 'Missing "main" entrypoint.';
	if (path.isAbsolute(main)) return '"main" must be relative to the extension root.';
	if (main.includes('..')) return '"main" cannot escape the extension root.';
	return null;
}

function validateRelativeAsset(assetPath: string, label: string): string | null {
	if (!assetPath) return `${label} icon asset is missing a path.`;
	if (path.isAbsolute(assetPath)) return `${label} icon asset path must be relative to the extension root.`;
	if (assetPath.includes('..')) return `${label} icon asset path cannot escape the extension root.`;
	const extension = path.extname(assetPath).toLowerCase();
	if (extension !== '.png' && extension !== '.svg') {
		return `${label} icon asset must be a .png or .svg file.`;
	}
	return null;
}

function uniqueStrings(values: string[]): string[] {
	return Array.from(new Set(values));
}

export function parseExtensionManifest(raw: string): ParsedExtensionManifest {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		return {
			manifest: createFallbackManifest(),
			errors: [
				error instanceof Error ? `Invalid manifest JSON: ${error.message}` : 'Invalid manifest JSON.',
			],
		};
	}

	return validateExtensionManifest(parsed);
}

export function validateExtensionManifest(input: unknown): ParsedExtensionManifest {
	if (!isRecord(input)) {
		return {
			manifest: createFallbackManifest(),
			errors: ['Manifest must be a JSON object.'],
		};
	}

	const manifest: ExtensionManifest = {
		id: asString(input.id) ?? '',
		name: asString(input.name) ?? '',
		version: asString(input.version) ?? '',
		apiVersion: asString(input.apiVersion) ?? OPENWRITER_EXTENSION_API_VERSION,
		main: asString(input.main) ?? '',
		description: asString(input.description) ?? undefined,
		author: asString(input.author) ?? undefined,
		defaultEnabled: asBoolean(input.defaultEnabled) ?? true,
		capabilities: uniqueStrings(asArray(input.capabilities, isCapability)) as ExtensionCapability[],
		permissions: uniqueStrings(asArray(input.permissions, isPermission)) as ExtensionPermission[],
		activationEvents: uniqueStrings(asArray(input.activationEvents, isActivationEvent)) as ExtensionActivationEvent[],
		contributes: {
			commands: normalizeCommands(input.contributes && isRecord(input.contributes) ? input.contributes.commands : []),
			docPanels: normalizeDocPanels(input.contributes && isRecord(input.contributes) ? input.contributes.docPanels : []),
			docPages: normalizeDocPages(input.contributes && isRecord(input.contributes) ? input.contributes.docPages : []),
		},
	};

	const errors: string[] = [];

	if (!manifest.id) {
		errors.push('Missing "id".');
	} else if (!EXTENSION_ID_PATTERN.test(manifest.id)) {
		errors.push('"id" must contain only lowercase letters, numbers, dots, dashes, or underscores.');
	}

	if (!manifest.name) {
		errors.push('Missing "name".');
	}

	if (!manifest.version) {
		errors.push('Missing "version".');
	} else if (!SEMVER_PATTERN.test(manifest.version)) {
		errors.push('"version" must be a semver-like string such as 1.0.0.');
	}

	if (manifest.apiVersion !== OPENWRITER_EXTENSION_API_VERSION) {
		errors.push(
			`Unsupported "apiVersion" "${manifest.apiVersion}". Expected ${OPENWRITER_EXTENSION_API_VERSION}.`
		);
	}

	const mainError = validateRelativeMain(manifest.main);
	if (mainError) errors.push(mainError);

	const commands = manifest.contributes?.commands ?? [];
	const docPanels = manifest.contributes?.docPanels ?? [];
	const docPages = manifest.contributes?.docPages ?? [];
	const commandIds = new Set<string>();
	for (const command of commands) {
		if (!EXTENSION_ID_PATTERN.test(command.id)) {
			errors.push(`Command "${command.id}" has an invalid id.`);
		}
		if (!command.description) {
			errors.push(`Command "${command.id}" is missing a description.`);
		}
		if (commandIds.has(command.id)) {
			errors.push(`Duplicate command id "${command.id}".`);
		}
		commandIds.add(command.id);
	}

	const docPanelIds = new Set<string>();
	for (const panel of docPanels) {
		if (!EXTENSION_ID_PATTERN.test(panel.id)) {
			errors.push(`Doc panel "${panel.id}" has an invalid id.`);
		}
		if (panel.icon && typeof panel.icon !== 'string') {
			const iconError = validateRelativeAsset(panel.icon.path, `Doc panel "${panel.id}"`);
			if (iconError) errors.push(iconError);
		}
		if (docPanelIds.has(panel.id)) {
			errors.push(`Duplicate doc panel id "${panel.id}".`);
		}
		docPanelIds.add(panel.id);
	}

	const docPageIds = new Set<string>();
	for (const page of docPages) {
		if (!EXTENSION_ID_PATTERN.test(page.id)) {
			errors.push(`Doc page "${page.id}" has an invalid id.`);
		}
		if (page.icon && typeof page.icon !== 'string') {
			const iconError = validateRelativeAsset(page.icon.path, `Doc page "${page.id}"`);
			if (iconError) errors.push(iconError);
		}
		if (docPageIds.has(page.id)) {
			errors.push(`Duplicate doc page id "${page.id}".`);
		}
		docPageIds.add(page.id);
	}

	for (const activationEvent of manifest.activationEvents ?? []) {
		if (isCommandActivationEvent(activationEvent)) {
			const commandId = activationEvent.slice('onCommand:'.length);
			if (!commandIds.has(commandId)) {
				errors.push(
					`Activation event "${activationEvent}" references an unknown contributed command.`
				);
			}
		}
	}

	if (commands.length > 0 && !(manifest.activationEvents ?? []).some(isCommandActivationEvent)) {
		manifest.activationEvents = [
			...(manifest.activationEvents ?? []),
			...commands.map((command) => commandActivationEvent(command.id)),
		];
	}

	return { manifest, errors };
}

function createFallbackManifest(): ExtensionManifest {
	return {
		id: '',
		name: '',
		version: '0.0.0',
		apiVersion: OPENWRITER_EXTENSION_API_VERSION,
		main: '',
		defaultEnabled: true,
		capabilities: [],
		permissions: [],
		activationEvents: [],
		contributes: { commands: [], docPanels: [], docPages: [] },
	};
}
