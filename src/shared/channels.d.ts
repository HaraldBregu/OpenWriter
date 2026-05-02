import type { WorkspaceInfo, WorkspaceChangedEvent, WorkspaceDeletedEvent, CreateWorkspaceParams, IndexingInfo, TaskAction, TaskInfo, TaskEvent, AgentTaskSnapshot, AgentTaskLookupResult, ResourceInfo, FolderEntry, ImageEntry, ImageEntryChangeEvent, OutputFile, OutputFileChangeEvent, SaveOutputInput, SaveOutputResult, WritingContextMenuAction, ContextMenuDescriptor, FsReadFileParams, FsWriteFileParams, FsCreateFolderParams, FsDeleteFolderParams, FsDeleteFileParams, FsRenameParams, FsRenameResult, FsListDirParams, FsListDirEntry, SaveDocumentImageParams, SaveDocumentImageResult, DocumentImageInfo, DocumentImageChangeEvent, ProjectWorkspaceInfo, DocumentConfig, AppLogEntry, AppStartupInfo, AgentSettings, ThemeMode, CustomThemeInfo, CronJobInfo, CronTickEvent, Theme, Provider, ProviderModelInfo, UserProfile } from './types';
import type { ShortcutId } from './shortcuts';
export declare const WorkspaceChannels: {
    readonly getCurrent: "workspace-get-current";
    readonly setCurrent: "workspace-set-current";
    readonly list: "workspace-list";
    readonly create: "workspace-create";
    readonly clear: "workspace-clear";
    readonly changed: "workspace:changed";
    readonly deleted: "workspace:deleted";
    readonly getIndexingInfo: "indexing:get-info";
    readonly openWorkspaceFolder: "workspace:open-workspace-folder";
    readonly openDataFolder: "workspace:open-data-folder";
    readonly openContentsFolder: "workspace:open-contents-folder";
    readonly openFilesFolder: "workspace:open-files-folder";
    readonly openImagesFolder: "workspace:open-images-folder";
    readonly openDocumentFolder: "workspace:open-document-folder";
    readonly getDocumentPath: "workspace:get-document-path";
    readonly saveDocumentImage: "output:save-document-image";
    readonly listDocumentImages: "output:list-document-images";
    readonly documentImageChanged: "output:document-image-changed";
    readonly outputSave: "output:save";
    readonly outputLoadAll: "output:load-all";
    readonly loadByType: "output:load-by-type";
    readonly outputLoadOne: "output:load-one";
    readonly outputDelete: "output:delete";
    readonly outputTrash: "output:trash";
    readonly outputFileChanged: "output:file-changed";
    readonly fsReadFile: "fs:read-file";
    readonly fsReadFileBinary: "fs:read-file-binary";
    readonly fsWriteFile: "fs:write-file";
    readonly fsCreateFolder: "fs:create-folder";
    readonly fsDeleteFolder: "fs:delete-folder";
    readonly fsDeleteFile: "fs:delete-file";
    readonly fsRename: "fs:rename";
    readonly fsListDir: "fs:list-dir";
    readonly getProjectInfo: "project-workspace:get-info";
    readonly updateProjectName: "project-workspace:update-name";
    readonly updateProjectDescription: "project-workspace:update-description";
    readonly getDocumentConfig: "workspace:get-document-config";
    readonly documentConfigChanged: "workspace:document-config-changed";
    readonly getDocumentContent: "workspace:get-document-content";
    readonly updateDocumentContent: "workspace:update-document-content";
    readonly updateDocumentConfig: "workspace:update-document-config";
    readonly getContents: "contents:get-all";
    readonly getContentsFolders: "contents:get-folders";
    readonly insertContents: "contents:insert";
    readonly deleteContent: "contents:delete";
    readonly getImages: "images:get-all";
    readonly insertImages: "images:insert";
    readonly deleteImage: "images:delete";
    readonly imagesChanged: "images:changed";
};
export declare const WindowChannels: {
    readonly minimize: "window:minimize";
    readonly maximize: "window:maximize";
    readonly close: "window:close";
    readonly isMaximized: "window:is-maximized";
    readonly isFullScreen: "window:is-fullscreen";
    readonly maximizeChange: "window:maximize-change";
    readonly fullScreenChange: "window:fullscreen-change";
    readonly getPlatform: "window:get-platform";
    readonly popupMenu: "window:popup-menu";
};
export declare const TaskChannels: {
    readonly submit: "task:submit";
    readonly cancel: "task:cancel";
    readonly list: "task:list";
    readonly event: "task:event";
    readonly getSnapshot: "task:get-snapshot";
    readonly findForDocument: "task:find-for-document";
};
export declare const AssistantChannels: {
    readonly send: "assistant:send";
    readonly reset: "assistant:reset";
    readonly response: "assistant:response";
};
export interface AssistantResponseEvent {
    assistantId: string;
    userMessage: string;
    response: string;
}
export declare const AppChannels: {
    readonly playSound: "play-sound";
    readonly setTheme: "set-theme";
    readonly setLanguage: "set-language";
    readonly contextMenu: "context-menu";
    readonly contextMenuEditable: "context-menu-editable";
    readonly showContextMenu: "context-menu:show";
    readonly changeLanguage: "change-language";
    readonly changeTheme: "change-theme";
    readonly fileOpened: "file-opened";
    readonly showWritingContextMenu: "context-menu:writing";
    readonly writingContextMenuAction: "context-menu:writing-action";
    readonly getProviders: "app:get-providers";
    readonly addProvider: "app:add-provider";
    readonly deleteProvider: "app:delete-provider";
    readonly getAgents: "app:get-agents";
    readonly updateAgent: "app:update-agent";
    readonly getStartupInfo: "app:get-startup-info";
    readonly getProfile: "app:get-profile";
    readonly setProfile: "app:set-profile";
    readonly completeFirstRunConfiguration: "app:complete-first-run-configuration";
    readonly getModels: "app:get-models";
    readonly getLogs: "app:get-logs";
    readonly openLogsFolder: "app:open-logs-folder";
    readonly openAppDataFolder: "app:open-app-data-folder";
    readonly getAppDataFolder: "app:get-app-data-folder";
    readonly getCustomThemes: "app:get-custom-themes";
    readonly openThemesFolder: "app:open-themes-folder";
    readonly importTheme: "app:import-theme";
    readonly getCustomThemeTokens: "app:get-custom-theme-tokens";
    readonly deleteTheme: "app:delete-theme";
    readonly openSystemAccessibility: "app:open-system-accessibility";
    readonly openSystemScreenRecording: "app:open-system-screen-recording";
    readonly setTrayEnabled: "app:set-tray-enabled";
    readonly getTrayEnabled: "app:get-tray-enabled";
    readonly cronSchedule: "app:cron-schedule";
    readonly cronUnschedule: "app:cron-unschedule";
    readonly cronListJobs: "app:cron-list-jobs";
    readonly cronHasJob: "app:cron-has-job";
    readonly cronTick: "app:cron-tick";
    readonly shortcut: "app:shortcut";
    readonly openTasksDialog: "app:open-tasks-dialog";
    readonly openLogsDialog: "app:open-logs-dialog";
    readonly openReduxDialog: "app:open-redux-dialog";
    readonly openCronDialog: "app:open-cron-dialog";
};
/**
 * Channels using ipcRenderer.invoke / ipcMain.handle.
 * `args` = tuple of arguments after the channel name.
 * `result` = the logical return type.
 */
