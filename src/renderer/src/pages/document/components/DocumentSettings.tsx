import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, FolderOpen, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Slider } from '@/components/ui/Slider';
import { useEditorWidth } from '../../../hooks/use-editor-width';

interface DocumentSettingsProps {
	readonly documentId: string | null;
}

export default function DocumentSettings({
	documentId,
}: DocumentSettingsProps): React.ReactElement {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const { editorWidth, setEditorWidth } = useEditorWidth();
	const [textSize, setTextSize] = useState<number[]>([75]);

	const handleWidthChange = useCallback(
		(v: number | number[]) => {
			setEditorWidth(Array.isArray(v) ? v[0] : v);
		},
		[setEditorWidth]
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
					<DropdownMenuLabel className="truncate text-sm font-medium text-foreground">
						Document settings
					</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<div className="px-2 py-2">
						<div className="mb-2 flex items-center justify-between">
							<span className="text-xs font-medium">Width</span>
							<span className="text-xs tabular-nums text-muted-foreground">{editorWidth}%</span>
						</div>
						<Slider
							value={[editorWidth]}
							onValueChange={handleWidthChange}
							min={1}
							max={100}
							step={1}
							className="w-full"
						/>
					</div>
					<div className="px-2 py-2">
						<div className="mb-2 flex items-center justify-between">
							<span className="text-xs font-medium">Text size</span>
							<span className="text-xs tabular-nums text-muted-foreground">{textSize[0]}%</span>
						</div>
						<Slider
							value={textSize}
							onValueChange={(v) => setTextSize(Array.isArray(v) ? v : [v])}
							max={100}
							step={1}
							className="w-full"
						/>
					</div>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Font</DropdownMenuLabel>
					<DropdownMenuRadioGroup defaultValue="sans">
						<DropdownMenuRadioItem value="sans">
							<span className="font-sans">Sans</span>
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="serif">
							<span className="font-serif">Serif</span>
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="mono">
							<span className="font-mono">Mono</span>
						</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Theme</DropdownMenuLabel>
					<DropdownMenuRadioGroup defaultValue="light">
						<DropdownMenuRadioItem value="light">
							<Sun className="text-muted-foreground" aria-hidden="true" />
							<span>Light</span>
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="dark">
							<Moon className="text-muted-foreground" aria-hidden="true" />
							<span>Dark</span>
						</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={handleOpenFolder} disabled={!documentId}>
						<FolderOpen className="text-muted-foreground" aria-hidden="true" />
						<span className="truncate">{t('configSidebar.openFolder', 'Open folder')}</span>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
