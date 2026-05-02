/**
 * Hook to listen for workspace change events from the main process.
 * Dispatches handleWorkspaceChanged action when the workspace changes.
 *
 * Should be called from a top-level component like AppLayout to ensure
 * the listener is active for the entire app session.
 *
 * Side-effects (reloading documents, resources, indexing info, project name)
 * are handled by the workspace listener middleware reacting to the
 * `handleWorkspaceChanged` / `selectWorkspace.fulfilled` actions.
 */
export declare function useWorkspaceListener(): void;
