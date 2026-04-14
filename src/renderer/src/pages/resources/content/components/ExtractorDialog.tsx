import { useState } from 'react';
import type { ReactElement } from 'react';
import { ChevronDown, FileText, ImageIcon, Info, Play } from 'lucide-react';
import { OCR_MODELS } from '../../../../../../shared/models';
import { getProvider } from '../../../../../../shared/providers';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/Card';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
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
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/Item';
import { Pdf } from '@/components/pdf/Pdf';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable';
import { ScrollArea } from '@/components/ui/ScrollArea';

export type ExtractorType = 'image' | 'pdf';

const ACCEPT_ALL = 'image/*,application/pdf';

interface GenericConfig {
	readonly title: string;
	readonly description: string;
	readonly submitLabel: string;
	readonly emptyTitle: string;
	readonly emptyDescription: string;
	readonly selectLabel: string;
	readonly placeholder: string;
	readonly changeLabel: string;
	readonly icon: ReactElement;
	readonly emptyIcon: ReactElement;
}

const GENERIC_CONFIG: GenericConfig = {
	title: 'Impostazioni estrazione',
	description: "Carica un'immagine o un PDF per configurare l'estrazione.",
	submitLabel: 'Esegui',
	emptyTitle: 'Carica un file',
	emptyDescription: 'Trascina qui un\'immagine (PNG, JPG, WEBP…) o un PDF, oppure',
	selectLabel: 'Scegli file',
	placeholder: 'File',
	changeLabel: 'Cambia file',
	icon: <FileText className="h-5 w-5 text-muted-foreground" />,
	emptyIcon: (
		<div className="flex items-center gap-2">
			<ImageIcon className="size-8 text-muted-foreground" />
			<FileText className="size-8 text-muted-foreground" />
		</div>
	),
};

const detectType = (file: File): ExtractorType =>
	file.type === 'application/pdf' ? 'pdf' : 'image';

const EXTRA_OPTIONS = [
	{ value: 'descrizione', label: 'Descrizione' },
	{ value: 'didascalia', label: 'Didascalia' },
	{ value: 'metadati', label: 'Metadati' },
] as const;

type ExtraValue = (typeof EXTRA_OPTIONS)[number]['value'];

const PROVIDER_COLORS: Record<string, string> = {
	openai: 'bg-green-600',
	anthropic: 'bg-amber-700',
	google: 'bg-blue-600',
	meta: 'bg-blue-500',
	mistral: 'bg-orange-500',
	amazon: 'bg-yellow-600',
};

interface TypeConfig {
	readonly icon: ReactElement;
	readonly placeholder: string;
	readonly changeLabel: string;
	readonly title: string;
	readonly description: string;
	readonly submitLabel: string;
}

const TYPE_CONFIG: Record<ExtractorType, TypeConfig> = {
	image: {
		icon: <ImageIcon className="h-5 w-5 text-muted-foreground" />,
		placeholder: 'Immagine',
		changeLabel: 'Cambia immagine',
		title: 'Impostazioni analisi',
		description:
			"Configura il modello AI per estrarre descrizione, didascalia e metadati dall'immagine.",
		submitLabel: 'Analizza',
	},
	pdf: {
		icon: <FileText className="h-5 w-5 text-muted-foreground" />,
		placeholder: 'PDF',
		changeLabel: 'Cambia PDF',
		title: 'Impostazioni OCR',
		description: 'Configura il modello OCR per estrarre testo, tabelle e struttura dal PDF.',
		submitLabel: 'Esegui OCR',
	},
};

export interface ExtractorRunPayload {
	readonly type: ExtractorType;
	readonly file: File;
	readonly fileName: string;
	readonly fileSrc: string;
	readonly modelId: string;
	readonly extras: readonly ExtraValue[];
	readonly outputFileName: string;
}

interface ExtractorDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly onRun?: (payload: ExtractorRunPayload) => void | Promise<void>;
}

