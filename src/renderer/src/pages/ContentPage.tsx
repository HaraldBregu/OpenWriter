import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	Download,
	Eye,
	Share2,
	MoreHorizontal,
	Copy,
	Trash2,
	PenLine,
	Search,
	X,
	PanelRight,
	Settings,
} from 'lucide-react';
import {
	AppButton,
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuSeparator,
	AppDropdownMenuTrigger,
	AppLabel,
	AppSlider,
	AppSwitch,
	AppSelect,
	AppSelectTrigger,
	AppSelectValue,
	AppSelectContent,
	AppSelectItem,
	AppSidebar,
	AppSidebarContent,
	AppSidebarGroup,
	AppSidebarGroupLabel,
	AppSidebarGroupContent,
	AppSidebarHeader,
	AppSidebarSeparator,
	AppSidebarProvider,
	AppSidebarInset,
	useSidebar,
} from '@/components/app';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import { subscribeToTask } from '../services/task-event-bus';
import type { TaskSnapshot } from '../services/task-event-bus';
import { debounce } from 'lodash';
import { useTask } from '@/hooks/use-task';

// ---------------------------------------------------------------------------
// Right sidebar — configuration demo
// ---------------------------------------------------------------------------

function ConfigSidebar() {
	const [fontSize, setFontSize] = useState([16]);
	const [lineHeight, setLineHeight] = useState([1.6]);
	const [fontFamily, setFontFamily] = useState('sans');
	const [spellCheck, setSpellCheck] = useState(true);
	const [autoSave, setAutoSave] = useState(true);
	const [focusMode, setFocusMode] = useState(false);
	const [showLineNumbers, setShowLineNumbers] = useState(false);
	const [editorWidth, setEditorWidth] = useState('normal');

	return (
		<AppSidebar side="right" className="top-12 h-[calc(100svh-3rem)]">
			<AppSidebarHeader className="border-b px-4 py-3">
				<div className="flex items-center gap-2">
					<Settings className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-semibold">Configuration</span>
				</div>
			</AppSidebarHeader>

			<AppSidebarContent>
				{/* Typography */}
				<AppSidebarGroup>
					<AppSidebarGroupLabel>Typography</AppSidebarGroupLabel>
					<AppSidebarGroupContent className="space-y-4 px-2">
						<div className="space-y-2">
							<AppLabel className="text-xs text-muted-foreground">Font Family</AppLabel>
							<AppSelect value={fontFamily} onValueChange={setFontFamily}>
								<AppSelectTrigger className="h-8 text-sm">
									<AppSelectValue />
								</AppSelectTrigger>
								<AppSelectContent>
									<AppSelectItem value="sans">Sans Serif</AppSelectItem>
									<AppSelectItem value="serif">Serif</AppSelectItem>
									<AppSelectItem value="mono">Monospace</AppSelectItem>
								</AppSelectContent>
							</AppSelect>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<AppLabel className="text-xs text-muted-foreground">Font Size</AppLabel>
								<span className="text-xs text-muted-foreground">{fontSize[0]}px</span>
							</div>
							<AppSlider value={fontSize} onValueChange={setFontSize} min={12} max={24} step={1} />
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<AppLabel className="text-xs text-muted-foreground">Line Height</AppLabel>
								<span className="text-xs text-muted-foreground">{lineHeight[0].toFixed(1)}</span>
							</div>
							<AppSlider
								value={lineHeight}
								onValueChange={setLineHeight}
								min={1.0}
								max={2.5}
								step={0.1}
							/>
						</div>
					</AppSidebarGroupContent>
				</AppSidebarGroup>

				<AppSidebarSeparator />

				{/* Layout */}
				<AppSidebarGroup>
					<AppSidebarGroupLabel>Layout</AppSidebarGroupLabel>
					<AppSidebarGroupContent className="space-y-4 px-2">
						<div className="space-y-2">
							<AppLabel className="text-xs text-muted-foreground">Editor Width</AppLabel>
							<AppSelect value={editorWidth} onValueChange={setEditorWidth}>
								<AppSelectTrigger className="h-8 text-sm">
									<AppSelectValue />
								</AppSelectTrigger>
								<AppSelectContent>
									<AppSelectItem value="narrow">Narrow</AppSelectItem>
									<AppSelectItem value="normal">Normal</AppSelectItem>
									<AppSelectItem value="wide">Wide</AppSelectItem>
									<AppSelectItem value="full">Full Width</AppSelectItem>
								</AppSelectContent>
							</AppSelect>
						</div>
					</AppSidebarGroupContent>
				</AppSidebarGroup>

				<AppSidebarSeparator />

				{/* Preferences */}
				<AppSidebarGroup>
					<AppSidebarGroupLabel>Preferences</AppSidebarGroupLabel>
					<AppSidebarGroupContent className="space-y-3 px-2">
						<div className="flex items-center justify-between">
							<AppLabel className="text-sm">Spell Check</AppLabel>
							<AppSwitch checked={spellCheck} onCheckedChange={setSpellCheck} />
						</div>
						<div className="flex items-center justify-between">
							<AppLabel className="text-sm">Auto Save</AppLabel>
							<AppSwitch checked={autoSave} onCheckedChange={setAutoSave} />
						</div>
						<div className="flex items-center justify-between">
							<AppLabel className="text-sm">Focus Mode</AppLabel>
							<AppSwitch checked={focusMode} onCheckedChange={setFocusMode} />
						</div>
						<div className="flex items-center justify-between">
							<AppLabel className="text-sm">Line Numbers</AppLabel>
							<AppSwitch checked={showLineNumbers} onCheckedChange={setShowLineNumbers} />
						</div>
					</AppSidebarGroupContent>
				</AppSidebarGroup>
			</AppSidebarContent>
		</AppSidebar>
	);
}

