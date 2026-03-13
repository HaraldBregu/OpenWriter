---
name: project-workspace-feature
description: Implementation of project_workspace.json file management in workspace folders
type: project
---

# Project Workspace Feature

**Implemented**: 2026-03-14

## Summary
Added `ProjectWorkspaceService` that manages a `project_workspace.json` file in every workspace root folder. The file is auto-created when a workspace is opened for the first time.

## Data Structure (project_workspace.json)
```json
{
  "version": 1,
  "projectId": "uuid-v4",
  "name": "folder-name",
  "description": "",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "appVersion": "1.0.0"
}
```

## Service Design
- `ProjectWorkspaceService` is async, uses atomic writes (temp file + rename)
- No caching -- always reads fresh from disk
- Lenient schema validation -- fills in defaults for missing fields
- Migration framework built in (currently v1 only)
- Registered as window-scoped service via `WindowScopedServiceFactory`

## IPC Channels
- `project-workspace:get-info` - Returns ProjectWorkspaceInfo or null
- `project-workspace:update-name` - Updates name field
- `project-workspace:update-description` - Updates description field

## How to apply
When extending workspace metadata, add fields to `ProjectWorkspaceInfo` in `src/shared/types.ts` and update `validateSchema()` in the service.
