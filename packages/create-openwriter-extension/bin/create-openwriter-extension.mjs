#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function toId(value) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

async function ensureDir(dirPath) {
	await fs.mkdir(dirPath, { recursive: true });
}

async function writeFile(filePath, content) {
	await ensureDir(path.dirname(filePath));
	await fs.writeFile(filePath, content, 'utf8');
}

async function main() {
	const name = process.argv[2] ?? 'my-extension';
	const displayName = name
		.split(/[-_]/g)
		.filter(Boolean)
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join(' ');
	const id = toId(name);
	const targetDir = path.resolve(process.cwd(), name);

	await ensureDir(targetDir);

	await writeFile(
		path.join(targetDir, 'openwriter.extension.json'),
		JSON.stringify(
			{
				id,
				name: displayName,
				version: '0.1.0',
				apiVersion: '1',
				main: 'dist/index.js',
				defaultEnabled: true,
				capabilities: ['commands', 'host-data', 'host-actions'],
				permissions: ['app.read', 'workspace.read', 'document.read', 'document.write'],
				activationEvents: [`onCommand:${id}.append-note`],
				contributes: {
					commands: [
						{
							id: `${id}.append-note`,
							title: `${displayName}: Append note`,
							description: 'Append a short marker to the active document.',
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
				},
				dependencies: {
					'@openwriter/extension-sdk': 'workspace:*',
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

export default defineExtension({
\tasync activate(ctx) {
\t\tctx.commands.register({
\t\t\tid: '${id}.append-note',
\t\t\ttitle: '${displayName}: Append note',
\t\t\tdescription: 'Append a short marker to the active document.',
\t\t\tasync run() {
\t\t\t\tconst active = await ctx.host.documents.getActive();
\t\t\t\tif (!active) {
\t\t\t\t\treturn { ok: false, error: 'No active document.' };
\t\t\t\t}

\t\t\t\tawait ctx.host.documents.update(active.id, {
\t\t\t\t\tcontent: \`\${active.content}\\n\\nCreated by ${displayName}.\`,
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

main().catch((error) => {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = 1;
});
