import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
	AlertCircle,
	CheckCircle2,
	Info,
	LoaderCircle,
	TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import type {
	ExtensionCommandExecutionResult,
	ExtensionDocPanelBlock,
	ExtensionDocPanelButtonAction,
	ExtensionDocPanelContent,
} from '@shared/types';

interface ExtensionPanelProps {
	panelId: string;
	documentId: string;
}

function EmptyState({ message }: { message: string }): React.ReactElement {
	return <p className="text-sm text-muted-foreground">{message}</p>;
}

function toneClasses(tone: 'info' | 'warning' | 'error' | 'success' = 'info'): string {
	switch (tone) {
		case 'warning':
			return 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200';
		case 'error':
			return 'border-destructive/40 bg-destructive/10 text-destructive';
		case 'success':
			return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200';
		default:
			return 'border-border/70 bg-muted/40 text-foreground';
	}
}

function NoticeIcon({
	tone = 'info',
}: {
	tone?: 'info' | 'warning' | 'error' | 'success';
}): React.ReactElement {
	switch (tone) {
		case 'warning':
			return <TriangleAlert className="mt-0.5 size-4 shrink-0" />;
		case 'error':
			return <AlertCircle className="mt-0.5 size-4 shrink-0" />;
		case 'success':
			return <CheckCircle2 className="mt-0.5 size-4 shrink-0" />;
		default:
			return <Info className="mt-0.5 size-4 shrink-0" />;
	}
}

interface BlockRendererProps {
	blocks: ExtensionDocPanelBlock[];
	pendingActionId: string | null;
	actionError: string | null;
	onRunAction: (action: ExtensionDocPanelButtonAction) => void;
}

function BlockRenderer({
	blocks,
	pendingActionId,
	actionError,
	onRunAction,
}: BlockRendererProps): React.ReactElement {
	return (
		<div className="space-y-4">
			{actionError ? (
				<div className={toneClasses('error')}>
					<div className="flex gap-2 rounded-lg border px-3 py-2 text-sm">
						<AlertCircle className="mt-0.5 size-4 shrink-0" />
						<span>{actionError}</span>
					</div>
				</div>
			) : null}
			{blocks.map((block, index) => {
				switch (block.type) {
					case 'text':
						return (
							<p key={index} className="whitespace-pre-wrap text-sm leading-6 text-foreground">
								{block.text}
							</p>
						);
					case 'markdown':
						return (
							<div
								key={index}
								className="prose prose-sm max-w-none text-foreground dark:prose-invert"
							>
								<ReactMarkdown>{block.markdown}</ReactMarkdown>
							</div>
						);
					case 'keyValueList':
						return (
							<div
								key={index}
								className="overflow-hidden rounded-lg border border-border/70"
							>
								{block.items.map((item, itemIndex) => (
									<div
										key={`${item.label}-${itemIndex}`}
										className="grid grid-cols-[minmax(96px,120px)_1fr] gap-3 border-b border-border/70 px-3 py-2 text-sm last:border-b-0"
									>
										<span className="font-medium text-muted-foreground">{item.label}</span>
										<span className="break-words text-foreground">{item.value}</span>
									</div>
								))}
							</div>
						);
					case 'notice':
						return (
							<div key={index} className={toneClasses(block.tone)}>
								<div className="flex gap-2 rounded-lg border px-3 py-2 text-sm">
									<NoticeIcon tone={block.tone} />
									<div className="space-y-1">
										{block.title ? <p className="font-medium">{block.title}</p> : null}
										<p>{block.description}</p>
									</div>
								</div>
							</div>
						);
					case 'buttonRow':
						return (
							<div key={index} className="flex flex-wrap gap-2">
								{block.buttons.map((button) => {
									const isPending = pendingActionId === button.id;
									return (
										<Button
											key={button.id}
											type="button"
											variant={button.variant ?? 'outline'}
											size="sm"
											disabled={Boolean(pendingActionId)}
											onClick={() => onRunAction(button)}
										>
											{isPending ? (
												<LoaderCircle className="mr-1.5 size-4 animate-spin" />
											) : null}
											{button.label}
										</Button>
									);
								})}
							</div>
						);
					default:
						return (
							<div key={index} className={toneClasses('warning')}>
								<div className="flex gap-2 rounded-lg border px-3 py-2 text-sm">
									<TriangleAlert className="mt-0.5 size-4 shrink-0" />
									<span>Unsupported panel block.</span>
								</div>
							</div>
						);
				}
			})}
		</div>
	);
}

function extractErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	return 'The extension panel failed to load.';
}

export default function ExtensionPanel({
	panelId,
	documentId,
}: ExtensionPanelProps): React.ReactElement {
	const [content, setContent] = useState<ExtensionDocPanelContent | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pendingActionId, setPendingActionId] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	const loadContent = useCallback(
		async (mode: 'open' | 'refresh' = 'open') => {
			setLoading(true);
			setError(null);
			try {
				const next =
					mode === 'refresh'
						? await window.extensions.refreshDocPanel(panelId, documentId)
						: await window.extensions.getDocPanelContent(panelId, documentId);
				setContent(next);
			} catch (nextError) {
				setError(extractErrorMessage(nextError));
				setContent(null);
			} finally {
				setLoading(false);
			}
		},
		[documentId, panelId]
	);

	useEffect(() => {
		void loadContent('open');
	}, [loadContent]);

	useEffect(() => {
		const unsubscribe = window.extensions.onDocPanelContentChanged((payload) => {
			if (payload.documentId !== documentId) return;
			void loadContent('refresh');
		});

		return unsubscribe;
	}, [documentId, loadContent]);

	const runAction = useCallback(async (action: ExtensionDocPanelButtonAction) => {
		setPendingActionId(action.id);
		setActionError(null);
		try {
			const result: ExtensionCommandExecutionResult = await window.extensions.executeDocPanelAction(
				action.commandId,
				action.payload
			);
			if (!result.ok) {
				setActionError(result.error || 'The panel action failed.');
			}
		} catch (nextError) {
			setActionError(extractErrorMessage(nextError));
		} finally {
			setPendingActionId(null);
		}
	}, []);

	const blocks = useMemo(() => content?.blocks ?? [], [content]);

	return (
		<Card className="flex h-full w-full flex-col border-none rounded-none bg-card/55 dark:bg-background p-0! gap-0! ring-0 border-l border-border/70">
			<CardContent className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
				{loading ? (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<LoaderCircle className="size-4 animate-spin" />
						<span>Loading panel…</span>
					</div>
				) : error ? (
					<div className={toneClasses('error')}>
						<div className="flex gap-2 rounded-lg border px-3 py-2 text-sm">
							<AlertCircle className="mt-0.5 size-4 shrink-0" />
							<span>{error}</span>
						</div>
					</div>
				) : blocks.length === 0 ? (
					<EmptyState message="This panel returned no content." />
				) : (
					<BlockRenderer
						blocks={blocks}
						pendingActionId={pendingActionId}
						actionError={actionError}
						onRunAction={runAction}
					/>
				)}
			</CardContent>
		</Card>
	);
}
