import { useCallback, useEffect, useState } from 'react';
import type { ResourceInfo } from '../../../../../../shared/types';

type ContentStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseContentDataReturn {
	resources: ResourceInfo[];
	isLoading: boolean;
	error: string | null;
	uploading: boolean;
	loadContent: () => Promise<void>;
	setUploading: (value: boolean) => void;
}

export function useContentData(): UseContentDataReturn {
	const [resources, setResources] = useState<ResourceInfo[]>([]);
	const [status, setStatus] = useState<ContentStatus>('idle');
	const [error, setError] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);

	const isLoading = status === 'idle' || status === 'loading';

	const loadContent = useCallback(async () => {
		try {
			setStatus('loading');
			setError(null);
			const contents = await window.workspace.getContents();
			setResources(contents);
			setStatus('ready');
		} catch (err) {
			setError((err as Error).message || 'Failed to load contents');
			setStatus('error');
		}
	}, []);

	useEffect(() => {
		loadContent();
	}, [loadContent]);

	return { resources, isLoading, error, uploading, loadContent, setUploading };
}
