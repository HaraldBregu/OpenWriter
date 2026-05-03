import type { Provider, ProviderId } from '../../../../../shared/types';
import type { DraftProperties, DraftsByProvider } from './state';

export type ProvidersAction =
	| { type: 'SET_PROVIDERS'; payload: Provider[] }
	| { type: 'SET_DRAFTS'; payload: DraftsByProvider }
	| { type: 'PATCH_DRAFT'; providerId: ProviderId; payload: Partial<DraftProperties> }
	| { type: 'SET_SAVING'; providerId: ProviderId; payload: boolean };
