// Facade — primary public API of this module
export { Workspace } from './workspace';

// State management and events
export { WorkspaceService } from './workspace-service';
export type { WorkspaceState } from './workspace-service';

// Metadata repository
export { WorkspaceMetadataService } from './workspace-metadata';

// Project workspace file management
export { ProjectWorkspaceService } from './project-workspace';

// File watching
export { FilesWatcherService } from './files-watcher';

// Contents service (workspace/contents/)
export { ContentsService } from './contents-service';

// Files service (workspace/files/)
export { FilesService } from './files-service';

// Images service (workspace/images/)
export { ImagesService } from './images-service';

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
