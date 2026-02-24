/**
 * Mock for 'chokidar'.
 *
 * Chokidar v5 ships as pure ESM which ts-jest (CJS mode) cannot parse.
 * Any main-process test that imports a module which transitively imports
 * chokidar will hit a SyntaxError unless we intercept it here.
 *
 * Tests that need to control watcher behaviour should override this mock
 * locally with their own jest.mock('chokidar', ...) factory.
 */

const mockWatcher = {
  on: jest.fn().mockReturnThis(),
  close: jest.fn().mockResolvedValue(undefined),
}

const chokidar = {
  watch: jest.fn().mockReturnValue(mockWatcher),
}

export default chokidar
export { mockWatcher }
