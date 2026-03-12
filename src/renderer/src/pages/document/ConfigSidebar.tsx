import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, X } from 'lucide-react';
import {
	AppButton,
	AppLabel,
	AppSeparator,
	AppSwitch,
	AppSelect,
	AppSelectTrigger,
	AppSelectValue,
	AppSelectContent,
	AppSelectItem,
} from '@/components/app';

interface ConfigSidebarProps {
	readonly open: boolean;
	readonly onClose: () => void;
}

const ConfigSidebar: React.FC<ConfigSidebarProps> = ({ open, onClose }) => {
	const { t } = useTranslation();
	const [fontFamily, setFontFamily] = useState('sans');
	const [spellCheck, setSpellCheck] = useState(true);
	const [autoSave, setAutoSave] = useState(true);
	const [focusMode, setFocusMode] = useState(false);
	const [showLineNumbers, setShowLineNumbers] = useState(false);
	const [editorWidth, setEditorWidth] = useState('normal');

	return (
		<div
			className={`shrink-0 border-l border-border bg-muted/30 overflow-y-auto transition-all duration-300 ease-in-out ${open ? 'w-72' : 'w-0'}`}
		>
			<div className="w-72 p-4">
				{/* Header */}
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<Settings className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-semibold text-foreground">{t('configSidebar.title')}</span>
					</div>
					<AppButton variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
						<X className="h-3.5 w-3.5" />
					</AppButton>
				</div>

				<AppSeparator className="mb-4" />

				{/* Typography */}
				<div className="mb-1">
					<span className="text-xs font-medium text-muted-foreground/70">Typography</span>
				</div>
				<div className="space-y-4 mb-5">
					<div className="space-y-2">
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
				</div>

				<AppSeparator className="mb-4" />

				{/* Layout */}
				<div className="mb-1">
					<span className="text-xs font-medium text-muted-foreground/70">Layout</span>
				</div>
				<div className="space-y-4 mb-5">
					<div className="space-y-2">
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
				</div>

				<AppSeparator className="mb-4" />

				{/* Preferences */}
				<div className="mb-1">
					<span className="text-xs font-medium text-muted-foreground/70">Preferences</span>
				</div>
				<div className="space-y-3">
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

export default ConfigSidebar;
