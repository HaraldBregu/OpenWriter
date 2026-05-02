/**
 * Hook that monitors the workspace for external deletion and redirects
 * to the Welcome page when the workspace folder is no longer accessible.
 *
 * This hook:
 * 1. Subscribes to `workspace:deleted` events from the main process
 * 2. Updates Redux state with the deletion reason
 * 3. Navigates the user to the Welcome page
 *
 * Should be mounted once in a top-level component like AppLayout.
 */
export declare function useWorkspaceValidation(): void;
/**
 * Convenience hook to access the deletion reason for display purposes.
 * Returns null when no deletion has occurred.
 */
export declare function useWorkspaceDeletionReason(): string | null;
/**
 * Hook that provides a function to manually clear the deletion reason,
 * e.g., after the user has acknowledged a notification.
 */
export declare function useClearDeletionReason(): () => void;
