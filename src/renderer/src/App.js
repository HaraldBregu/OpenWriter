import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AppProvider } from './contexts';
import { Layout } from './components/app/base/Layout';
import { ErrorBoundary } from './components/app/base/ErrorBoundary';
import { PageLoadingSkeleton } from './components/app/base/PageLoadingSkeleton';
import { LayoutLoadingSkeleton } from './components/app/base/LayoutLoadingSkeleton';
import WelcomePage from './pages/welcome/WelcomePage';
import ConfigPage from './pages/welcome/ConfigPage';
import { Layout as SettingsLayout } from './pages/settings';
import { loadDocuments, refreshDocument, documentRemoved, loadResources, resourceRemoved, } from './store/workspace';
import { TooltipProvider } from './components/ui/Tooltip';
import './index.css';
// Lazy-loaded pages
const SplashPage = lazy(() => import('./pages/splash/SplashPage'));
const HomePage = lazy(() => import('./pages/home/Page'));
const DocumentPage = lazy(() => import('./pages/document/Page'));
const AssistantPage = lazy(() => import('./pages/assistant/Page'));
const ContentPage = lazy(() => import('./pages/resources/content/Page'));
const ImagesPage = lazy(() => import('./pages/resources/images/Page'));
// Lazy-loaded settings pages
const GeneralPage = lazy(() => import('./pages/settings/pages/GeneralPage'));
const AccountPage = lazy(() => import('./pages/settings/pages/AccountPage'));
const ProvidersPage = lazy(() => import('./pages/settings/pages/ProvidersPage'));
const AgentsPage = lazy(() => import('./pages/settings/pages/AgentsPage'));
const WorkspacePage = lazy(() => import('./pages/settings/pages/WorkspacePage'));
const SystemPage = lazy(() => import('./pages/settings/pages/SystemPage'));
const ThemesPage = lazy(() => import('./pages/settings/pages/ThemesPage'));
const EditorPage = lazy(() => import('./pages/settings/pages/EditorPage'));
const DeveloperPage = lazy(() => import('./pages/settings/pages/DeveloperPage'));
const FALLBACK_STARTUP_INFO = {
    startupCount: 0,
    isFirstRun: false,
    isInitialized: true,
};
function RouteWrapper({ children }) {
    return (_jsx(ErrorBoundary, { level: "route", children: _jsx(Suspense, { fallback: _jsx(PageLoadingSkeleton, {}), children: children }) }));
}
function WorkspaceEventBridge() {
    useEffect(() => {
        if (typeof window.workspace?.onOutputFileChange !== 'function') {
            return;
        }
        // Keep subscriptions lifecycle-bound so dev reloads do not accumulate
        // duplicate IPC listeners and repeated refresh dispatches.
        store.dispatch(loadDocuments());
        const unsubscribe = window.workspace.onOutputFileChange((event) => {
            if (event.outputType !== 'documents')
                return;
            if (event.type === 'changed') {
                store.dispatch(refreshDocument(event.fileId));
            }
            else if (event.type === 'removed') {
                store.dispatch(documentRemoved(event.fileId));
            }
            else {
                store.dispatch(loadDocuments());
            }
        });
        return unsubscribe;
    }, []);
    useEffect(() => {
        if (typeof window.workspace?.onDocumentFileChange !== 'function') {
            return;
        }
        store.dispatch(loadResources());
        const unsubscribe = window.workspace.onDocumentFileChange((event) => {
            if (event.type === 'removed') {
                store.dispatch(resourceRemoved(event.fileId));
            }
            else {
                store.dispatch(loadResources());
            }
        });
        return unsubscribe;
    }, []);
    return null;
}
const App = () => {
    const [startupInfo, setStartupInfo] = useState(null);
    const [showSplash, setShowSplash] = useState(true);
    useEffect(() => {
        let isMounted = true;
        const loadStartupInfo = async () => {
            if (typeof window.app?.getStartupInfo !== 'function') {
                if (isMounted) {
                    setStartupInfo(FALLBACK_STARTUP_INFO);
                }
                return;
            }
            try {
                const info = await window.app.getStartupInfo();
                if (isMounted) {
                    setStartupInfo(info);
                }
            }
            catch {
                if (isMounted) {
                    setStartupInfo(FALLBACK_STARTUP_INFO);
                }
            }
        };
        void loadStartupInfo();
        return () => {
            isMounted = false;
        };
    }, []);
    useEffect(() => {
        if (!startupInfo)
            return;
        const splashTimer = setTimeout(() => {
            setShowSplash(false);
        }, 3000);
        const preload = () => {
            void import('./pages/document/Page');
        };
        const win = window;
        const preloadHandle = win.requestIdleCallback
            ? win.requestIdleCallback(preload)
            : window.setTimeout(preload, 1500);
        return () => {
            clearTimeout(splashTimer);
            if (win.requestIdleCallback && win.cancelIdleCallback) {
                win.cancelIdleCallback(preloadHandle);
            }
            else {
                window.clearTimeout(preloadHandle);
            }
        };
    }, [startupInfo]);
    if (!startupInfo) {
        return (_jsx(ErrorBoundary, { level: "root", children: _jsx(Provider, { store: store, children: _jsx(AppProvider, { children: _jsxs(TooltipProvider, { children: [_jsx(WorkspaceEventBridge, {}), _jsx(LayoutLoadingSkeleton, {})] }) }) }) }));
    }
    return (_jsx(ErrorBoundary, { level: "root", children: _jsx(Provider, { store: store, children: _jsx(AppProvider, { children: _jsxs(TooltipProvider, { children: [_jsx(WorkspaceEventBridge, {}), _jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/splash", element: _jsx(RouteWrapper, { children: _jsx(SplashPage, {}) }) }), _jsxs(Route, { path: "/", children: [_jsx(Route, { index: true, element: showSplash ? (_jsx(RouteWrapper, { children: _jsx(SplashPage, {}) })) : startupInfo.isInitialized ? (_jsx(WelcomePage, {})) : (_jsx(RouteWrapper, { children: _jsx(ConfigPage, { onConfigured: setStartupInfo }) })) }), _jsx(Route, { path: "config", element: _jsx(RouteWrapper, { children: _jsx(ConfigPage, { onConfigured: setStartupInfo }) }) })] }), _jsx(Route, { path: "*", element: _jsx(Layout, { children: _jsx(Suspense, { fallback: _jsx(PageLoadingSkeleton, {}), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/home", element: _jsx(RouteWrapper, { children: _jsx(HomePage, {}) }) }), _jsx(Route, { path: "/assistant", element: _jsx(RouteWrapper, { children: _jsx(AssistantPage, {}) }) }), _jsxs(Route, { path: "/settings/*", element: _jsx(RouteWrapper, { children: _jsx(SettingsLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Suspense, { fallback: _jsx(PageLoadingSkeleton, {}), children: _jsx(GeneralPage, {}) }) }), _jsx(Route, { path: "general", element: _jsx(Suspense, { fallback: _jsx(PageLoadingSkeleton, {}), children: _jsx(GeneralPage, {}) }) }), _jsx(Route, { path: "account", element: _jsx(Suspense, { fallback: _jsx(PageLoadingSkeleton, {}), children: _jsx(AccountPage, {}) }) }), _jsx(Route, { path: "workspace", element: _jsx(Suspense, { fallback: _jsx(PageLoadingSkeleton, {}), children: _jsx(WorkspacePage, {}) }) }), _jsx(Route, { path: "providers", element: _jsx(Suspense, { fallback: _jsx(PageLoadingSkeleton, {}), children: _jsx(ProvidersPage, {}) }) }), _jsx(Route, { path: "agents", element: _jsx(Suspense, { fallback: _jsx(PageLoadingSkeleton, {}), children: _jsx(AgentsPage, {}) }) }), _jsx(Route, { path: "themes", element: _jsx(Suspense, { fallback: _jsx(PageLoadingSkeleton, {}), children: _jsx(ThemesPage, {}) }) }), _jsx(Route, { path: "editor", element: _jsx(Suspense, { fallback: _jsx(PageLoadingSkeleton, {}), children: _jsx(EditorPage, {}) }) }), _jsx(Route, { path: "system", element: _jsx(Suspense, { fallback: _jsx(PageLoadingSkeleton, {}), children: _jsx(SystemPage, {}) }) }), _jsx(Route, { path: "developer", element: _jsx(Suspense, { fallback: _jsx(PageLoadingSkeleton, {}), children: _jsx(DeveloperPage, {}) }) })] }), _jsx(Route, { path: "/content/:id", element: _jsx(RouteWrapper, { children: _jsx(DocumentPage, {}) }) }), _jsx(Route, { path: "/resources/images", element: _jsx(RouteWrapper, { children: _jsx(ImagesPage, {}) }) }), _jsx(Route, { path: "/resources/content", element: _jsx(RouteWrapper, { children: _jsx(ContentPage, {}) }) }), _jsx(Route, { path: "/library", element: _jsx(Navigate, { to: "/resources/content", replace: true }) }), _jsx(Route, { path: "/resources", element: _jsx(Navigate, { to: "/resources/documents", replace: true }) })] }) }) }) })] }) })] }) }) }) }));
};
export default App;
