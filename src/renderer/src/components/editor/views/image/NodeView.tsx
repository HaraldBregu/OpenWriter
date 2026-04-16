import React from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Sparkles, Pencil, Trash2, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/Empty';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip';
import { Provider } from './Provider';
import { useImage } from './hooks/use-image';
import { ImageEditor } from './components/ImageEditor';
import { ImagePreviewDialog } from './components';

function ImageInner(): React.JSX.Element {
	const { t } = useTranslation();
	const {
		state,
		resolvedSrc,
		alt,
		title,
		showToolbar,
		handleError,
		handleLoad,
		handleDelete,
		handleAskAI,
		handleEdit,
		handleImageClick,
		handleKeyDown,
		handleEditorSave,
		handleEditorCancel,
		setHovered,
		setFocused,
		setPreviewing,
	} = useImage();

	return (
		<>
			{state.editing && resolvedSrc ? (
				<ImageEditor
					src={resolvedSrc}
					alt={alt}
					initialMode={state.editInitialMode}
					onSave={handleEditorSave}
					onCancel={handleEditorCancel}
				/>
			) : (
				<Card
					size="sm"
					className="inline-block max-w-full"
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					onKeyDown={handleKeyDown}
					tabIndex={state.loadError || !resolvedSrc ? -1 : 0}
					role="img"
					aria-label={alt ?? t('imageNode.imageLabel')}
				>
					<CardContent className="relative">
						<TooltipProvider delay={300}>
							<div
								className={cn(
									'absolute top-2 right-2 z-10',
									'flex items-center gap-0.5 rounded-xl',
									'border border-border/80 bg-popover/95 p-1.5',
									'backdrop-blur-md shadow-lg',
									'pointer-events-none opacity-0',
									'transition-all duration-200 ease-out',
									'-translate-y-1 scale-95',
									showToolbar && 'pointer-events-auto opacity-100 translate-y-0 scale-100'
								)}
								role="toolbar"
								aria-label={t('imageNode.imageToolbar')}
							>
								<Button
									variant="ghost"
									size="icon-xs"
									aria-label={t('imageNode.askAI')}
									onClick={handleAskAI}
									className="flex h-5 w-auto items-center gap-1 px-1.5 text-muted-foreground hover:text-foreground [&_svg]:h-3 [&_svg]:w-3"
								>
									<Sparkles />
									<span className="text-xs font-medium">Ask AI</span>
								</Button>

								<div className="h-4 w-px bg-border/50" />

								<Tooltip>
									<TooltipTrigger
										render={
											<Button
												variant="ghost"
												size="icon-xs"
												aria-label={t('imageNode.edit')}
												onClick={handleEdit}
												className="h-5 w-5 text-muted-foreground hover:text-foreground [&_svg]:h-3 [&_svg]:w-3"
											>
												<Pencil />
											</Button>
										}
									/>
									<TooltipContent side="top" sideOffset={4} className="px-2 py-1 text-xs">
										{t('imageNode.edit')}
									</TooltipContent>
								</Tooltip>

								<Button
									variant="ghost"
									size="icon-xs"
									onClick={handleDelete}
									aria-label={t('imageNode.delete')}
									className="h-5 w-5 text-muted-foreground hover:text-destructive [&_svg]:h-3 [&_svg]:w-3"
								>
									<Trash2 />
								</Button>
							</div>
						</TooltipProvider>

						{state.loadError || !resolvedSrc ? (
							<Empty className="h-32 w-64" role="img" aria-label={alt ?? t('imageNode.notFound')}>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<ImageOff />
									</EmptyMedia>
									<EmptyTitle>{alt ?? t('imageNode.notFound')}</EmptyTitle>
								</EmptyHeader>
							</Empty>
						) : (
							<img
								src={resolvedSrc}
								alt={alt ?? ''}
								title={title ?? undefined}
								onError={handleError}
								onLoad={handleLoad}
								onClick={handleImageClick}
								draggable={false}
								className="block max-w-full cursor-pointer rounded-md"
							/>
						)}
					</CardContent>
				</Card>
			)}

			<ImagePreviewDialog
				open={state.previewing}
				onOpenChange={setPreviewing}
				src={resolvedSrc}
				alt={alt}
			/>
		</>
	);
}

export function ImageNodeView(props: NodeViewProps): React.JSX.Element {
	return (
		<NodeViewWrapper contentEditable={false} className="my-4">
			<Provider nodeViewProps={props}>
				<ImageInner />
			</Provider>
		</NodeViewWrapper>
	);
}
