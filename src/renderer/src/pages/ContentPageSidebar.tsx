import React, { useState } from 'react';
import {
	AppLabel,
	AppSlider,
	AppSwitch,
	AppSelect,
	AppSelectTrigger,
	AppSelectValue,
	AppSelectContent,
	AppSelectItem,
	AppSidebar,
	AppSidebarContent,
	AppSidebarGroup,
	AppSidebarGroupLabel,
	AppSidebarGroupContent,
	AppSidebarHeader,
	AppSidebarSeparator,
} from '@/components/app';
import { Settings } from 'lucide-react';

const ContentPageSidebar: React.FC = () => {
	const [fontSize, setFontSize] = useState([16]);
	const [lineHeight, setLineHeight] = useState([1.6]);
	const [fontFamily, setFontFamily] = useState('sans');
	const [spellCheck, setSpellCheck] = useState(true);
	const [autoSave, setAutoSave] = useState(true);
	const [focusMode, setFocusMode] = useState(false);
	const [showLineNumbers, setShowLineNumbers] = useState(false);
	const [editorWidth, setEditorWidth] = useState('normal');

	return (
		<AppSidebar side="right" className="top-12 h-[calc(100svh-3rem)]">
			<AppSidebarHeader className="border-b px-4 py-3">
				<div className="flex items-center gap-2">
					<Settings className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-semibold">Configuration</span>
				</div>
			</AppSidebarHeader>

			<AppSidebarContent>
				{/* Typography */}
				<AppSidebarGroup>
					<AppSidebarGroupLabel>Typography</AppSidebarGroupLabel>
					<AppSidebarGroupContent className="space-y-4 px-2">
						{/* Font Family */}
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

						{/* Font Size */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<AppLabel className="text-xs text-muted-foreground">Font Size</AppLabel>
								<span className="text-xs text-muted-foreground">{fontSize[0]}px</span>
							</div>
							<AppSlider
								value={fontSize}
								onValueChange={setFontSize}
								min={12}
								max={24}
								step={1}
							/>
						</div>

						{/* Line Height */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<AppLabel className="text-xs text-muted-foreground">Line Height</AppLabel>
								<span className="text-xs text-muted-foreground">
									{lineHeight[0].toFixed(1)}
								</span>
							</div>
							<AppSlider
								value={lineHeight}
								onValueChange={setLineHeight}
								min={1.0}
								max={2.5}
								step={0.1}
							/>
						</div>
					</AppSidebarGroupContent>
				</AppSidebarGroup>

				<AppSidebarSeparator />

				{/* Layout */}
				<AppSidebarGroup>
					<AppSidebarGroupLabel>Layout</AppSidebarGroupLabel>
					<AppSidebarGroupContent className="space-y-4 px-2">
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
					</AppSidebarGroupContent>
				</AppSidebarGroup>

				<AppSidebarSeparator />

				{/* Preferences */}
				<AppSidebarGroup>
					<AppSidebarGroupLabel>Preferences</AppSidebarGroupLabel>
					<AppSidebarGroupContent className="space-y-3 px-2">
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
					</AppSidebarGroupContent>
				</AppSidebarGroup>
			</AppSidebarContent>
		</AppSidebar>
	);
};

export default ContentPageSidebar;
