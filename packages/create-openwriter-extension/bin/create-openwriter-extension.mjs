#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const MANIFEST_FILE = 'openwriter.extension.json';
const API_VERSION = '1';
const VALID_PERMISSION_VALUES = new Set([
	'app.read',
	'app.write',
	'workspace.read',
	'workspace.write',
	'document.read',
	'document.write',
	'task.submit',
	'task.observe',
]);
const VALID_PREFERENCE_TYPES = new Set([
	'textfield',
	'password',
	'checkbox',
	'dropdown',
	'file',
	'directory',
]);

function toId(value) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function printHelp() {
	process.stdout.write(`OpenWriter extension SDK

Usage:
  create-openwriter-extension create <name>
  create-openwriter-extension validate [extension-dir]
  create-openwriter-extension build [extension-dir]
  create-openwriter-extension dev [extension-dir]
  create-openwriter-extension pack [extension-dir] [--out <dir>]
  create-openwriter-extension install-local [extension-dir] [--to <extensions-dir>]

Defaults:
  The command "create" is used when the first argument is not a known command.
  install-local uses OPENWRITER_EXTENSIONS_DIR when set, otherwise the platform app-data path.
`);
}

async function ensureDir(dirPath) {
	await fs.mkdir(dirPath, { recursive: true });
}

async function writeFile(filePath, content) {
	await ensureDir(path.dirname(filePath));
	await fs.writeFile(filePath, content, 'utf8');
}

