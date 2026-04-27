import React from 'react';
import { CardHeader } from '@/components/ui/Card';
import { Item, ItemGroup } from '@/components/ui/Item';
import {
	FileUploadList,
	FileUploadItem,
	FileUploadItemPreview,
	FileUploadItemDelete,
} from '@/components/ui/FileUpload';
import { Quote, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { usePrompt } from './hooks';

export function PromptHeader(): React.JSX.Element | null {
	const { t } = useTranslation();
	const { state } = usePrompt();
	const { files, selection } = state;

	const trimmedSelection = selection.trim();
	const hasSelection = trimmedSelection.length > 0;
	const hasFiles = files.length > 0;

	if (!hasFiles && !hasSelection) return null;

	return (
		<CardHeader className="space-y-0 py-0!">
			<ItemGroup>
				<Item size="xs" className="p-0">
					<div className="flex w-full flex-col gap-1.5 pt-1.5 pr-1.5">
						{hasSelection && (
							<div
								className="flex max-w-full items-center gap-1.5 self-start rounded-full border border-border/80 bg-background/75 px-2.5 py-1 text-xs text-foreground/72 shadow-none dark:border-border/90 dark:bg-background/50 dark:text-muted-foreground/95"
								title={trimmedSelection}
								aria-label={t('assistantNode.selectedText', 'Selected text: {{text}}', {
									text: trimmedSelection,
								})}
							>
								<Quote className="h-3 w-3 shrink-0" aria-hidden="true" />
								<span className="min-w-0 max-w-[24rem] truncate">{trimmedSelection}</span>
							</div>
						)}
						{hasFiles && (
							<div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
								<FileUploadList forceMount orientation="horizontal" className="contents border-0 p-0">
									{files.map((file) => (
										<FileUploadItem
											key={`${file.name}-${file.lastModified}-${file.size}`}
											value={file}
											className="group/thumb relative shrink-0 gap-0 rounded-none border-0 p-0"
										>
											<FileUploadItemPreview className="h-14 w-14" />
											<FileUploadItemDelete
												render={
													<Button
														variant="ghost"
														size="icon-xs"
														className="absolute -right-1.5 -top-1.5 z-10 h-5 w-5 rounded-full border border-border/70 bg-background text-muted-foreground opacity-0 shadow-none transition-opacity hover:bg-background hover:text-foreground group-hover/thumb:opacity-100 group-focus-within/thumb:opacity-100 dark:border-white/12 dark:bg-background"
														onMouseDown={(e) => e.preventDefault()}
														aria-label={t('assistantNode.removeImage', 'Remove image')}
													/>
												}
											>
												<X className="h-2.5 w-2.5" aria-hidden="true" />
											</FileUploadItemDelete>
										</FileUploadItem>
									))}
								</FileUploadList>
							</div>
						)}
					</div>
				</Item>
			</ItemGroup>
		</CardHeader>
	);
}
