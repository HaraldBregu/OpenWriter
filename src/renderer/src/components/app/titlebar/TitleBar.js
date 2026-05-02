import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Menu, PanelLeft, Minus, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TitleBarContainer } from './TitleBarContainer';
import { TitleBarCenterContainer } from './TitleBarCenterContainer';
import { TitleBarLeftContainer } from './TitleBarLeftContainer';
import { TitleBarRightContainer } from './TitleBarRightContainer';
import { TitleBarCenterContainerTitle } from './TitleBarCenterContainerTitle';
// Synchronous platform check — no hooks, no async, no state.
// macOS uses native traffic-light buttons; every other OS needs custom controls.
const isMac = typeof navigator !== 'undefined' &&
    (navigator.platform === 'MacIntel' || navigator.platform.startsWith('Mac'));
// Windows-style maximize icon
function MaximizeIcon() {
    return (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "13", height: "13", viewBox: "0 0 10 10", fill: "none", children: _jsx("rect", { x: "0.5", y: "0.5", width: "9", height: "9", stroke: "currentColor", strokeWidth: "1" }) }));
}
// Windows-style restore icon (two overlapping squares)
function RestoreIcon() {
    return (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "13", height: "13", viewBox: "0 0 10 10", fill: "none", children: _jsx("path", { stroke: "currentColor", strokeWidth: "1", d: "M3 2.5h4.5V7M0.5 0.5h6v6h-6z" }) }));
}
export const TitleBar = React.memo(function TitleBar({ title = 'Application Name', onToggleSidebar, onNavigateBack, onNavigateForward, showSidebarToggles: _showSidebarToggles = false, }) {
    const { t } = useTranslation();
    const [isMaximized, setIsMaximized] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    useEffect(() => {
        if (!window.win)
            return;
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
    const btnNavNoHover = `
    flex items-center justify-center h-full w-[28px]
    text-muted-foreground
  `;
    return (_jsxs(TitleBarContainer, { children: [_jsxs(TitleBarLeftContainer, { isMac: isMac, isFullScreen: isFullScreen, children: [!isMac && (_jsx("button", { type: "button", onClick: () => window.app?.popupMenu(), className: btnNoHover, title: t('titleBar.applicationMenu'), children: _jsx(Menu, { className: "h-[18px] w-[18px]", strokeWidth: 1.5 }) })), onToggleSidebar && (_jsx("button", { type: "button", onClick: onToggleSidebar, className: isMac
                            ? 'flex items-center justify-center h-full px-3 text-muted-foreground transition-colors hover:text-foreground'
                            : btnNoHover, title: t('titleBar.toggleSidebar'), children: _jsx(PanelLeft, { className: isMac ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]', strokeWidth: 1.5 }) })), onNavigateBack && (_jsx("button", { type: "button", onClick: onNavigateBack, className: isMac
                            ? 'flex items-center justify-center h-full px-1 text-muted-foreground transition-colors hover:text-foreground'
                            : btnNavNoHover, title: t('titleBar.navigateBack'), children: _jsx(ArrowLeft, { className: isMac ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]', strokeWidth: 1.5 }) })), onNavigateForward && (_jsx("button", { type: "button", onClick: onNavigateForward, className: isMac
                            ? 'flex items-center justify-center h-full px-1 text-muted-foreground transition-colors hover:text-foreground'
                            : btnNavNoHover, title: t('titleBar.navigateForward'), children: _jsx(ArrowRight, { className: isMac ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]', strokeWidth: 1.5 }) }))] }), _jsx(TitleBarCenterContainer, { children: _jsx(TitleBarCenterContainerTitle, { children: title }) }), _jsx("div", { className: "flex-1" }), !isMac && (_jsxs(TitleBarRightContainer, { children: [_jsx("button", { type: "button", onClick: () => window.win?.minimize(), className: btnBase, title: t('titleBar.minimize'), children: _jsx(Minus, { className: "h-[17px] w-[17px]", strokeWidth: 1.5 }) }), _jsx("button", { type: "button", onClick: () => window.win?.maximize(), className: btnBase, title: isMaximized ? t('titleBar.restore') : t('titleBar.maximize'), children: isMaximized ? _jsx(RestoreIcon, {}) : _jsx(MaximizeIcon, {}) }), _jsx("button", { type: "button", onClick: () => window.win?.close(), className: `
              flex items-center justify-center h-full w-[46px]
              text-muted-foreground
              hover:bg-[#e81123] hover:text-white
              active:bg-[#c42b1c] active:text-white
              transition-colors duration-100
            `, title: t('titleBar.close'), children: _jsx(X, { className: "h-[17px] w-[17px]", strokeWidth: 1.5 }) })] }))] }));
});
TitleBar.displayName = 'TitleBar';