function run(command, args, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			stdio: 'inherit',
			shell: process.platform === 'win32',
		});
		child.on('exit', (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 1}.`));
		});
		child.on('error', reject);
	});
}

function readArgValue(args, name) {
	const index = args.indexOf(name);
	if (index < 0) return null;
	return args[index + 1] ?? null;
}

async function readManifest(extensionDir) {
	const manifestPath = path.join(extensionDir, MANIFEST_FILE);
	const raw = await fs.readFile(manifestPath, 'utf8');
	return JSON.parse(raw);
}

function validateManifest(manifest, extensionDir) {
	const errors = [];
	const idPattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

	if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
		return ['Manifest must be a JSON object.'];
	}
	if (typeof manifest.id !== 'string' || !idPattern.test(manifest.id)) {
		errors.push('"id" must contain lowercase letters, numbers, dots, dashes, or underscores.');
	}
	if (typeof manifest.name !== 'string' || manifest.name.trim().length === 0) {
		errors.push('Missing "name".');
	}
	if (manifest.apiVersion !== API_VERSION) {
		errors.push(`Unsupported "apiVersion". Expected "${API_VERSION}".`);
	}
	if (typeof manifest.main !== 'string' || manifest.main.trim().length === 0) {
		errors.push('Missing "main".');
	} else {
		const mainPath = path.join(extensionDir, manifest.main);
		if (path.isAbsolute(manifest.main) || manifest.main.includes('..')) {
			errors.push('"main" must be a safe relative path.');
		} else if (!fsSync.existsSync(mainPath)) {
			errors.push(`Entry file "${manifest.main}" was not found. Run build first.`);
		}
	}

	const permissions = Array.isArray(manifest.permissions) ? manifest.permissions : [];
	for (const permission of permissions) {
		if (!VALID_PERMISSION_VALUES.has(permission)) {
			errors.push(`Unknown permission "${permission}".`);
		}
	}

	const preferences = Array.isArray(manifest.contributes?.preferences)
		? manifest.contributes.preferences
		: [];
	const preferenceIds = new Set();
	for (const preference of preferences) {
		if (!preference || typeof preference !== 'object') continue;
		if (typeof preference.id !== 'string' || !idPattern.test(preference.id)) {
			errors.push(`Preference "${preference.id ?? '<missing>'}" has an invalid id.`);
		}
		if (preferenceIds.has(preference.id)) {
			errors.push(`Duplicate preference id "${preference.id}".`);
		}
		preferenceIds.add(preference.id);
		if (!VALID_PREFERENCE_TYPES.has(preference.type)) {
			errors.push(`Preference "${preference.id}" has an unknown type.`);
		}
		if (
			preference.type === 'dropdown' &&
			(!Array.isArray(preference.options) || preference.options.length === 0)
		) {
			errors.push(`Dropdown preference "${preference.id}" must declare options.`);
		}
	}

	return errors;
}

async function validate(extensionDir) {
	const resolvedDir = path.resolve(extensionDir);
	const manifest = await readManifest(resolvedDir);
	const errors = validateManifest(manifest, resolvedDir);
	if (errors.length > 0) {
		throw new Error(`Extension validation failed:\n- ${errors.join('\n- ')}`);
	}
	process.stdout.write(`Validated ${manifest.name} (${manifest.id}).\n`);
	return manifest;
}

async function create(name) {
	const displayName = name
		.split(/[-_]/g)
		.filter(Boolean)
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join(' ');
	const id = toId(name);
	const targetDir = path.resolve(process.cwd(), name);

	await ensureDir(targetDir);
	await writeFile(
		path.join(targetDir, MANIFEST_FILE),
		JSON.stringify(
			{
				id,
				name: displayName,
				version: '0.1.0',
				apiVersion: API_VERSION,
				main: 'dist/index.js',
				defaultEnabled: true,
				capabilities: ['commands', 'host-data', 'host-actions', 'doc-panels'],
				permissions: ['app.read', 'workspace.read', 'document.read', 'document.write'],
				activationEvents: [`onCommand:${id}.append-note`],
				contributes: {
					preferences: [
						{
							id: 'signature',
							title: 'Signature',
							description: 'Text appended by the sample command.',
							type: 'textfield',
							default: `Created by ${displayName}.`,
						},
					],
					commands: [
						{
							id: `${id}.append-note`,
							title: `${displayName}: Append note`,
							description: 'Append a configurable marker to the active document.',
							when: 'document',
						},
					],
				},
			},
			null,
			2
		)
	);

	await writeFile(
		path.join(targetDir, 'package.json'),
		JSON.stringify(
			{
				name: id,
				private: true,
				type: 'module',
				scripts: {
					build: 'tsc -p tsconfig.json',
					validate: 'create-openwriter-extension validate .',
					pack: 'create-openwriter-extension pack .',
				},
				dependencies: {
					'@openwriter/extension-sdk': 'workspace:*',
				},
				devDependencies: {
					typescript: '^5.8.3',
				},
			},
			null,
			2
		)
	);

	await writeFile(
		path.join(targetDir, 'tsconfig.json'),
		JSON.stringify(
			{
				compilerOptions: {
					target: 'ES2022',
					module: 'ESNext',
					moduleResolution: 'Bundler',
					outDir: 'dist',
					strict: true,
					esModuleInterop: true,
					declaration: true,
					skipLibCheck: true,
				},
				include: ['src/**/*'],
			},
			null,
			2
		)
	);

	await writeFile(
		path.join(targetDir, 'src/index.ts'),
		`import { defineExtension } from '@openwriter/extension-sdk';

interface Preferences {
\tsignature?: string;
}

export default defineExtension({
\tasync activate(ctx) {
\t\tctx.commands.register({
\t\t\tid: '${id}.append-note',
\t\t\ttitle: '${displayName}: Append note',
\t\t\tdescription: 'Append a configurable marker to the active document.',
\t\t\tasync run() {
\t\t\t\tconst active = await ctx.host.documents.getActive();
\t\t\t\tif (!active) {
\t\t\t\t\treturn { ok: false, error: 'No active document.' };
\t\t\t\t}

\t\t\t\tconst preferences = await ctx.preferences.get<Preferences>();
\t\t\t\tconst signature = preferences.signature?.trim() || 'Created by ${displayName}.';

\t\t\t\tawait ctx.host.documents.update(active.id, {
\t\t\t\t\tcontent: \`\${active.content}\\n\\n\${signature}\`,
\t\t\t\t});

\t\t\t\treturn { ok: true };
\t\t\t},
\t\t});
\t},
});
`
	);

	process.stdout.write(`Created extension scaffold at ${targetDir}\n`);
}

async function build(extensionDir) {
	const resolvedDir = path.resolve(extensionDir);
	await run(packageManagerCommand(resolvedDir), ['run', 'build'], resolvedDir);
}

async function dev(extensionDir) {
	const resolvedDir = path.resolve(extensionDir);
	await build(resolvedDir);
	await validate(resolvedDir);
	process.stdout.write(
		'Build and validation completed. Reload the extension in OpenWriter Settings.\n'
	);
}

async function pack(extensionDir, args) {
	const resolvedDir = path.resolve(extensionDir);
	const manifest = await validate(resolvedDir);
	const outDir = path.resolve(readArgValue(args, '--out') ?? path.join(resolvedDir, 'package'));
	await ensureDir(outDir);
	const archiveName = `${manifest.id}-${manifest.version}.tgz`;
	await run('tar', ['-czf', path.join(outDir, archiveName), '-C', resolvedDir, '.'], process.cwd());
	process.stdout.write(`Packed ${path.join(outDir, archiveName)}\n`);
}

function defaultExtensionsDir() {
	if (process.env.OPENWRITER_EXTENSIONS_DIR) return process.env.OPENWRITER_EXTENSIONS_DIR;
	if (process.platform === 'darwin') {
		return path.join(os.homedir(), 'Library', 'Application Support', 'OpenWriter', 'extensions');
	}
	if (process.platform === 'win32') {
		return path.join(process.env.APPDATA ?? os.homedir(), 'OpenWriter', 'extensions');
	}
	return path.join(os.homedir(), '.config', 'OpenWriter', 'extensions');
}

async function installLocal(extensionDir, args) {
	const resolvedDir = path.resolve(extensionDir);
	const manifest = await validate(resolvedDir);
	const extensionsDir = path.resolve(readArgValue(args, '--to') ?? defaultExtensionsDir());
	const targetDir = path.join(extensionsDir, manifest.id);
	await fs.rm(targetDir, { recursive: true, force: true });
	await ensureDir(extensionsDir);
	await fs.cp(resolvedDir, targetDir, { recursive: true });
	process.stdout.write(`Installed ${manifest.name} to ${targetDir}\n`);
}

function packageManagerCommand(cwd) {
	if (fsSync.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
	if (fsSync.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
	return 'npm';
}

async function main() {
	const [firstArg, secondArg, ...restArgs] = process.argv.slice(2);
	const commandNames = new Set([
		'create',
		'validate',
		'build',
		'dev',
		'pack',
		'install-local',
		'help',
	]);
	const command = commandNames.has(firstArg) ? firstArg : 'create';
	const commandArgs =
		command === 'create' && firstArg !== 'create'
			? [firstArg, secondArg, ...restArgs]
			: [secondArg, ...restArgs];
	const target = commandArgs[0] ?? '.';

	if (command === 'help') {
		printHelp();
		return;
	}
	if (command === 'create') {
		await create(commandArgs[0] ?? 'my-extension');
		return;
	}
	if (command === 'validate') {
		await validate(target);
		return;
	}
	if (command === 'build') {
		await build(target);
		return;
	}
	if (command === 'dev') {
		await dev(target);
		return;
	}
	if (command === 'pack') {
		await pack(target, commandArgs.slice(1));
		return;
	}
	if (command === 'install-local') {
		await installLocal(target, commandArgs.slice(1));
	}
}

main().catch((error) => {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = 1;
});
