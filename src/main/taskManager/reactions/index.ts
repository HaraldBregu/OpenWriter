/**
 * All TaskReactionHandler implementations.
 *
 * Register these with TaskReactionRegistry in bootstrapServices().
 * Pattern mirrors ALL_AGENT_DEFINITIONS in aiAgentsManager — explicit,
 * ordered, and safe to tree-shake in tests.
 */

export { DemoTaskReaction } from './DemoTaskReaction'