// ---------------------------------------------------------------------------
// Inner component — rendered inside AppSidebarProvider so useSidebar works
// ---------------------------------------------------------------------------

function ContentPageInner() {
	const { t } = useTranslation();
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { open: sidebarOpen, toggleSidebar } = useSidebar();

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [loaded, setLoaded] = useState(false);
	const [isTrashing, setIsTrashing] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const searchInputRef = useRef<HTMLInputElement>(null);

	const editorRef = useRef<TextEditorElement>(null);

	const task = useTask<{ prompt: string }>('agent-text-continuation', {
		prompt: '',
	});
	console.log(`[ContentPage] rendered`);

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
					type: 'writings',
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
						type: 'writings',
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

	const { charCount, wordCount } = useMemo(() => {
		const trimmed = content.trim();
		const chars = trimmed.length;
		const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(Boolean).length;
		return { charCount: chars, wordCount: words };
	}, [content]);

	const handleTitleChange = useCallback(
		(value: string) => {
			setTitle(value);
			debouncedSave();
		},
		[debouncedSave]
	);

	const handleContentChange = useCallback(
		(newContent: string) => {
			setContent(newContent);
			debouncedSave();
		},
		[debouncedSave]
	);

	const handleMoveToTrash = useCallback(async () => {
		if (!id || isTrashing) return;

		setIsTrashing(true);

		debouncedSave.cancel();

		try {
			await window.workspace.trashOutput({ type: 'writings', id });
			navigate('/home');
		} catch (err) {
			console.error('[ContentPage] Failed to trash writing:', err);
			setIsTrashing(false);
		}
	}, [id, isTrashing, navigate, debouncedSave]);

	useEffect(() => {
		if (!task.taskId) return;
		const unsub = subscribeToTask(task.taskId, (snap: TaskSnapshot) => {
			const completed = snap.status === 'completed';
			editorRef.current?.insertText(snap.streamedContent, {
				preventEditorUpdate: !completed,
			});
		});
		return unsub;
	}, [task.taskId]);

	const handleContinueWithAI = useCallback(
		(content: string, positionFrom: number) => {
			task.submit({ prompt: content + '<<INSERT_HERE>>' }, { metadata: { positionFrom } });
		},
		[task.submit]
	);

	const handleSearchChange = useCallback((query: string) => {
		setSearchQuery(query);
		editorRef.current?.setSearch(query);
	}, []);

	const closeSearch = useCallback(() => {
		setSearchOpen(false);
		setSearchQuery('');
		editorRef.current?.clearSearch();
	}, []);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
				e.preventDefault();
				setSearchOpen(true);
				requestAnimationFrame(() => searchInputRef.current?.focus());
			}
			if (e.key === 'Escape' && searchOpen) {
				closeSearch();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [searchOpen, closeSearch]);

	return (
		<>
			<AppSidebarInset className="flex flex-col min-h-0 min-w-0">
				{searchOpen && (
					<div className="flex items-center gap-2 px-8 py-2 border-b border-border bg-muted/50 shrink-0">
						<Search className="h-4 w-4 text-muted-foreground shrink-0" />
						<input
							ref={searchInputRef}
							type="text"
							value={searchQuery}
							onChange={(e) => handleSearchChange(e.target.value)}
							placeholder={t('common.search')}
							className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
						/>
						<AppButton
							type="button"
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							onClick={closeSearch}
						>
							<X className="h-3.5 w-3.5" />
						</AppButton>
					</div>
				)}
				<div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						<PenLine className="h-4 w-4 text-blue-500 shrink-0" />
						<input
							type="text"
							value={title}
							onChange={(e) => handleTitleChange(e.target.value)}
							placeholder={t('writing.titlePlaceholder')}
							className="text-xl font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 w-full min-w-0"
						/>
					</div>
					<div className="flex items-center gap-3 ml-4 shrink-0">
						<AppButton
							type="button"
							variant={sidebarOpen ? 'secondary' : 'outline'}
							size="icon"
							title="Toggle sidebar"
							onClick={toggleSidebar}
						>
							<PanelRight className="h-4 w-4" />
						</AppButton>
						<AppDropdownMenu>
							<AppDropdownMenuTrigger asChild>
								<AppButton
									type="button"
									variant="outline"
									size="icon"
									title={t('common.moreOptions')}
								>
									<MoreHorizontal className="h-4 w-4" />
								</AppButton>
							</AppDropdownMenuTrigger>
							<AppDropdownMenuContent align="end">
								<AppDropdownMenuItem>
									<Eye className="h-4 w-4" />
									{t('common.preview')}
								</AppDropdownMenuItem>
								<AppDropdownMenuItem>
									<Download className="h-4 w-4" />
									{t('common.download')}
								</AppDropdownMenuItem>
								<AppDropdownMenuItem>
									<Share2 className="h-4 w-4" />
									{t('common.share')}
								</AppDropdownMenuItem>
								<AppDropdownMenuSeparator />
								<AppDropdownMenuItem>
									<Copy className="h-4 w-4" />
									{t('common.duplicate')}
								</AppDropdownMenuItem>
								<AppDropdownMenuItem
									className="text-destructive focus:text-destructive"
									disabled={isTrashing}
									onClick={handleMoveToTrash}
								>
									<Trash2 className="h-4 w-4" />
									{t('common.moveToTrash')}
								</AppDropdownMenuItem>
							</AppDropdownMenuContent>
						</AppDropdownMenu>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
					<div className="w-full max-w-4xl mx-auto px-10 py-10 flex flex-col gap-2">
						{loaded && (
							<TextEditor
								disabled={task.isRunning}
								ref={editorRef}
								key={id}
								value={content}
								onChange={handleContentChange}
								onContinueWithAI={handleContinueWithAI}
							/>
						)}
					</div>
				</div>

				<div className="shrink-0 flex items-center justify-end px-8 py-2 border-t border-border">
					<span className="text-xs text-muted-foreground">
						{t('writing.charactersAndWords', {
							chars: charCount,
							words: wordCount,
						})}
					</span>
				</div>
			</AppSidebarInset>

			<ConfigSidebar />
		</>
	);
}

// ---------------------------------------------------------------------------
// ContentPage — wraps with its own SidebarProvider for the right sidebar
// ---------------------------------------------------------------------------

const ContentPage: React.FC = () => {
	return (
		<AppSidebarProvider defaultOpen={false} className="h-full min-h-0">
			<ContentPageInner />
		</AppSidebarProvider>
	);
};

export default ContentPage;
