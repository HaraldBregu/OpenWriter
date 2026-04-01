import { registerQuery } from './ipc-gateway';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../services/logger';
import { LogChannels } from '../../shared/channels';

export class LogsIpc implements IpcModule {
	readonly name = 'LogsIpc';

	register(container: ServiceContainer, _eventBus: EventBus): void {
		const logger = container.get('logger') as LoggerService;

		registerQuery(LogChannels.getLogs, (limit?: number) => {
			return logger.getRecentLogs(limit);
		});
	}
}
