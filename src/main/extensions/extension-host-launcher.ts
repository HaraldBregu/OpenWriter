import { utilityProcess, type UtilityProcess } from 'electron';
import path from 'node:path';
import type { Disposable } from '../core/service-container';
import type { LoggerService } from '../services/logger';
import type { ExtensionHostToMainMessage, MainToExtensionHostMessage } from '../../../packages/openwriter-extension-types/src/index';

export interface ExtensionHostLauncherOptions {
	extensionId: string;
	hostEntryPath: string;
	logger: LoggerService;
	onMessage: (message: ExtensionHostToMainMessage) => void;
	onExit: (code: number) => void;
}

export class ExtensionHostLauncher implements Disposable {
	private child: UtilityProcess | null = null;

	constructor(private readonly options: ExtensionHostLauncherOptions) {}

	get pid(): number | undefined {
		return this.child?.pid;
	}

	async start(): Promise<void> {
		if (this.child) return;

		await new Promise<void>((resolve, reject) => {
			const child = utilityProcess.fork(path.resolve(this.options.hostEntryPath), [], {
				cwd: process.cwd(),
				env: process.env,
				stdio: 'pipe',
				serviceName: `OpenWriter Extension: ${this.options.extensionId}`,
			});

			this.child = child;

			child.once('spawn', () => {
				this.options.logger.info(
					'ExtensionHostLauncher',
					`Spawned extension host for ${this.options.extensionId}`,
					{ pid: child.pid }
				);
				resolve();
			});

			child.on('message', (message) => {
				this.options.onMessage(message as ExtensionHostToMainMessage);
			});

			child.on('exit', (code) => {
				this.options.logger.warn(
					'ExtensionHostLauncher',
					`Extension host exited for ${this.options.extensionId}`,
					{ code }
				);
				this.child = null;
				this.options.onExit(code);
			});

			child.stdout?.on('data', (chunk) => {
				this.options.logger.info(
					`Extension:${this.options.extensionId}:stdout`,
					String(chunk).trim()
				);
			});

			child.stderr?.on('data', (chunk) => {
				this.options.logger.warn(
					`Extension:${this.options.extensionId}:stderr`,
					String(chunk).trim()
				);
			});

			child.once('error', (error) => {
				reject(new Error(`[${error.type}] ${error.location}`));
			});
		});
	}

	send(message: MainToExtensionHostMessage): void {
		if (!this.child) {
			throw new Error(`Extension host for ${this.options.extensionId} is not running.`);
		}

		this.child.postMessage(message);
	}

	destroy(): void {
		if (!this.child) return;
		this.child.kill();
		this.child = null;
	}
}
