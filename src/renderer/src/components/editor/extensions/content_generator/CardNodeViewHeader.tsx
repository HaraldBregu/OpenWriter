import React from 'react';
import { CardHeader } from '@/components/ui/Card';
import {
	FileUploadList,
	FileUploadItem,
	FileUploadItemPreview,
	FileUploadItemDelete,
} from '@/components/ui/FileUpload';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

interface CardNodeViewHeaderProps {
	readonly files: File[];
}

export function CardNodeViewHeader({ files }: CardNodeViewHeaderProps): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<CardHeader className="space-y-0 py-0 px-3.5">
			<div className="flex items-center gap-2 pt-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<FileUploadList
					forceMount
					orientation="horizontal"
					className="contents border-0 p-0"
				>
					{files.map((file) => (
						<FileUploadItem
							key={`${file.name}-${file.lastModified}-${file.size}`}
							value={file}
							className="group/thumb relative shrink-0 gap-0 rounded-none border-0 p-0"
						>
							<FileUploadItemPreview
									className="h-14 w-14 overflow-hidden rounded-xl"
									previewRender={(file, fallback) => {
										if (file.type.startsWith('image/')) {
											return (
												<img
													src={URL.createObjectURL(file)}
													alt={file.name}
													className="h-full w-full object-fill"
												/>
											);
										}
										return fallback();
									}}
								/>
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
		</CardHeader>
	);
}
