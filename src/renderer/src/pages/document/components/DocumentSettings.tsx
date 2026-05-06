import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';
import { useEditorPrefs } from '../../../hooks/use-editor-prefs';
import type { EditorMaxWidthType, EditorFontType } from '../../../../../shared/types';

const WIDTH_PRESETS: ReadonlyArray<{ value: EditorMaxWidthType; label: string }> = [
	{ value: 'small', label: 'Small' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'large', label: 'Large' },
	{ value: 'full', label: 'Full' },
];
const TEXT_SIZE_PRESETS = [100, 110, 120, 130] as const;
const FONT_PRESETS: ReadonlyArray<{ value: EditorFontType; label: string; className: string }> = [
	{ value: 'default', label: 'Default', className: 'font-default' },
	{ value: 'sans', label: 'Sans', className: 'font-sans' },
	{ value: 'serif', label: 'Serif', className: 'font-serif' },
	{ value: 'writer', label: 'Writer', className: 'font-writer' },
];

interface DocumentSettingsProps {
	readonly documentId: string | null;
}

export default function DocumentSettings({
	documentId,
}: DocumentSettingsProps): React.ReactElement {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const { maxWidthType, setMaxWidthType, textSize, setTextSize, fontType, setFontType } =
		useEditorPrefs();

	const handleWidthChange = useCallback(
		(v: unknown) => {
			if (typeof v === 'string') setMaxWidthType(v as EditorMaxWidthType);
		},
		[setMaxWidthType]
	);

	const handleTextSizeChange = useCallback(
		(v: unknown) => {
			const next =
				typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : Number.NaN;
			if (Number.isFinite(next)) setTextSize(next);
		},
		[setTextSize]
	);

	const handleFontChange = useCallback(
		(v: EditorFontType) => {
			setFontType(v);
		},
		[setFontType]
	);

	const handleOpenFolder = useCallback(() => {
		if (!documentId) return;
		window.workspace.openDocumentFolder(documentId);
	}, [documentId]);

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						title={t('configSidebar.documentInfo', 'Document info')}
						aria-label={t('configSidebar.documentInfo', 'Document info')}
					>
						<SlidersHorizontal aria-hidden="true" />
					</Button>
				}
			/>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuGroup>
					<DropdownMenuLabel className="flex items-center justify-between gap-2 truncate text-sm font-medium text-foreground">
						<span className="truncate">Document settings</span>
						<Button
							variant="ghost"
							size="icon"
							className="size-6 shrink-0"
							onClick={handleOpenFolder}
							disabled={!documentId}
							title={t('configSidebar.openFolder', 'Open folder')}
							aria-label={t('configSidebar.openFolder', 'Open folder')}
						>
							<FolderOpen aria-hidden="true" />
						</Button>
					</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<div className="px-2 py-2">
						<div className="mb-2 flex items-center justify-between">
							<span className="text-xs font-medium">Width</span>
							<span className="text-xs capitalize text-muted-foreground">{maxWidthType}</span>
						</div>
						<Tabs value={maxWidthType} onValueChange={handleWidthChange}>
							<TabsList className="grid h-8 w-full grid-cols-4 p-0.5">
								{WIDTH_PRESETS.map((preset) => (
									<TabsTrigger
										key={preset.value}
										value={preset.value}
										className="h-7 px-0 text-xs"
									>
										{preset.label}
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
					</div>
					<div className="px-2 py-2">
						<div className="mb-2 flex items-center justify-between">
							<span className="text-xs font-medium">Text size</span>
							<span className="text-xs tabular-nums text-muted-foreground">{textSize}%</span>
						</div>
						<Tabs value={String(textSize)} onValueChange={handleTextSizeChange}>
							<TabsList className="grid h-8 w-full grid-cols-4 p-0.5">
								{TEXT_SIZE_PRESETS.map((preset) => (
									<TabsTrigger
										key={preset}
										value={String(preset)}
										className="h-7 px-0 text-xs"
									>
										{preset}%
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
					</div>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Font</DropdownMenuLabel>
					<DropdownMenuRadioGroup value={fontType} onValueChange={handleFontChange}>
						{FONT_PRESETS.map((preset) => (
							<DropdownMenuRadioItem key={preset.value} value={preset.value}>
								<span className={preset.className}>{preset.label}</span>
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
