// Facade — primary public API of this module
export { Workspace } from './workspace';

// State management and events
export { WorkspaceService } from './workspace-service';
export type { WorkspaceState } from './workspace-service';

// Metadata repository
export { WorkspaceMetadataService } from './workspace-metadata';

// File watching
export { DocumentsWatcherService } from './documents-watcher';

// Output file management
export type {
	OutputType,
	OutputFile,
	OutputFileMetadata,
	SaveOutputFileInput,
	SaveOutputFileResult,
	UpdateOutputFileInput,
} from './output-files';
export { OutputFilesService, VALID_OUTPUT_TYPES } from './output-files';
