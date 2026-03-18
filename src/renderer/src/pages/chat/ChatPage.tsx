import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { debounce } from 'lodash';
import { Trash2 } from 'lucide-react';

const ChatPage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { t } = useTranslation();

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [loaded, setLoaded] = useState(false);
	const [isTrashing, setIsTrashing] = useState(false);

	const stateRef = useRef({ title, content });
	stateRef.current = { title, content };

	const loadedRef = useRef(false);
	loadedRef.current = loaded;

	useEffect(() => {
		if (!id) return;
		let cancelled = false;

		setLoaded(false);
		setTitle('');
		setContent('');

		async function load() {
			try {
				const output = await window.workspace.loadOutput({
					type: 'chats',
					id: id!,
				});

				if (cancelled || !output) {
					if (!cancelled) setLoaded(true);
					return;
				}

				setTitle(output.metadata.title || '');
				setContent(output.content || '');
				setLoaded(true);
			} catch {
				if (!cancelled) setLoaded(true);
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [id]);

	const debouncedSave = useMemo(
		() =>
			debounce(
				() => {
					if (!id || !loadedRef.current) return;
					const { title: t, content: c } = stateRef.current;
					window.workspace.updateOutput({
						type: 'chats',
						id,
						content: c,
						metadata: { title: t },
					});
				},
				1500,
				{ leading: false, trailing: true }
			),
		[id]
	);

	useEffect(() => {
		return () => {
			debouncedSave.cancel();
		};
	}, [debouncedSave]);

	const handleTitleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setTitle(e.target.value);
			debouncedSave();
		},
		[debouncedSave]
	);

	const handleMoveToTrash = useCallback(async () => {
		if (!id || isTrashing) return;

		setIsTrashing(true);
		debouncedSave.cancel();

		try {
			await window.workspace.trashOutput({ type: 'chats', id });
			navigate('/home');
		} catch {
			setIsTrashing(false);
		}
	}, [id, isTrashing, navigate, debouncedSave]);

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center gap-3 border-b px-6 py-3">
				<input
					type="text"
					value={title}
					onChange={handleTitleChange}
					placeholder={t('chat.titlePlaceholder')}
					className="flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-muted-foreground"
				/>
				<button
					onClick={handleMoveToTrash}
					disabled={isTrashing}
					className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
					title={t('common.moveToTrash')}
				>
					<Trash2 className="h-4 w-4" />
				</button>
			</div>

			{/* Chat area */}
			<div className="flex-1 overflow-y-auto">
				<div className="w-full max-w-3xl mx-auto px-6 py-10">
					{loaded && (
						<div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-muted-foreground">
							<p className="text-lg font-medium">{t('chat.placeholder')}</p>
							<p className="text-sm">{t('chat.placeholderDescription')}</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ChatPage;
