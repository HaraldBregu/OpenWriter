import type { OutputFileMetadata, DocumentImageInfo } from '../../../../../shared/types';
import type { DocumentChatMessage } from './state';

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
	| { type: 'CHAT_RESET' }
	| { type: 'CHAT_MESSAGE_ADDED'; message: DocumentChatMessage }
	| {
			type: 'CHAT_MESSAGE_UPDATED';
			id: string;
			patch: Partial<Omit<DocumentChatMessage, 'id' | 'role' | 'timestamp'>>;
	  }
	| { type: 'CHAT_ACTIVE_MESSAGE_SET'; messageId: string | null }
	| { type: 'CHAT_ACTIVE_TASK_SET'; taskId: string | null }
	| { type: 'CHAT_MESSAGES_LOADED'; messages: DocumentChatMessage[] };
