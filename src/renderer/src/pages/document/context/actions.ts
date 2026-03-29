import type { OutputFileMetadata, DocumentImageInfo } from '../../../../../shared/types';
import type { ChatAction, ChatSessionListItem } from '../panels/chat/context';

export type DocumentAction =
	| { type: 'LOAD_STARTED' }
	| { type: 'LOAD_SUCCEEDED'; title: string; content: string; metadata: OutputFileMetadata }
	| { type: 'LOAD_FAILED' }
	| { type: 'TITLE_CHANGED'; value: string }
	| { type: 'CONTENT_CHANGED'; value: string }
	| { type: 'METADATA_UPDATED'; metadata: OutputFileMetadata | null }
	| { type: 'IMAGES_UPDATED'; images: DocumentImageInfo[] }
	| { type: 'TRASH_STARTED' }
	| { type: 'TRASH_FAILED' }
	| { type: 'SIDEBAR_TOGGLED' }
	| { type: 'AGENTIC_SIDEBAR_TOGGLED' }
	| { type: 'CHAT_SESSIONS_LOADED'; sessions: ChatSessionListItem[] }
	| ChatAction;
