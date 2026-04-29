import type { ReactNode } from 'react';
import { File, FileImage, FileText } from 'lucide-react';
import {
	MIME_PREFIX_IMAGE,
	MIME_TYPE_JSON,
	MIME_TYPE_PDF,
} from '../../shared/resource-preview-utils';

export function getFileIcon(mimeType: string): ReactNode {
	if (mimeType.startsWith(MIME_PREFIX_IMAGE)) {
		return <FileImage className="h-5 w-5 text-muted-foreground" />;
	}
	if (mimeType === MIME_TYPE_PDF || mimeType === MIME_TYPE_JSON) {
		return <FileText className="h-5 w-5 text-muted-foreground" />;
	}
	return <File className="h-5 w-5 text-muted-foreground" />;
}