export interface InvokeChannelMap {
    [AppChannels.getProviders]: {
        args: [];
        result: Provider[];
    };
    [AppChannels.addProvider]: {
        args: [provider: Provider];
        result: Provider;
    };
    [AppChannels.deleteProvider]: {
        args: [id: string];
        result: void;
    };
    [AppChannels.getAgents]: {
        args: [];
        result: AgentSettings[];
    };
    [AppChannels.updateAgent]: {
        args: [agent: AgentSettings];
        result: AgentSettings;
    };
    [AppChannels.getStartupInfo]: {
        args: [];
        result: AppStartupInfo;
    };
    [AppChannels.getProfile]: {
        args: [];
        result: UserProfile | null;
    };
    [AppChannels.setProfile]: {
        args: [profile: UserProfile];
        result: UserProfile;
    };
    [AppChannels.completeFirstRunConfiguration]: {
        args: [profile: UserProfile, providers: Provider[]];
        result: AppStartupInfo;
    };
    [AppChannels.getModels]: {
        args: [providerId: string];
        result: ProviderModelInfo[];
    };
    [WorkspaceChannels.getCurrent]: {
        args: [];
        result: string | null;
    };
    [WorkspaceChannels.setCurrent]: {
        args: [workspacePath: string];
        result: void;
    };
    [WorkspaceChannels.list]: {
        args: [];
        result: WorkspaceInfo[];
    };
    [WorkspaceChannels.create]: {
        args: [params: CreateWorkspaceParams];
        result: WorkspaceInfo;
    };
    [WorkspaceChannels.clear]: {
        args: [];
        result: void;
    };
    [WindowChannels.isMaximized]: {
        args: [];
        result: boolean;
    };
    [WindowChannels.isFullScreen]: {
        args: [];
        result: boolean;
    };
    [WindowChannels.getPlatform]: {
        args: [];
        result: string;
    };
    [TaskChannels.submit]: {
        args: [action: TaskAction];
        result: {
            taskId: string;
        };
    };
    [TaskChannels.cancel]: {
        args: [taskId: string];
        result: boolean;
    };
    [TaskChannels.list]: {
        args: [];
        result: TaskInfo[];
    };
    [TaskChannels.getSnapshot]: {
        args: [taskId: string];
        result: AgentTaskSnapshot | null;
    };
    [TaskChannels.findForDocument]: {
        args: [documentId: string];
        result: AgentTaskLookupResult | null;
    };
    [WorkspaceChannels.getIndexingInfo]: {
        args: [];
        result: IndexingInfo | null;
    };
    [WorkspaceChannels.openWorkspaceFolder]: {
        args: [];
        result: void;
    };
    [WorkspaceChannels.openDataFolder]: {
        args: [];
        result: void;
    };
    [WorkspaceChannels.openContentsFolder]: {
        args: [];
        result: void;
    };
    [WorkspaceChannels.openFilesFolder]: {
        args: [];
        result: void;
    };
    [WorkspaceChannels.openImagesFolder]: {
        args: [];
        result: void;
    };
    [WorkspaceChannels.openDocumentFolder]: {
        args: [documentId: string];
        result: void;
    };
    [WorkspaceChannels.getDocumentPath]: {
        args: [documentId: string];
        result: string;
    };
    [WorkspaceChannels.saveDocumentImage]: {
        args: [params: SaveDocumentImageParams];
        result: SaveDocumentImageResult;
    };
    [WorkspaceChannels.listDocumentImages]: {
        args: [documentId: string];
        result: DocumentImageInfo[];
    };
    [WorkspaceChannels.outputSave]: {
        args: [input: SaveOutputInput];
        result: SaveOutputResult;
    };
    [WorkspaceChannels.outputLoadAll]: {
        args: [];
        result: OutputFile[];
    };
    [WorkspaceChannels.loadByType]: {
        args: [type: string];
        result: OutputFile[];
    };
    [WorkspaceChannels.outputLoadOne]: {
        args: [params: {
            type: string;
            id: string;
        }];
        result: OutputFile | null;
    };
    [WorkspaceChannels.outputDelete]: {
        args: [params: {
            type: string;
            id: string;
        }];
        result: void;
    };
    [WorkspaceChannels.outputTrash]: {
        args: [params: {
            type: string;
            id: string;
        }];
        result: void;
    };
    [AppChannels.showWritingContextMenu]: {
        args: [writingId: string, writingTitle: string];
        result: void;
    };
    [AppChannels.showContextMenu]: {
        args: [items: ContextMenuDescriptor[]];
        result: string | null;
    };
    [WorkspaceChannels.fsReadFile]: {
        args: [params: FsReadFileParams];
        result: string;
    };
    [WorkspaceChannels.fsReadFileBinary]: {
        args: [filePath: string];
        result: string;
    };
    [WorkspaceChannels.fsWriteFile]: {
        args: [params: FsWriteFileParams];
        result: void;
    };
    [WorkspaceChannels.fsCreateFolder]: {
        args: [params: FsCreateFolderParams];
        result: void;
    };
    [WorkspaceChannels.fsDeleteFolder]: {
        args: [params: FsDeleteFolderParams];
        result: void;
    };
    [WorkspaceChannels.fsDeleteFile]: {
        args: [params: FsDeleteFileParams];
        result: void;
    };
    [WorkspaceChannels.fsRename]: {
        args: [params: FsRenameParams];
        result: FsRenameResult;
    };
    [WorkspaceChannels.fsListDir]: {
        args: [params: FsListDirParams];
        result: FsListDirEntry[];
    };
    [AppChannels.getLogs]: {
        args: [limit?: number];
        result: AppLogEntry[];
    };
    [AppChannels.openLogsFolder]: {
        args: [];
        result: void;
    };
    [AppChannels.openAppDataFolder]: {
        args: [];
        result: void;
    };
    [AppChannels.getAppDataFolder]: {
        args: [];
        result: string;
    };
    [AppChannels.getCustomThemes]: {
        args: [];
        result: CustomThemeInfo[];
    };
    [AppChannels.openThemesFolder]: {
        args: [];
        result: void;
    };
    [AppChannels.importTheme]: {
        args: [];
        result: CustomThemeInfo | null;
    };
    [AppChannels.getCustomThemeTokens]: {
        args: [id: string];
        result: Theme | null;
    };
    [AppChannels.deleteTheme]: {
        args: [id: string];
        result: void;
    };
    [AppChannels.openSystemAccessibility]: {
        args: [];
        result: void;
    };
    [AppChannels.openSystemScreenRecording]: {
        args: [];
        result: void;
    };
    [AppChannels.setTrayEnabled]: {
        args: [enabled: boolean];
        result: void;
    };
    [AppChannels.getTrayEnabled]: {
        args: [];
        result: boolean;
    };
    [AppChannels.cronSchedule]: {
        args: [params: {
            id: string;
            expression: string;
            timezone?: string;
            runOnStart?: boolean;
        }];
        result: CronJobInfo;
    };
    [AppChannels.cronUnschedule]: {
        args: [id: string];
        result: void;
    };
    [AppChannels.cronListJobs]: {
        args: [];
        result: CronJobInfo[];
    };
    [AppChannels.cronHasJob]: {
        args: [id: string];
        result: boolean;
    };
    [WorkspaceChannels.getProjectInfo]: {
        args: [];
        result: ProjectWorkspaceInfo | null;
    };
    [WorkspaceChannels.updateProjectName]: {
        args: [name: string];
        result: ProjectWorkspaceInfo;
    };
    [WorkspaceChannels.updateProjectDescription]: {
        args: [description: string];
        result: ProjectWorkspaceInfo;
    };
    [WorkspaceChannels.getDocumentConfig]: {
        args: [documentId: string];
        result: DocumentConfig;
    };
    [WorkspaceChannels.getDocumentContent]: {
        args: [documentId: string];
        result: string;
    };
    [WorkspaceChannels.updateDocumentContent]: {
        args: [documentId: string, content: string];
        result: void;
    };
    [WorkspaceChannels.updateDocumentConfig]: {
        args: [documentId: string, config: Partial<DocumentConfig>];
        result: void;
    };
    [WorkspaceChannels.getContents]: {
        args: [];
        result: ResourceInfo[];
    };
    [WorkspaceChannels.getContentsFolders]: {
        args: [];
        result: FolderEntry[];
    };
    [WorkspaceChannels.insertContents]: {
        args: [extensions?: string[]];
        result: ResourceInfo[];
    };
    [WorkspaceChannels.deleteContent]: {
        args: [id: string];
        result: void;
    };
    [WorkspaceChannels.getImages]: {
        args: [];
        result: ImageEntry[];
    };
    [WorkspaceChannels.insertImages]: {
        args: [extensions?: string[]];
        result: ImageEntry[];
    };
    [WorkspaceChannels.deleteImage]: {
        args: [id: string];
        result: void;
    };
    [AssistantChannels.send]: {
        args: [message: string, assistantId?: string];
        result: string;
    };
    [AssistantChannels.reset]: {
        args: [assistantId?: string];
        result: void;
    };
}
/**
 * Channels using ipcRenderer.send / ipcMain.on (fire-and-forget).
 * `args` = tuple of arguments after the channel name.
 */
