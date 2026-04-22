import React, { useState, useEffect, useCallback } from 'react';
import { Menu, PanelLeft, Minus, X, ArrowLeft, ArrowRight, Bot, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMatch } from 'react-router-dom';
import { TitleBarContainer } from './TitleBarContainer';
import { TitleBarCenterContainer } from './TitleBarCenterContainer';
import { TitleBarLeftContainer } from './TitleBarLeftContainer';
import { TitleBarRightContainer } from './TitleBarRightContainer';
import { TitleBarCenterContainerTitle } from './TitleBarCenterContainerTitle';
import { useSidebarVisibility } from '@/hooks/use-sidebar-visibility';
import type { ExtensionDocPanelInfo } from '@shared/types';

// Synchronous platform check — no hooks, no async, no state.
// macOS uses native traffic-light buttons; every other OS needs custom controls.
const isMac =
	typeof navigator !== 'undefined' &&
	(navigator.platform === 'MacIntel' || navigator.platform.startsWith('Mac'));

// Windows-style maximize icon
function MaximizeIcon() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 10 10" fill="none">
			<rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
		</svg>
	);
}

// Windows-style restore icon (two overlapping squares)
function RestoreIcon() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 10 10" fill="none">
			<path stroke="currentColor" strokeWidth="1" d="M3 2.5h4.5V7M0.5 0.5h6v6h-6z" />
		</svg>
	);
}

export interface TitleBarProps {
	/** Text displayed centered in the title bar */
	title?: string;
	/** Called when the sidebar toggle button is clicked */
	onToggleSidebar?: () => void;
	/** Called when the back navigation button is clicked */
	onNavigateBack?: () => void;
	/** Called when the forward navigation button is clicked */
	onNavigateForward?: () => void;
	/** When true, renders agentic + info sidebar toggle buttons on the right */
	showSidebarToggles?: boolean;
}

