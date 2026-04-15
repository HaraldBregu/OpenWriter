import type { DocumentConfig } from '../../../../../../../shared/types';

export type InfoAction =
	| { type: 'DOCUMENT_CONFIG_LOADED'; config: DocumentConfig | null }
	| { type: 'CONFIRM_DELETE_OPEN_CHANGED'; open: boolean }
	| { type: 'DELETE_STARTED' }
	| { type: 'DELETE_FINISHED' }
	| { type: 'IMAGE_PREVIEW_OPENED'; src: string; alt: string }
	| { type: 'IMAGE_PREVIEW_CLOSED' };
