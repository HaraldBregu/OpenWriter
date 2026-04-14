import { useState } from 'react';
import type { ReactElement } from 'react';
import { ImageIcon } from 'lucide-react';
import { OCR_MODELS } from '../../../../../../shared/models';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/Empty';
import { FileUpload, FileUploadDropzone, FileUploadTrigger } from '@/components/ui/FileUpload';
import { Image } from '@/components/image/Image';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable';
import {
	AnalysisPanel,
	ExtractorHeader,
	type ExtraValue,
} from './ExtractorDialog';

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,image/bmp,image/svg+xml';

interface ImageExtractorProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}

export function ImageExtractor({ open, onOpenChange }: ImageExtractorProps): ReactElement {
	const [selectedModel, setSelectedModel] = useState(OCR_MODELS[0]?.modelId ?? '');
	const [selectedExtras, setSelectedExtras] = useState<ExtraValue[]>(['descrizione']);
	const [outputFileName, setOutputFileName] = useState('');
	const [imageSrc, setImageSrc] = useState<string | null>(null);
	const [imageName, setImageName] = useState<string | null>(null);

	const toggleExtra = (value: ExtraValue): void => {
		setSelectedExtras((prev) =>
			prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
		);
	};

	const handleFileAccept = (file: File): void => {
		const url = URL.createObjectURL(file);
		if (imageSrc) URL.revokeObjectURL(imageSrc);
		setImageSrc(url);
		setImageName(file.name);
		if (!outputFileName) {
			setOutputFileName(file.name.replace(/\.[^.]+$/, ''));
		}
	};

	const handleClose = (nextOpen: boolean): void => {
		if (!nextOpen && imageSrc) {
			URL.revokeObjectURL(imageSrc);
			setImageSrc(null);
			setImageName(null);
		}
		onOpenChange(nextOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col py-0 p-0">
				<DialogHeader className="contents space-y-0 text-left py-0">
					<DialogDescription render={<div />} className="flex min-h-0 flex-1">
						<FileUpload
							accept={IMAGE_ACCEPT}
							onFileAccept={handleFileAccept}
							className="flex min-h-0 w-full flex-1"
						>
							<ResizablePanelGroup orientation="horizontal" className="h-full w-full">
								<ResizablePanel defaultSize={70} minSize="40%" className="relative rounded-l-xl">
									{imageSrc ? (
										<div className="flex h-full w-full items-center justify-center bg-muted/30 p-8">
											<Image
												src={imageSrc}
												alt={imageName ?? 'Preview'}
												className="max-h-full max-w-full object-contain"
												cardClassName="max-h-full max-w-full overflow-hidden"
											/>
										</div>
									) : (
										<FileUploadDropzone className="flex h-full w-full items-center justify-center rounded-none border-0 bg-muted/30 p-8 hover:bg-muted/40">
											<Empty className="border-0 p-0">
												<EmptyHeader>
													<EmptyMedia variant="icon" className="size-16 rounded-full">
														<ImageIcon className="size-8 text-muted-foreground" />
													</EmptyMedia>
													<EmptyTitle>Nessuna immagine selezionata</EmptyTitle>
													<EmptyDescription>
														Trascina un&apos;immagine qui o
													</EmptyDescription>
												</EmptyHeader>
												<EmptyContent>
													<FileUploadTrigger
														render={<Button variant="outline">Seleziona immagine</Button>}
													/>
												</EmptyContent>
											</Empty>
										</FileUploadDropzone>
									)}
								</ResizablePanel>
								<ResizableHandle withHandle />
								<ResizablePanel defaultSize={30} minSize="30%">
									<AnalysisPanel
										header={
											<ExtractorHeader
												icon={<ImageIcon className="h-5 w-5 text-muted-foreground" />}
												fileName={imageName}
												placeholder="Immagine"
												changeLabel="Cambia immagine"
											/>
										}
										title="Impostazioni analisi"
										hasFile={imageSrc !== null}
										selectedModel={selectedModel}
										onModelChange={setSelectedModel}
										selectedExtras={selectedExtras}
										onToggleExtra={toggleExtra}
										outputFileName={outputFileName}
										onOutputFileNameChange={setOutputFileName}
										onCancel={() => handleClose(false)}
										onSubmit={() => {
											// Placeholder for image analysis submission
										}}
									/>
								</ResizablePanel>
							</ResizablePanelGroup>
						</FileUpload>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
