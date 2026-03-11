import type { ServiceContainer, EventBus } from './index';
import type { StoreService } from '../services/store';
import type { WorkspaceService } from '../services/workspace';
import type { FileManagementService } from '../services/file-management-service';
import type { LoggerService } from '../services/logger';
import { WorkspaceMetadataService } from '../services/workspace-metadata';
import { DocumentsWatcherService } from '../services/documents-watcher';
import { OutputFilesService } from '../services/output-files';
import { WorkspaceManager } from '../services/workspace-manager';

/**
 * Context available to every window-scoped service factory function.
 */
export interface WindowScopedFactoryContext {
	globalContainer: ServiceContainer;
	eventBus: EventBus;
	storeService: StoreService;
	workspaceService: WorkspaceService;
	windowContainer: ServiceContainer;
}

/**
 * Interface for window-scoped service definitions.
 * Each service registered with the factory must implement this pattern.
 */
export interface WindowScopedServiceDefinition {
	/**
	 * Unique key to register the service under
	 */
	key: string;

	/**
	 * Factory function to create the service instance
	 * Has access to global container, event bus, workspace service,
	 * and the in-progress window container for resolving prior services.
	 */
	factory: (context: WindowScopedFactoryContext) => Promise<unknown> | unknown;
}

/**
 * WindowScopedServiceFactory manages the creation and initialization of per-window services.
 *
 * Benefits:
 *   - Adding new window-scoped services requires only registering them with the factory
 *   - No need to modify WindowContext.initializeServices() for each new service
 *   - Makes the list of window-scoped services explicit and discoverable
 *   - Ensures consistent initialization pattern across all services
 *   - Reduces code duplication in WindowContext
 *
 * Usage:
 *   // Register services
 *   factory.register({
 *     key: 'workspace',
 *     factory: ({ storeService, eventBus }) => new WorkspaceService(storeService, eventBus)
 *   })
 *
 *   // Create all services for a window
 *   await factory.createAndRegisterAll(container, { globalContainer, eventBus, storeService, workspaceService })
 */
export class WindowScopedServiceFactory {
	private definitions: Map<string, WindowScopedServiceDefinition> = new Map();

	/**
	 * Register a service definition
	 */
	register(definition: WindowScopedServiceDefinition): void {
		if (this.definitions.has(definition.key)) {
			throw new Error(`Service "${definition.key}" is already registered`);
		}
		this.definitions.set(definition.key, definition);
	}

	/**
	 * Create and register all services in the container.
	 * Services are created in registration order, allowing dependencies to be satisfied.
	 */
	async createAndRegisterAll(
		container: ServiceContainer,
		context: {
			globalContainer: ServiceContainer;
			eventBus: EventBus;
			storeService: StoreService;
			workspaceService: WorkspaceService;
		},
	): Promise<void> {
		const logger = context.globalContainer.get<LoggerService>('logger');
		logger?.info(
			'WindowScopedServiceFactory',
			`Creating ${this.definitions.size} window-scoped services`,
		);

		const enrichedContext: WindowScopedFactoryContext = {
			...context,
			windowContainer: container,
		};

		for (const definition of this.definitions.values()) {
			try {
				const service = await definition.factory(enrichedContext);
				container.register(definition.key, service);
				logger?.info('WindowScopedServiceFactory', `Registered service: ${definition.key}`);
			} catch (error) {
				logger?.error(
					'WindowScopedServiceFactory',
					`Failed to register service "${definition.key}"`,
					error,
				);
				throw error;
			}
		}

		logger?.info(
			'WindowScopedServiceFactory',
			'Successfully registered all window-scoped services',
		);
	}

	/**
	 * Get the list of registered service keys
	 */
	getRegisteredServices(): string[] {
		return Array.from(this.definitions.keys());
	}

	/**
	 * Check if a service is registered
	 */
	isRegistered(key: string): boolean {
		return this.definitions.has(key);
	}
}

/**
 * Factory for creating the default set of window-scoped services.
 * Can be overridden or extended by applications that need custom services.
 */
export function createDefaultWindowScopedServiceFactory(): WindowScopedServiceFactory {
	const factory = new WindowScopedServiceFactory();

	// Note: 'workspace' is NOT registered here. WindowContext constructs and registers
	// WorkspaceService directly before calling createAndRegisterAll(), and passes the
	// instance as context.workspaceService for downstream services to depend on.

	// Register workspace metadata service (depends on workspace)
	factory.register({
		key: 'workspaceMetadata',
		factory: ({ workspaceService, eventBus }) => {
			const service = new WorkspaceMetadataService(workspaceService, eventBus);
			service.initialize();
			return service;
		},
	});

	// Register documents watcher (depends on workspace)
	factory.register({
		key: 'documentsWatcher',
		factory: async ({ workspaceService, eventBus }) => {
			const service = new DocumentsWatcherService(eventBus);
			await service.initialize(workspaceService.getCurrent());
			return service;
		},
	});

	// Register output files service
	factory.register({
		key: 'outputFiles',
		factory: ({ workspaceService, eventBus }) => {
			const service = new OutputFilesService(workspaceService, eventBus);
			service.initialize();
			return service;
		},
	});

	// Register workspace manager (Facade over all workspace services)
	factory.register({
		key: 'workspaceManager',
		factory: ({ globalContainer, windowContainer, workspaceService }) => {
			const fileManagement = globalContainer.get<FileManagementService>('fileManagement');
			const logger = globalContainer.get<LoggerService>('logger');
			const metadata = windowContainer.get<WorkspaceMetadataService>('workspaceMetadata');
			const watcher = windowContainer.has('documentsWatcher')
				? windowContainer.get<DocumentsWatcherService>('documentsWatcher')
				: null;
			const outputFiles = windowContainer.get<OutputFilesService>('outputFiles');
			return new WorkspaceManager(
				workspaceService,
				fileManagement,
				metadata,
				watcher,
				outputFiles,
				logger,
			);
		},
	});

	return factory;
}
