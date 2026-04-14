import { useState } from 'react';
import type { ReactElement } from 'react';
import { OCR_MODELS } from '../../../../../../shared/models';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import {
	ExtractorDialogContent,
	type ExtractorType,
	type ExtraValue,
} from './ExtractorDialogContent';

export type { ExtractorType } from './ExtractorDialogContent';

interface ExtractorDialogProps {
	readonly type: ExtractorType;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}

export function ExtractorDialog({ type, open, onOpenChange }: ExtractorDialogProps): ReactElement {
	const [selectedModel, setSelectedModel] = useState(OCR_MODELS[0]?.modelId ?? '');
	const [selectedExtras, setSelectedExtras] = useState<ExtraValue[]>(['descrizione']);
	const [outputFileName, setOutputFileName] = useState('');
	const [fileSrc, setFileSrc] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);

	const toggleExtra = (value: ExtraValue): void => {
		setSelectedExtras((prev) =>
			prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
		);
	};

	const handleFileAccept = (file: File): void => {
		const url = URL.createObjectURL(file);
		if (fileSrc) URL.revokeObjectURL(fileSrc);
		setFileSrc(url);
		setFileName(file.name);
		if (!outputFileName) {
			setOutputFileName(file.name.replace(/\.[^.]+$/, ''));
		}
	};

	const handleClose = (nextOpen: boolean): void => {
		if (!nextOpen && fileSrc) {
			URL.revokeObjectURL(fileSrc);
			setFileSrc(null);
			setFileName(null);
		}
		onOpenChange(nextOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col py-0 p-0">
				<DialogHeader className="contents space-y-0 text-left py-0">
					<DialogDescription render={<div />} className="flex min-h-0 flex-1">
						<ExtractorDialogContent
							type={type}
							fileSrc={fileSrc}
							fileName={fileName}
							selectedModel={selectedModel}
							onModelChange={setSelectedModel}
							selectedExtras={selectedExtras}
							onToggleExtra={toggleExtra}
							outputFileName={outputFileName}
							onOutputFileNameChange={setOutputFileName}
							onFileAccept={handleFileAccept}
							onCancel={() => handleClose(false)}
							onSubmit={() => {
								// Placeholder for submission
							}}
						/>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
