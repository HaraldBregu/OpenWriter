import React, { useState } from 'react';
import {
	AppLabel,
	AppSeparator,
	AppSlider,
	AppSwitch,
	AppSelect,
	AppSelectTrigger,
	AppSelectValue,
	AppSelectContent,
	AppSelectItem,
} from '@/components/app';
import { Settings, X } from 'lucide-react';
import { AppButton } from '@/components/app';

interface ContentPageSidebarProps {
	open: boolean;
	onClose: () => void;
}

const ContentPageSidebar: React.FC<ContentPageSidebarProps> = ({ open, onClose }) => {
	const [fontSize, setFontSize] = useState([16]);
	const [lineHeight, setLineHeight] = useState([1.6]);
	const [fontFamily, setFontFamily] = useState('sans');
	const [spellCheck, setSpellCheck] = useState(true);
	const [autoSave, setAutoSave] = useState(true);
	const [focusMode, setFocusMode] = useState(false);
	const [showLineNumbers, setShowLineNumbers] = useState(false);
	const [editorWidth, setEditorWidth] = useState('normal');

	return (
		<div
			className={`shrink-0 border-l border-border bg-muted/30 overflow-y-auto transition-all duration-300 ease-in-out ${
				open ? 'w-72' : 'w-0'
			}`}
		>
			<div className="w-72 p-5">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<Settings className="h-4 w-4 text-muted-foreground" />
						<h3 className="text-sm font-semibold text-foreground">Configuration</h3>
					</div>
					<AppButton variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
						<X className="h-3.5 w-3.5" />
					</AppButton>
				</div>

				<AppSeparator className="mb-4" />

				{/* Font Family */}
				<div className="space-y-2 mb-5">
					<AppLabel className="text-xs text-muted-foreground">Font Family</AppLabel>
					<AppSelect value={fontFamily} onValueChange={setFontFamily}>
						<AppSelectTrigger className="h-8 text-sm">
							<AppSelectValue />
						</AppSelectTrigger>
						<AppSelectContent>
							<AppSelectItem value="sans">Sans Serif</AppSelectItem>
							<AppSelectItem value="serif">Serif</AppSelectItem>
							<AppSelectItem value="mono">Monospace</AppSelectItem>
						</AppSelectContent>
					</AppSelect>
				</div>

				{/* Font Size */}
				<div className="space-y-2 mb-5">
					<div className="flex items-center justify-between">
						<AppLabel className="text-xs text-muted-foreground">Font Size</AppLabel>
						<span className="text-xs text-muted-foreground">{fontSize[0]}px</span>
					</div>
					<AppSlider value={fontSize} onValueChange={setFontSize} min={12} max={24} step={1} />
				</div>

				{/* Line Height */}
				<div className="space-y-2 mb-5">
					<div className="flex items-center justify-between">
						<AppLabel className="text-xs text-muted-foreground">Line Height</AppLabel>
						<span className="text-xs text-muted-foreground">{lineHeight[0].toFixed(1)}</span>
					</div>
					<AppSlider
						value={lineHeight}
						onValueChange={setLineHeight}
						min={1.0}
						max={2.5}
						step={0.1}
					/>
				</div>

				{/* Editor Width */}
				<div className="space-y-2 mb-5">
					<AppLabel className="text-xs text-muted-foreground">Editor Width</AppLabel>
					<AppSelect value={editorWidth} onValueChange={setEditorWidth}>
						<AppSelectTrigger className="h-8 text-sm">
							<AppSelectValue />
						</AppSelectTrigger>
						<AppSelectContent>
							<AppSelectItem value="narrow">Narrow</AppSelectItem>
							<AppSelectItem value="normal">Normal</AppSelectItem>
							<AppSelectItem value="wide">Wide</AppSelectItem>
							<AppSelectItem value="full">Full Width</AppSelectItem>
						</AppSelectContent>
					</AppSelect>
				</div>

				<AppSeparator className="mb-4" />

				{/* Toggle options */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<AppLabel className="text-sm">Spell Check</AppLabel>
						<AppSwitch checked={spellCheck} onCheckedChange={setSpellCheck} />
					</div>

					<div className="flex items-center justify-between">
						<AppLabel className="text-sm">Auto Save</AppLabel>
						<AppSwitch checked={autoSave} onCheckedChange={setAutoSave} />
					</div>

					<div className="flex items-center justify-between">
						<AppLabel className="text-sm">Focus Mode</AppLabel>
						<AppSwitch checked={focusMode} onCheckedChange={setFocusMode} />
					</div>

					<div className="flex items-center justify-between">
						<AppLabel className="text-sm">Line Numbers</AppLabel>
						<AppSwitch checked={showLineNumbers} onCheckedChange={setShowLineNumbers} />
					</div>
				</div>
			</div>
		</div>
	);
};

export default ContentPageSidebar;