export const TitleBar = React.memo(function TitleBar({
	title = 'Application Name',
	onToggleSidebar,
	onNavigateBack,
	onNavigateForward,
	showSidebarToggles = false,
}: TitleBarProps) {
	const { t } = useTranslation();
	const { activeSidebar, toggleSidebar } = useSidebarVisibility();
	const contentMatch = useMatch('/content/:id');
	const documentId = contentMatch?.params.id ?? null;
	const [isMaximized, setIsMaximized] = useState(false);
	const [isFullScreen, setIsFullScreen] = useState(false);
	const [extensionPanels, setExtensionPanels] = useState<ExtensionDocPanelInfo[]>([]);

	useEffect(() => {
		if (!window.win) return;

		window.win.isMaximized().then(setIsMaximized);
		window.win.isFullScreen().then(setIsFullScreen);

		const unsubMax = window.win.onMaximizeChange(setIsMaximized);
		const unsubFs = window.win.onFullScreenChange(setIsFullScreen);
		return () => {
			unsubMax();
			unsubFs();
		};
	}, []);

	const loadExtensionPanels = useCallback(async () => {
		if (!showSidebarToggles || !documentId || typeof window.extensions?.getDocPanels !== 'function') {
			setExtensionPanels([]);
			return;
		}

		try {
			const panels = await window.extensions.getDocPanels(documentId);
			setExtensionPanels(panels);
		} catch {
			setExtensionPanels([]);
		}
	}, [documentId, showSidebarToggles]);

	useEffect(() => {
		void loadExtensionPanels();
	}, [loadExtensionPanels]);

	useEffect(() => {
		if (!showSidebarToggles || typeof window.extensions?.onRegistryChanged !== 'function') {
			return;
		}

		const unsubscribeRegistry = window.extensions.onRegistryChanged(() => {
			void loadExtensionPanels();
		});
		const unsubscribeDocPanels = window.extensions.onDocPanelsChanged((payload) => {
			if (documentId && payload.documentId && payload.documentId !== documentId) return;
			void loadExtensionPanels();
		});

		return () => {
			unsubscribeRegistry();
			unsubscribeDocPanels();
		};
	}, [documentId, loadExtensionPanels, showSidebarToggles]);

	const btnBase = `
    flex items-center justify-center h-full w-[46px]
    text-muted-foreground
    hover:bg-accent/80 hover:text-foreground
    active:bg-accent
    transition-colors duration-100
  `;

	const btnNoHover = `
    flex items-center justify-center h-full w-[46px]
    text-muted-foreground
  `;

	const btnNavNoHover = `
    flex items-center justify-center h-full w-[28px]
    text-muted-foreground
  `;

	const sidebarToggleButtonClass = (isActive: boolean): string =>
		isMac
			? `flex items-center justify-center h-full px-2 transition-colors hover:text-foreground ${
					isActive ? 'text-foreground' : 'text-muted-foreground'
				}`
			: `flex items-center justify-center h-full w-[38px] transition-colors ${
					isActive ? 'text-foreground bg-accent/60' : 'text-muted-foreground hover:text-foreground'
				}`;

	const renderExtensionButtonContent = (panel: ExtensionDocPanelInfo): React.ReactElement => {
		const fallback = panel.title.trim().charAt(0).toUpperCase() || '?';
		const iconLabel = panel.icon?.trim();

		if (iconLabel) {
			return (
				<span className="flex min-w-[1.25rem] items-center justify-center text-[11px] font-semibold leading-none">
					{iconLabel}
				</span>
			);
		}

		return (
			<span className="flex size-4 items-center justify-center rounded-full border border-current/25 text-[10px] font-semibold leading-none">
				{fallback}
			</span>
		);
	};

	return (
		<TitleBarContainer>
			{/* ── Left: burger menu (Windows) + optional sidebar toggle ── */}
			<TitleBarLeftContainer isMac={isMac} isFullScreen={isFullScreen}>
				{!isMac && (
					<button
						type="button"
						onClick={() => window.app?.popupMenu()}
						className={btnNoHover}
						title={t('titleBar.applicationMenu')}
					>
						<Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
					</button>
				)}

				{onToggleSidebar && (
					<button
						type="button"
						onClick={onToggleSidebar}
						className={
							isMac
								? 'flex items-center justify-center h-full px-3 text-muted-foreground transition-colors hover:text-foreground'
								: btnNoHover
						}
						title={t('titleBar.toggleSidebar')}
					>
						<PanelLeft
							className={isMac ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]'}
							strokeWidth={1.5}
						/>
					</button>
				)}

				{onNavigateBack && (
					<button
						type="button"
						onClick={onNavigateBack}
						className={
							isMac
								? 'flex items-center justify-center h-full px-1 text-muted-foreground transition-colors hover:text-foreground'
								: btnNavNoHover
						}
						title={t('titleBar.navigateBack')}
					>
						<ArrowLeft
							className={isMac ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]'}
							strokeWidth={1.5}
						/>
					</button>
				)}

				{onNavigateForward && (
					<button
						type="button"
						onClick={onNavigateForward}
						className={
							isMac
								? 'flex items-center justify-center h-full px-1 text-muted-foreground transition-colors hover:text-foreground'
								: btnNavNoHover
						}
						title={t('titleBar.navigateForward')}
					>
						<ArrowRight
							className={isMac ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]'}
							strokeWidth={1.5}
						/>
					</button>
				)}
			</TitleBarLeftContainer>

			{/* ── Center: app title (absolutely placed so it's always truly centered) ── */}
			<TitleBarCenterContainer>
				<TitleBarCenterContainerTitle>{title}</TitleBarCenterContainerTitle>
			</TitleBarCenterContainer>

			{/* ── Spacer (pushes right buttons to the right) ── */}
			<div className="flex-1" />

			{showSidebarToggles && (
				<div
					className="flex items-center h-full mr-3"
					style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
				>
					<button
						type="button"
						onClick={() => toggleSidebar('builtin:agentic')}
						className={sidebarToggleButtonClass(activeSidebar === 'builtin:agentic')}
						title={t('titleBar.toggleAgenticSidebar')}
						aria-label={t('titleBar.toggleAgenticSidebar')}
						aria-pressed={activeSidebar === 'builtin:agentic'}
					>
						<Bot
							className={isMac ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]'}
							strokeWidth={1.5}
						/>
					</button>
					<button
						type="button"
						onClick={() => toggleSidebar('builtin:config')}
						className={sidebarToggleButtonClass(activeSidebar === 'builtin:config')}
						title={t('titleBar.toggleSidebar')}
						aria-label={t('titleBar.toggleSidebar')}
						aria-pressed={activeSidebar === 'builtin:config'}
					>
						<Info
							className={isMac ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]'}
							strokeWidth={1.5}
						/>
					</button>
					{extensionPanels.map((panel) => (
						<button
							key={panel.id}
							type="button"
							onClick={() => toggleSidebar(panel.id as `extension:${string}`)}
							className={sidebarToggleButtonClass(activeSidebar === panel.id)}
							title={`${panel.title} · ${panel.extensionName}`}
							aria-label={`${panel.title} · ${panel.extensionName}`}
							aria-pressed={activeSidebar === panel.id}
						>
							{renderExtensionButtonContent(panel)}
						</button>
					))}
				</div>
			)}

			{/* ── Right: minimize / maximize / close (Windows only) ── */}
			{!isMac && (
				<TitleBarRightContainer>
					<button
						type="button"
						onClick={() => window.win?.minimize()}
						className={btnBase}
						title={t('titleBar.minimize')}
					>
						<Minus className="h-[17px] w-[17px]" strokeWidth={1.5} />
					</button>

					<button
						type="button"
						onClick={() => window.win?.maximize()}
						className={btnBase}
						title={isMaximized ? t('titleBar.restore') : t('titleBar.maximize')}
					>
						{isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
					</button>

					<button
						type="button"
						onClick={() => window.win?.close()}
						className={`
              flex items-center justify-center h-full w-[46px]
              text-muted-foreground
              hover:bg-[#e81123] hover:text-white
              active:bg-[#c42b1c] active:text-white
              transition-colors duration-100
            `}
						title={t('titleBar.close')}
					>
						<X className="h-[17px] w-[17px]" strokeWidth={1.5} />
					</button>
				</TitleBarRightContainer>
			)}
		</TitleBarContainer>
	);
});
TitleBar.displayName = 'TitleBar';
