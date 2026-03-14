/**
 * All TaskReactionHandler implementations.
 *
 * Register these with TaskReactionRegistry in bootstrapServices().
 * Pattern mirrors agent registrations in bootstrap — explicit,
 * ordered, and safe to tree-shake in tests.
 */

export { TextEnhanceTaskReaction } from './text-enhance-task-reaction';