export function ExtractorDialog({
	open,
	onOpenChange,
	onRun,
}: ExtractorDialogProps): ReactElement {
	const [selectedModel, setSelectedModel] = useState(OCR_MODELS[0]?.modelId ?? '');
	const [selectedExtras, setSelectedExtras] = useState<ExtraValue[]>(['descrizione']);
	const [outputFileName, setOutputFileName] = useState('');
	const [file, setFile] = useState<File | null>(null);
	const [fileSrc, setFileSrc] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [detectedType, setDetectedType] = useState<ExtractorType | null>(null);

	const typeConfig = detectedType ? TYPE_CONFIG[detectedType] : null;
	const config = {
		title: typeConfig?.title ?? GENERIC_CONFIG.title,
		description: typeConfig?.description ?? GENERIC_CONFIG.description,
		submitLabel: typeConfig?.submitLabel ?? GENERIC_CONFIG.submitLabel,
		icon: typeConfig?.icon ?? GENERIC_CONFIG.icon,
		placeholder: typeConfig?.placeholder ?? GENERIC_CONFIG.placeholder,
		changeLabel: typeConfig?.changeLabel ?? GENERIC_CONFIG.changeLabel,
		emptyTitle: GENERIC_CONFIG.emptyTitle,
		emptyDescription: GENERIC_CONFIG.emptyDescription,
		emptyIcon: GENERIC_CONFIG.emptyIcon,
		selectLabel: GENERIC_CONFIG.selectLabel,
	};
	const selectedModelEntry = OCR_MODELS.find((m) => m.modelId === selectedModel);
	const selectedProvider = selectedModelEntry
		? getProvider(selectedModelEntry.providerId)
		: undefined;
	const selectedProviderBg = selectedModelEntry
		? (PROVIDER_COLORS[selectedModelEntry.providerId] ?? 'bg-zinc-500')
		: 'bg-zinc-500';
	const selectedProviderName = selectedProvider?.name ?? selectedModelEntry?.providerId ?? '';

	const toggleExtra = (value: ExtraValue): void => {
		setSelectedExtras((prev) =>
			prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
		);
	};

	const handleFileAccept = (next: File): void => {
		const url = URL.createObjectURL(next);
		if (fileSrc) URL.revokeObjectURL(fileSrc);
		setFile(next);
		setFileSrc(url);
		setFileName(next.name);
		setDetectedType(detectType(next));
		setOutputFileName(next.name.replace(/\.[^.]+$/, ''));
	};

	const handleClose = (nextOpen: boolean): void => {
		if (!nextOpen && fileSrc) {
			URL.revokeObjectURL(fileSrc);
			setFile(null);
			setFileSrc(null);
			setFileName(null);
			setDetectedType(null);
		}
		onOpenChange(nextOpen);
	};

	const handleRun = (): void => {
		if (!file || !fileSrc || !fileName || !detectedType || !selectedModel) return;
		void onRun?.({
			type: detectedType,
			file,
			fileName,
			fileSrc,
			modelId: selectedModel,
			extras: selectedExtras,
			outputFileName: outputFileName || fileName.replace(/\.[^.]+$/, ''),
		});
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col py-0 p-0">
				<ResizablePanelGroup orientation="horizontal" className="h-full w-full">
					<ResizablePanel defaultSize={70} minSize="40%" className="relative rounded-l-xl">
						<FileUpload
							accept={ACCEPT_ALL}
							onFileAccept={handleFileAccept}
							className="h-full w-full"
						>
							{!fileSrc && (
								<FileUploadDropzone className="flex h-full w-full items-center justify-center rounded-none border-0 bg-muted/30 p-8 hover:bg-muted/40">
									<Empty className="border-0 p-0">
										<EmptyHeader>
											<EmptyMedia variant="icon" className="h-16 w-auto rounded-full px-4">
												{config.emptyIcon}
											</EmptyMedia>
											<EmptyTitle>{config.emptyTitle}</EmptyTitle>
											<EmptyDescription>{config.emptyDescription}</EmptyDescription>
										</EmptyHeader>
										<EmptyContent>
											<FileUploadTrigger
												render={<Button variant="outline">{config.selectLabel}</Button>}
											/>
										</EmptyContent>
									</Empty>
								</FileUploadDropzone>
							)}
							{fileSrc && (
								<div className="relative h-full w-full">
									{detectedType === 'image' && (
										<div className="flex h-full w-full items-center justify-center bg-muted/30 p-8">
											<Image
												src={fileSrc}
												alt={fileName ?? 'Preview'}
												className="max-h-full max-w-full object-contain"
												cardClassName="max-h-full max-w-full overflow-hidden"
											/>
										</div>
									)}
									{detectedType === 'pdf' && <Pdf src={fileSrc} className="h-full w-full" />}
								</div>
							)}
						</FileUpload>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize={30} minSize="30%">
						<Card className="flex h-full flex-col gap-0 rounded-none border-0 ring-0">
							<CardHeader className="gap-1 border-b">
								<CardTitle className="text-sm font-semibold">{config.title}</CardTitle>
								<CardDescription className="text-xs">{config.description}</CardDescription>
							</CardHeader>
							<CardContent className="flex min-h-0 flex-1 flex-col p-0">
								<Item>
									<ItemMedia variant="icon" className="h-10 w-10 rounded-lg bg-muted">
										{config.icon}
									</ItemMedia>
									<ItemContent>
										<ItemTitle className="truncate text-sm font-semibold">
											{fileName ?? config.placeholder}
										</ItemTitle>
										<ItemDescription className="text-[11px]">
											{fileName ? config.changeLabel : config.emptyDescription}
										</ItemDescription>
									</ItemContent>
								</Item>
								<ScrollArea className="flex-1">
									<div className="divide-y divide-border">
										<div className="flex items-center justify-between gap-4 p-4">
											<div>
												<p className="text-xs font-medium">Modello</p>
												<p className="text-[11px] text-muted-foreground">
													{selectedModelEntry ? selectedProviderName : 'AI'}
												</p>
											</div>
											<DropdownMenu>
												<DropdownMenuTrigger
													render={<Button variant="outline" />}
													className="h-8 min-w-40 shrink-0 gap-2 text-xs font-normal"
												>
													{selectedModelEntry && (
														<span
															className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold leading-none text-white ${selectedProviderBg}`}
														>
															{selectedProviderName.charAt(0)}
														</span>
													)}
													<span className="truncate">
														{selectedModelEntry?.name ?? 'Seleziona modello'}
													</span>
													<ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
												</DropdownMenuTrigger>
												<DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
													<DropdownMenuRadioGroup
														value={selectedModel}
														onValueChange={setSelectedModel}
													>
														{Array.from(new Set(OCR_MODELS.map((m) => m.providerId))).map(
															(providerId, idx) => {
																const bg = PROVIDER_COLORS[providerId] ?? 'bg-zinc-500';
																const providerName = getProvider(providerId)?.name ?? providerId;
																return (
																	<div key={providerId}>
																		{idx > 0 && <DropdownMenuSeparator />}
																		{OCR_MODELS.filter((m) => m.providerId === providerId).map(
																			(model) => (
																				<DropdownMenuRadioItem
																					key={model.modelId}
																					value={model.modelId}
																					className="gap-2"
																				>
																					<span
																						className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold leading-none text-white ${bg}`}
																					>
																						{providerName.charAt(0)}
																					</span>
																					{model.name}
																				</DropdownMenuRadioItem>
																			)
																		)}
																	</div>
																);
															}
														)}
													</DropdownMenuRadioGroup>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>

										<div className="space-y-2 p-4">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-1">
													<span className="text-xs font-medium text-muted-foreground">
														Formato della risposta
													</span>
													<Info className="h-3 w-3 text-muted-foreground/50" />
												</div>
												<Button variant="ghost" size="xs" onClick={() => {}}>
													Aggiungi
												</Button>
											</div>
											<p className="text-xs text-muted-foreground">All 0s: 1 2 3</p>
										</div>

										<div className="space-y-2 p-4">
											<div className="flex items-center justify-between">
												<span className="text-xs font-medium text-muted-foreground">Extra</span>
												<Button variant="ghost" size="xs" onClick={() => {}}>
													Aggiungi
												</Button>
											</div>
											<div className="flex flex-wrap gap-1.5">
												{EXTRA_OPTIONS.map((option) => (
													<Button
														key={option.value}
														variant={
															selectedExtras.includes(option.value) ? 'outline-selected' : 'outline'
														}
														size="xs"
														onClick={() => toggleExtra(option.value)}
													>
														{option.label}
													</Button>
												))}
											</div>
										</div>

										<div className="space-y-2 p-4">
											<span className="text-xs font-medium text-muted-foreground">
												Punteggio di confidenza
											</span>
											<Badge variant="outline">Nessuno</Badge>
										</div>

										<div className="p-4">
											<p className="text-xs text-muted-foreground">
												Funzionalità aggiuntive disponibili tramite{' '}
												<span className="font-medium text-primary">OWR Document AI</span>
											</p>
										</div>
									</div>
								</ScrollArea>
							</CardContent>
							<CardFooter className="flex-col items-stretch gap-3 rounded-none bg-transparent p-4">
								<div className="flex gap-2">
									<Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
										Annulla
									</Button>
									<Button
										className="flex-1 gap-1.5"
										disabled={!fileSrc || !selectedModel}
										onClick={handleRun}
									>
										<Play className="h-3.5 w-3.5" />
										{config.submitLabel}
									</Button>
								</div>
							</CardFooter>
						</Card>
					</ResizablePanel>
				</ResizablePanelGroup>
			</DialogContent>
		</Dialog>
	);
}
