/**
 * Workspace Process Manager
 *
 * Handles spawning separate Electron processes for each workspace window.
 * This ensures complete isolation between workspaces - each runs in its own
 * main process with its own memory space, no shared state.
 *
 * Architecture:
 * - Main launcher process: Shows workspace selector
 * - Child workspace processes: One per workspace, completely isolated
 * - No shared memory or services between processes
 * - Each child process is fully independent
 */

import { spawn } from 'node:child_process'
import { app } from 'electron'
import type { LoggerService } from './services/logger'

export interface WorkspaceProcessOptions {
  workspacePath: string
  logger?: LoggerService
}

export class WorkspaceProcessManager {
  private logger?: LoggerService

  constructor(logger?: LoggerService) {
    this.logger = logger
  }

  /**
   * Spawn a new Electron process for a workspace.
   *
   * Creates a completely isolated process:
   * - Separate main process
   * - Own memory space
   * - Own service instances
   * - No shared state with launcher or other workspaces
   *
   * @param options - Workspace configuration
   * @returns Process ID of spawned process
   */
  spawnWorkspaceProcess(options: WorkspaceProcessOptions): number {
    const { workspacePath } = options

    this.logger?.info('WorkspaceProcess', `Spawning new process for workspace: ${workspacePath}`)

    // Get Electron executable path
    const electronPath = process.execPath

    // Get app path - this is the path to the app's main entry point
    const appPath = app.getAppPath()

    // Arguments to pass to the new Electron instance
    const args = [
      appPath, // Path to the app
      '--workspace', // Flag to indicate workspace mode
      workspacePath, // The workspace directory path
      '--process-type=workspace' // Mark as workspace process (not launcher)
    ]

    this.logger?.debug('WorkspaceProcess', 'Spawn args:', {
      electronPath,
      appPath,
      args
    })

    // Spawn new Electron process
    const child = spawn(electronPath, args, {
      // Detached: Allow child to run independently of parent
      detached: true,

      // Ignore stdio to prevent keeping parent alive
      stdio: 'ignore',

      // Set environment variables for child process
      env: {
        ...process.env,
        ELECTRON_WORKSPACE_MODE: 'true',
        ELECTRON_WORKSPACE_PATH: workspacePath
      }
    })

    // Unref allows parent to exit without waiting for child
    child.unref()

    this.logger?.info('WorkspaceProcess', `Spawned workspace process with PID: ${child.pid}`)

    return child.pid!
  }

  /**
   * Check if current process is running in workspace mode.
   *
   * Workspace mode means this process was spawned to handle a specific
   * workspace, not the main launcher.
   */
  static isWorkspaceMode(): boolean {
    return (
      process.argv.includes('--workspace') ||
      process.env.ELECTRON_WORKSPACE_MODE === 'true'
    )
  }

  /**
   * Get the workspace path from command line arguments.
   *
   * Expected format: --workspace /path/to/workspace
   *
   * @returns Workspace path or null if not in workspace mode
   */
  static getWorkspacePathFromArgs(): string | null {
    // Check environment variable first
    if (process.env.ELECTRON_WORKSPACE_PATH) {
      return process.env.ELECTRON_WORKSPACE_PATH
    }

    // Check command line arguments
    const workspaceIndex = process.argv.indexOf('--workspace')
    if (workspaceIndex !== -1 && workspaceIndex + 1 < process.argv.length) {
      return process.argv[workspaceIndex + 1]
    }

    return null
  }

  /**
   * Check if this is the launcher process (not a workspace process).
   */
  static isLauncherMode(): boolean {
    return !WorkspaceProcessManager.isWorkspaceMode()
  }
}
