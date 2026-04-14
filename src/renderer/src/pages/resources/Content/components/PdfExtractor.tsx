import { useState } from 'react';
import type { ReactElement } from 'react';
import { FileText } from 'lucide-react';
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
import { Pdf } from '@/components/pdf/Pdf';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable';
import {
	AnalysisPanel,
	ExtractorHeader,
	type ExtraValue,
} from './ExtractorDialog';

const PDF_ACCEPT = 'application/pdf';

interface PdfExtractorProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}

export function PdfExtractor({ open, onOpenChange }: PdfExtractorProps): ReactElement {
	const [selectedModel, setSelectedModel] = useState(OCR_MODELS[0]?.modelId ?? '');
	const [selectedExtras, setSelectedExtras] = useState<ExtraValue[]>(['descrizione']);
	const [outputFileName, setOutputFileName] = useState('');
	const [pdfSrc, setPdfSrc] = useState<string | null>(null);
	const [pdfName, setPdfName] = useState<string | null>(null);

	const toggleExtra = (value: ExtraValue): void => {
		setSelectedExtras((prev) =>
			prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
		);
	};

	const handleFileAccept = (file: File): void => {
		const url = URL.createObjectURL(file);
		if (pdfSrc) URL.revokeObjectURL(pdfSrc);
		setPdfSrc(url);
		setPdfName(file.name);
		if (!outputFileName) {
			setOutputFileName(file.name.replace(/\.[^.]+$/, ''));
		}
	};

	const handleClose = (nextOpen: boolean): void => {
		if (!nextOpen && pdfSrc) {
			URL.revokeObjectURL(pdfSrc);
			setPdfSrc(null);
			setPdfName(null);
		}
		onOpenChange(nextOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col py-0 p-0">
				<DialogHeader className="contents space-y-0 text-left py-0">
					<DialogDescription render={<div />} className="flex min-h-0 flex-1">
						<FileUpload
							accept={PDF_ACCEPT}
							onFileAccept={handleFileAccept}
							className="flex min-h-0 w-full flex-1"
						>
							<ResizablePanelGroup orientation="horizontal" className="h-full w-full">
								<ResizablePanel defaultSize={70} minSize="40%" className="relative rounded-l-xl">
									{pdfSrc ? (
										<Pdf src={pdfSrc} className="h-full w-full" />
									) : (
										<FileUploadDropzone className="flex h-full w-full items-center justify-center rounded-none border-0 bg-muted/30 p-8 hover:bg-muted/40">
											<Empty className="border-0 p-0">
												<EmptyHeader>
													<EmptyMedia variant="icon" className="size-16 rounded-full">
														<FileText className="size-8 text-muted-foreground" />
													</EmptyMedia>
													<EmptyTitle>Nessun PDF selezionato</EmptyTitle>
													<EmptyDescription>Trascina un PDF qui o</EmptyDescription>
												</EmptyHeader>
												<EmptyContent>
													<FileUploadTrigger
														render={<Button variant="outline">Seleziona PDF</Button>}
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
												icon={<FileText className="h-5 w-5 text-muted-foreground" />}
												fileName={pdfName}
												placeholder="PDF"
												changeLabel="Cambia PDF"
											/>
										}
										title="Impostazioni OCR"
										hasFile={pdfSrc !== null}
										selectedModel={selectedModel}
										onModelChange={setSelectedModel}
										selectedExtras={selectedExtras}
										onToggleExtra={toggleExtra}
										outputFileName={outputFileName}
										onOutputFileNameChange={setOutputFileName}
										onCancel={() => handleClose(false)}
										onSubmit={() => {
											// Placeholder for PDF OCR submission
										}}
										submitLabel="Esegui OCR"
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
