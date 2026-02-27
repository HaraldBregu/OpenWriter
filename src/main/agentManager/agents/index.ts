/**
 * agents/index.ts — barrel that self-registers all named agents.
 *
 * Importing this module is enough to populate the agentRegistry singleton.
 * Each file calls `agentRegistry.register()` as a side effect on import.
 *
 * Import order matters only for readability — registration order does not
 * affect behaviour because the registry is keyed by unique string ids.
 */

// Side-effect imports — trigger agentRegistry.register() for each agent
import './StoryWriter'
import './TextCompleter'
import './ContentReview'
import './Summarizer'
import './ToneAdjuster'

// Named re-exports — allow callers to reference specific definitions directly
export { StoryWriterAgent } from './StoryWriter'
export { TextCompleterAgent } from './TextCompleter'
export { ContentReviewAgent } from './ContentReview'
export { SummarizerAgent } from './Summarizer'
export { ToneAdjusterAgent } from './ToneAdjuster'
