import React, { useState, useEffect } from 'react';
import { Menu, PanelLeft, Minus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
	/** Extra Tailwind classes applied to the root element */
	className?: string;
}

export const TitleBar = React.memo(function TitleBar({
	title = 'Application Name',
	onToggleSidebar,
	onNavigateBack,
	onNavigateForward,
	className = '',
}: TitleBarProps) {
	const { t } = useTranslation();
	const [isMaximized, setIsMaximized] = useState(false);
	const [isFullScreen, setIsFullScreen] = useState(false);

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

	return (
		<div
			className={`relative z-20 flex h-12 shrink-0 items-center select-none border-b border-border bg-card/95 backdrop-blur-md ${className}`}
			style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
		>
			{/* ── Left: burger menu (Windows) + optional sidebar toggle ── */}
			{!isMac ? (
				<div
					className="flex items-center h-full z-10"
					style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
				>
					<button
						type="button"
						onClick={() => window.app?.popupMenu()}
						className={btnNoHover}
						title={t('titleBar.applicationMenu')}
					>
						<Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
					</button>

					{onToggleSidebar && (
						<button
							type="button"
							onClick={onToggleSidebar}
							className={btnNoHover}
							title={t('titleBar.toggleSidebar')}
						>
							<PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.5} />
						</button>
					)}

					{onNavigateBack && (
						<button
							type="button"
							onClick={onNavigateBack}
							className={btnNoHover}
							title={t('titleBar.navigateBack')}
						>
							<ChevronLeft className="h-[18px] w-[18px]" strokeWidth={1.5} />
						</button>
					)}

					{onNavigateForward && (
						<button
							type="button"
							onClick={onNavigateForward}
							className={btnNoHover}
							title={t('titleBar.navigateForward')}
						>
							<ChevronRight className="h-[18px] w-[18px]" strokeWidth={1.5} />
						</button>
					)}
				</div>
			) : (
				<div
					className={`flex items-center h-full z-10 ${isFullScreen ? 'ml-2' : 'ml-20 mt-1'}`}
					style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
				>
					{onToggleSidebar && (
						<button
							type="button"
							onClick={onToggleSidebar}
							className="flex items-center justify-center h-full px-3 text-muted-foreground transition-colors hover:text-foreground"
							title={t('titleBar.toggleSidebar')}
						>
							<PanelLeft className="h-[16px] w-[16px]" strokeWidth={1.5} />
						</button>
					)}

					{onNavigateBack && (
						<button
							type="button"
							onClick={onNavigateBack}
							className="flex items-center justify-center h-full px-1 text-muted-foreground transition-colors hover:text-foreground"
							title={t('titleBar.navigateBack')}
						>
							<ChevronLeft className="h-[16px] w-[16px]" strokeWidth={1.5} />
						</button>
					)}

					{onNavigateForward && (
						<button
							type="button"
							onClick={onNavigateForward}
							className="flex items-center justify-center h-full px-1 text-muted-foreground transition-colors hover:text-foreground"
							title={t('titleBar.navigateForward')}
						>
							<ChevronRight className="h-[16px] w-[16px]" strokeWidth={1.5} />
						</button>
					)}
				</div>
			)}

			{/* ── Center: app title (absolutely placed so it's always truly centered) ── */}
			<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
				<span className="text-sm font-normal tracking-wide text-muted-foreground">{title}</span>
			</div>

			{/* ── Spacer (pushes right buttons to the right) ── */}
			<div className="flex-1" />

			{/* ── Right: minimize / maximize / close (Windows only) ── */}
			{!isMac && (
				<div
					className="flex items-center h-full z-10"
					style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
				>
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
				</div>
			)}
		</div>
	);
});
TitleBar.displayName = 'TitleBar';
