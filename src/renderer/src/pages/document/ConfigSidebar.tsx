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
					<span className="text-xs font-medium text-muted-foreground/70">{t('configSidebar.typography')}</span>
				</div>
				<div className="space-y-4 mb-5">
					<div className="space-y-2">
						<AppLabel className="text-xs text-muted-foreground">{t('configSidebar.fontFamily')}</AppLabel>
						<AppSelect value={fontFamily} onValueChange={setFontFamily}>
							<AppSelectTrigger className="h-8 text-sm">
								<AppSelectValue />
							</AppSelectTrigger>
							<AppSelectContent>
								<AppSelectItem value="sans">{t('configSidebar.sansSerif')}</AppSelectItem>
								<AppSelectItem value="serif">{t('configSidebar.serif')}</AppSelectItem>
								<AppSelectItem value="mono">{t('configSidebar.monospace')}</AppSelectItem>
							</AppSelectContent>
						</AppSelect>
					</div>
				</div>

				<AppSeparator className="mb-4" />

				{/* Layout */}
				<div className="mb-1">
					<span className="text-xs font-medium text-muted-foreground/70">{t('settings.sections.layout')}</span>
				</div>
				<div className="space-y-4 mb-5">
					<div className="space-y-2">
						<AppLabel className="text-xs text-muted-foreground">{t('configSidebar.editorWidth')}</AppLabel>
						<AppSelect value={editorWidth} onValueChange={setEditorWidth}>
							<AppSelectTrigger className="h-8 text-sm">
								<AppSelectValue />
							</AppSelectTrigger>
							<AppSelectContent>
								<AppSelectItem value="narrow">{t('configSidebar.narrow')}</AppSelectItem>
								<AppSelectItem value="normal">{t('configSidebar.normal')}</AppSelectItem>
								<AppSelectItem value="wide">{t('configSidebar.wide')}</AppSelectItem>
								<AppSelectItem value="full">{t('configSidebar.fullWidth')}</AppSelectItem>
							</AppSelectContent>
						</AppSelect>
					</div>
				</div>

				<AppSeparator className="mb-4" />

				{/* Preferences */}
				<div className="mb-1">
					<span className="text-xs font-medium text-muted-foreground/70">{t('configSidebar.preferences')}</span>
				</div>
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<AppLabel className="text-sm">{t('configSidebar.spellCheck')}</AppLabel>
						<AppSwitch checked={spellCheck} onCheckedChange={setSpellCheck} />
					</div>
					<div className="flex items-center justify-between">
						<AppLabel className="text-sm">{t('configSidebar.autoSave')}</AppLabel>
						<AppSwitch checked={autoSave} onCheckedChange={setAutoSave} />
					</div>
					<div className="flex items-center justify-between">
						<AppLabel className="text-sm">{t('configSidebar.focusMode')}</AppLabel>
						<AppSwitch checked={focusMode} onCheckedChange={setFocusMode} />
					</div>
					<div className="flex items-center justify-between">
						<AppLabel className="text-sm">{t('configSidebar.lineNumbers')}</AppLabel>
						<AppSwitch checked={showLineNumbers} onCheckedChange={setShowLineNumbers} />
					</div>
				</div>
			</div>
		</div>
	);
};

export default ConfigSidebar;
