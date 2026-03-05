/**
 * @deprecated This file is a compatibility facade.
 * Import from the split files directly:
 *   - Types:     '@/store/writings/types'
 *   - Actions:   '@/store/writings/actions'
 *   - Selectors: '@/store/writings/selectors'
 *   - Reducer:   '@/store/writings/reducer'
 *   - Barrel:    '@/store/writings'
 */

export type { WritingItem, WritingsState } from './types';

export {
	writingsSlice,
	writingsLoaded,
	writingAdded,
	writingUpdated,
	writingRemoved,
	writingSelected,
	writingsLoadingStarted,
	writingsLoadingFailed,
} from './reducer';
export { default } from './reducer';

export {
	selectAllWritings,
	selectSelectedWriting,
	selectSelectedWritingId,
	selectWritingsStatus,
	selectWritingsError,
	selectWritingById,
} from './selectors';
