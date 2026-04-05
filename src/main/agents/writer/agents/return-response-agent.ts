import type { LoggerService } from '../../../services/logger';
import { WRITER_STATE_MESSAGES } from '../messages';
import { WriterState } from '../state';

export async function returnResponseAgent(
	state: typeof WriterState.State,
	logger?: LoggerService
): Promise<Partial<typeof WriterState.State>> {
	const response = state.alignedResponse || state.draftResponse || '';

	logger?.info('WriterReturnResponseAgent', 'Returning final response', {
		responseLength: response.length,
		revisionCount: state.revisionCount,
	});

	return {
		phaseLabel: WRITER_STATE_MESSAGES.RETURN,
		response,
	};
}
