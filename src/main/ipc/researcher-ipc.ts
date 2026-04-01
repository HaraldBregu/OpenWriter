/**
 * ResearcherIpc — IPC handler module for the researcher pipeline.
 *
 * Channels (invoke/handle):
 *   researcher:query  (command) — Start a researcher session.
 *                                  Returns { sessionId } immediately.
 *                                  Streaming events are pushed via webContents.send
 *                                  on the `researcher:event` channel.
 *   researcher:cancel (command) — Cancel an active session by ID.
 *                                  Returns boolean.
 *
 * Security notes:
 *   - windowId is derived from event.sender — never trusted from the payload.
 *   - The push function captures the sender window at registration time; if the
 *     window is destroyed before the session completes, send calls are silently
 *     dropped via optional chaining.
 *   - Payload validation: prompt must be a non-empty string. All other fields
 *     are optional and type-checked before use by the service layer.
 */

import { BrowserWindow } from 'electron';
import { randomUUID } from 'node:crypto';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../services/logger';
import { registerCommand, registerCommandWithEvent } from './ipc-gateway';
import { ResearcherChannels } from '../../shared/channels';
import type { ResearcherEvent, ResearcherQueryPayload } from '../../shared/types';
import type { ResearcherService } from '../ai/agents/researcher/researcher-service';

const MIN_PROMPT_LENGTH = 1;
const MAX_PROMPT_LENGTH = 10_000;

function validatePayload(payload: unknown): ResearcherQueryPayload {
	if (typeof payload !== 'object' || payload === null) {
		throw new Error('Invalid researcher query payload: expected an object');
	}

	const raw = payload as Record<string, unknown>;

	if (typeof raw['prompt'] !== 'string') {
		throw new Error('Invalid researcher query payload: prompt must be a string');
	}

	const prompt = raw['prompt'].trim();

	if (prompt.length < MIN_PROMPT_LENGTH) {
		throw new Error('Invalid researcher query payload: prompt must not be empty');
	}

	if (prompt.length > MAX_PROMPT_LENGTH) {
		throw new Error(
			`Invalid researcher query payload: prompt exceeds maximum length of ${MAX_PROMPT_LENGTH}`
		);
	}

	return {
		prompt,
		providerId: typeof raw['providerId'] === 'string' ? raw['providerId'] : undefined,
		modelId: typeof raw['modelId'] === 'string' ? raw['modelId'] : undefined,
		temperature: typeof raw['temperature'] === 'number' ? raw['temperature'] : undefined,
		maxTokens: typeof raw['maxTokens'] === 'number' ? raw['maxTokens'] : undefined,
	};
}

export class ResearcherIpc implements IpcModule {
	readonly name = 'researcher';

	register(container: ServiceContainer, eventBus: EventBus): void {
		const service = container.get<ResearcherService>('researcherService');
		const logger = container.get<LoggerService>('logger');

		/**
		 * Start a new researcher session.
		 * Validates the payload, stamps windowId server-side, then fires the
		 * pipeline asynchronously. Returns { sessionId } immediately so the
		 * renderer can subscribe to push events and later cancel if needed.
		 */
		registerCommandWithEvent(ResearcherChannels.query, (event, payload: ResearcherQueryPayload) => {
			const validated = validatePayload(payload);
			const sessionId = randomUUID();

			const senderWindow = BrowserWindow.fromWebContents(event.sender);
			const windowId = senderWindow?.id;

			function push(data: ResearcherEvent): void {
				senderWindow?.webContents.send(ResearcherChannels.event, data);
			}

			service
				.query(
					validated.prompt,
					sessionId,
					{
						onToken(token) {
							push({ type: 'token', token, sessionId });
						},
						onPhase(phase) {
							push({ type: 'phase', phase, sessionId });
						},
						onDone(result) {
							push({
								type: 'done',
								response: result.response,
								tokenCount: result.tokenCount,
								intent: result.intent,
								plan: result.plan,
								sessionId,
							});
						},
						onError(error, code) {
							push({ type: 'error', error, code, sessionId });
						},
					},
					validated,
					windowId
				)
				.catch((err: unknown) => {
					const message = err instanceof Error ? err.message : String(err);
					logger.error('ResearcherIpc', `Unhandled error in session ${sessionId}: ${message}`);
					push({
						type: 'error',
						error: 'An unexpected error occurred',
						code: 'unknown',
						sessionId,
					});
				});

			return { sessionId };
		});

		/**
		 * Cancel an active researcher session.
		 * Returns true when the session was found and aborted.
		 */
		registerCommand(ResearcherChannels.cancel, (sessionId: string) => {
			if (typeof sessionId !== 'string' || sessionId.length === 0) {
				return false;
			}
			return service.cancel(sessionId);
		});

		eventBus.on('window:closed', (event) => {
			const { windowId } = event.payload as { windowId: number };
			const cancelledCount = service.cancelByWindow(windowId);
			if (cancelledCount > 0) {
				logger.info(
					'ResearcherIpc',
					`Cancelled ${cancelledCount} researcher session(s) for closed window ${windowId}`
				);
			}
		});

		logger.info('ResearcherIpc', `Registered ${this.name} module`);
	}
}
