import type { ServiceContainer, EventBus } from './index';
import type { StoreService } from '../services/store';
import type { FileManager } from '../shared/file_manager';
import type { LoggerService } from '../services/logger';
import {
	Workspace,
	WorkspaceMetadataService,
	DocumentsWatcherService,
	ContentsService,
	FilesWatcherService,
	FilesService,
	OutputFilesService,
	ProjectWorkspaceService,
} from '../workspace';
import type { WorkspaceService } from '../workspace';

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
		}
	): Promise<void> {
		const logger = context.globalContainer.get<LoggerService>('logger');
		logger?.info(
			'WindowScopedServiceFactory',
			`Creating ${this.definitions.size} window-scoped services`
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
					error
				);
				throw error;
			}
		}

		logger?.info(
			'WindowScopedServiceFactory',
			'Successfully registered all window-scoped services'
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

	// Register project workspace service (manages project_workspace.openwriter)
	factory.register({
		key: 'projectWorkspace',
		factory: ({ workspaceService, globalContainer }) => {
			const logger = globalContainer.get<LoggerService>('logger');
			return new ProjectWorkspaceService(workspaceService, logger);
		},
	});

	// Register files watcher (resources/files/)
	factory.register({
		key: 'filesWatcher',
		factory: async ({ workspaceService, eventBus, globalContainer }) => {
			const logger = globalContainer.get<LoggerService>('logger');
			const service = new FilesWatcherService(eventBus, logger);
			await service.initialize(workspaceService.getCurrent());
			return service;
		},
	});


	// Register contents service (resources/content/)
	factory.register({
		key: 'contentsService',
		factory: ({ globalContainer }) => {
			const fileManagement = globalContainer.get<FileManager>('fileManagement');
			const logger = globalContainer.get<LoggerService>('logger');
			return new ContentsService(fileManagement, logger);
		},
	});

	// Register files service (resources/files/)
	factory.register({
		key: 'filesService',
		factory: ({ globalContainer }) => {
			const fileManagement = globalContainer.get<FileManager>('fileManagement');
			const logger = globalContainer.get<LoggerService>('logger');
			return new FilesService(fileManagement, logger);
		},
	});

	// Register images service (resources/images/)
	factory.register({
		key: 'imagesService',
		factory: ({ globalContainer }) => {
			const fileManagement = globalContainer.get<FileManager>('fileManagement');
			const logger = globalContainer.get<LoggerService>('logger');
			return new ImagesService(fileManagement, logger);
		},
	});

	// Register workspace manager (Facade over all workspace services)
	factory.register({
		key: 'workspaceManager',
		factory: ({ globalContainer, windowContainer, workspaceService }) => {
			const fileManagement = globalContainer.get<FileManager>('fileManagement');
			const logger = globalContainer.get<LoggerService>('logger');
			const metadata = windowContainer.get<WorkspaceMetadataService>('workspaceMetadata');
			const watcher = windowContainer.has('documentsWatcher')
				? windowContainer.get<DocumentsWatcherService>('documentsWatcher')
				: null;
			const outputFiles = windowContainer.get<OutputFilesService>('outputFiles');
			const projectWorkspace = windowContainer.get<ProjectWorkspaceService>('projectWorkspace');
			return new Workspace(
				workspaceService,
				fileManagement,
				metadata,
				watcher,
				outputFiles,
				projectWorkspace,
				logger
			);
		},
	});

	return factory;
}
