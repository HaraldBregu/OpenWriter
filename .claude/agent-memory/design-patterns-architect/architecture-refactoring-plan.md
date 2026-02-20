# Main Process Architecture Refactoring Plan

## Patterns Applied
- Service Locator / DI Container for service management
- Mediator Pattern for IPC routing
- Observer/EventEmitter for broadcasting
- Factory Pattern for window creation
- Strategy Pattern for platform-specific behavior

## Migration Phases
1. Extract IPC Router (decouple IPC from Main class)
2. Introduce ServiceContainer (DI, lifecycle management)
3. Extract WindowFactory (eliminate BrowserWindow config duplication)
4. Unified EventBus (replace repeated broadcast pattern)
5. Self-registering IPC modules per service domain