export interface SendChannelMap {
    [AppChannels.playSound]: {
        args: [];
    };
    [AppChannels.setTheme]: {
        args: [theme: ThemeMode];
    };
    [AppChannels.setLanguage]: {
        args: [language: string];
    };
    [AppChannels.contextMenu]: {
        args: [];
    };
    [AppChannels.contextMenuEditable]: {
        args: [];
    };
    [WindowChannels.minimize]: {
        args: [];
    };
    [WindowChannels.maximize]: {
        args: [];
    };
    [WindowChannels.close]: {
        args: [];
    };
    [WindowChannels.popupMenu]: {
        args: [];
    };
}
/**
 * Channels for events pushed from main → renderer via webContents.send.
 * `data` = the payload sent with the event.
 */
export interface EventChannelMap {
    [AppChannels.changeLanguage]: {
        data: string;
    };
    [AppChannels.changeTheme]: {
        data: ThemeMode;
    };
    [AppChannels.fileOpened]: {
        data: string;
    };
    [WindowChannels.maximizeChange]: {
        data: boolean;
    };
    [WindowChannels.fullScreenChange]: {
        data: boolean;
    };
    [WorkspaceChannels.changed]: {
        data: WorkspaceChangedEvent;
    };
    [WorkspaceChannels.deleted]: {
        data: WorkspaceDeletedEvent;
    };
    [TaskChannels.event]: {
        data: TaskEvent;
    };
    [WorkspaceChannels.outputFileChanged]: {
        data: OutputFileChangeEvent;
    };
    [WorkspaceChannels.documentImageChanged]: {
        data: DocumentImageChangeEvent;
    };
    [WorkspaceChannels.documentConfigChanged]: {
        data: {
            documentId: string;
            config: DocumentConfig;
        };
    };
    [AppChannels.writingContextMenuAction]: {
        data: WritingContextMenuAction;
    };
    [AppChannels.shortcut]: {
        data: ShortcutId;
    };
    [AppChannels.cronTick]: {
        data: CronTickEvent;
    };
    [AppChannels.openTasksDialog]: {
        data: undefined;
    };
    [AppChannels.openLogsDialog]: {
        data: undefined;
    };
    [AppChannels.openReduxDialog]: {
        data: undefined;
    };
    [AppChannels.openCronDialog]: {
        data: undefined;
    };
    [WorkspaceChannels.imagesChanged]: {
        data: ImageEntryChangeEvent;
    };
    [AssistantChannels.response]: {
        data: AssistantResponseEvent;
    };
}
