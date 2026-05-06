import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { debounce } from 'lodash';
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
import { useAppDispatch, useAppSelector } from '../../../store';
import { editorWidthChanged, selectEditorWidth } from '../../../store/workspace';

const EDITOR_WIDTH_PERSIST_DEBOUNCE_MS = 300;
const DEFAULT_EDITOR_WIDTH = 70;

interface DocumentSettingsProps {
	readonly documentId: string | null;
}

export default function DocumentSettings({
	documentId,
}: DocumentSettingsProps): React.ReactElement {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const dispatch = useAppDispatch();
	const editorWidth = useAppSelector(selectEditorWidth);
	const width = editorWidth ?? DEFAULT_EDITOR_WIDTH;
	const [textSize, setTextSize] = useState<number[]>([75]);

	const persistEditorWidth = useMemo(
		() =>
			debounce(
				(value: number) => {
					void window.workspace.updateEditorWidth(value).catch(() => {
						// Validation rejection is the only expected failure path here; the
						// optimistic store update is harmless if the IPC call fails.
					});
				},
				EDITOR_WIDTH_PERSIST_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[]
	);

	useEffect(() => {
		return () => {
			persistEditorWidth.flush();
			persistEditorWidth.cancel();
		};
	}, [persistEditorWidth]);

	const handleWidthChange = useCallback(
		(v: number | number[]) => {
			const next = Array.isArray(v) ? v[0] : v;
			const clamped = Math.max(1, Math.min(100, Math.round(next)));
			dispatch(editorWidthChanged(clamped));
			persistEditorWidth(clamped);
		},
		[dispatch, persistEditorWidth]
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
							<span className="text-xs tabular-nums text-muted-foreground">{width}%</span>
						</div>
						<Slider
							value={[width]}
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
