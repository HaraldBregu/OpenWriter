import React, { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AppProvider } from './contexts';
import { Layout } from './components/app/base/Layout';
import { ErrorBoundary } from './components/app/base/ErrorBoundary';
import { PageLoadingSkeleton } from './components/app/base/PageLoadingSkeleton';
import { LayoutLoadingSkeleton } from './components/app/base/LayoutLoadingSkeleton';
import type { AppStartupInfo } from '../../shared/types';
import WelcomePage from './pages/welcome/WelcomePage';
import ConfigPage from './pages/welcome/ConfigPage';
import { Layout as SettingsLayout } from './pages/settings';
import { initializeTaskStore } from './services/task-store';
import { loadDocuments, refreshDocument, documentRemoved } from './store/documents/actions';
import { loadResources, resourceRemoved } from './store/workspace';
import { TooltipProvider } from './components/ui/Tooltip';
import './index.css';

initializeTaskStore();

// IPC → Redux bridge: load documents on startup and re-load on file changes.
let documentsInitialized = false;
if (!documentsInitialized && typeof window.workspace?.onOutputFileChange === 'function') {
	documentsInitialized = true;
	store.dispatch(loadDocuments());
	window.workspace.onOutputFileChange((event) => {
		if (event.outputType !== 'documents') return;
		if (event.type === 'changed') {
			store.dispatch(refreshDocument(event.fileId));
		} else if (event.type === 'removed') {
			store.dispatch(documentRemoved(event.fileId));
		} else {
			store.dispatch(loadDocuments());
		}
	});
}

// IPC → Redux bridge: load resources on startup and re-load on file changes.
let resourcesInitialized = false;
if (!resourcesInitialized && typeof window.workspace?.onDocumentFileChange === 'function') {
	resourcesInitialized = true;
	store.dispatch(loadResources());
	window.workspace.onDocumentFileChange((event) => {
		if (event.type === 'removed') {
			store.dispatch(resourceRemoved(event.fileId));
		} else {
			store.dispatch(loadResources());
		}
	});
}

// Lazy-loaded pages
const SplashPage = lazy(() => import('./pages/splash/SplashPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const DocumentPage = lazy(() => import('./pages/document/Page'));
const DebugTasksPage = lazy(() => import('./pages/debug/DebugTasksPage'));
const DebugReduxPage = lazy(() => import('./pages/debug/DebugReduxPage'));
const DebugLogsPage = lazy(() => import('./pages/debug/DebugLogsPage'));
const ContentPage = lazy(() => import('./pages/resources/content/Page'));
const FilesPage = lazy(() => import('./pages/resources/files/Page'));
const DataPage = lazy(() => import('./pages/resources/data/Page'));
const SearchPage = lazy(() => import('./pages/search/Page'));

// Lazy-loaded settings pages
const GeneralPage = lazy(() => import('./pages/settings/pages/GeneralPage'));
const ProvidersPage = lazy(() => import('./pages/settings/pages/ProvidersPage'));
const WorkspacePage = lazy(() => import('./pages/settings/pages/WorkspacePage'));
const SystemPage = lazy(() => import('./pages/settings/pages/SystemPage'));
const ThemesPage = lazy(() => import('./pages/settings/pages/ThemesPage'));
const EditorPage = lazy(() => import('./pages/settings/pages/EditorPage'));
const DeveloperPage = lazy(() => import('./pages/settings/pages/DeveloperPage'));
const ModelsPage = lazy(() => import('./pages/settings/pages/ModelsPage'));

const FALLBACK_STARTUP_INFO: AppStartupInfo = {
	startupCount: 0,
	isFirstRun: false,
	isInitialized: true,
};

function RouteWrapper({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary level="route">
			<Suspense fallback={<PageLoadingSkeleton />}>{children}</Suspense>
		</ErrorBoundary>
	);
}

const App: React.FC = () => {
	const [startupInfo, setStartupInfo] = useState<AppStartupInfo | null>(null);
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
			} catch {
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
		if (!startupInfo) return;

		const splashTimer = setTimeout(() => {
			setShowSplash(false);
		}, 3000);

		return () => clearTimeout(splashTimer);
	}, [startupInfo]);

	if (!startupInfo) {
		return (
			<ErrorBoundary level="root">
				<Provider store={store}>
					<AppProvider>
						<TooltipProvider>
							<LayoutLoadingSkeleton />
						</TooltipProvider>
					</AppProvider>
				</Provider>
			</ErrorBoundary>
		);
	}

	return (
		<ErrorBoundary level="root">
			<Provider store={store}>
				<AppProvider>
					<TooltipProvider>
						<Router>
							<Routes>
								<Route
									path="/splash"
									element={
										<RouteWrapper>
											<SplashPage />
										</RouteWrapper>
									}
								/>
								<Route path="/">
									<Route
										index
										element={
											showSplash ? (
												<RouteWrapper>
													<SplashPage />
												</RouteWrapper>
											) : startupInfo.isInitialized ? (
												<WelcomePage />
											) : (
												<RouteWrapper>
													<ConfigPage onConfigured={setStartupInfo} />
												</RouteWrapper>
											)
										}
									/>
									<Route
										path="config"
										element={
											<RouteWrapper>
												<ConfigPage onConfigured={setStartupInfo} />
											</RouteWrapper>
										}
									/>
								</Route>

								<Route
									path="*"
									element={
										<Layout>
											<Suspense fallback={<PageLoadingSkeleton />}>
												<Routes>
													<Route
														path="/home"
														element={
															<RouteWrapper>
																<HomePage />
															</RouteWrapper>
														}
													/>
													<Route
														path="/settings/*"
														element={
															<RouteWrapper>
																<SettingsLayout />
															</RouteWrapper>
														}
													>
														<Route
															index
															element={
																<Suspense fallback={<PageLoadingSkeleton />}>
																	<GeneralPage />
																</Suspense>
															}
														/>
														<Route
															path="general"
															element={
																<Suspense fallback={<PageLoadingSkeleton />}>
																	<GeneralPage />
																</Suspense>
															}
														/>
														<Route
															path="workspace"
															element={
																<Suspense fallback={<PageLoadingSkeleton />}>
																	<WorkspacePage />
																</Suspense>
															}
														/>
														<Route
															path="providers"
															element={
																<Suspense fallback={<PageLoadingSkeleton />}>
																	<ProvidersPage />
																</Suspense>
															}
														/>
														<Route
															path="themes"
															element={
																<Suspense fallback={<PageLoadingSkeleton />}>
																	<ThemesPage />
																</Suspense>
															}
														/>
														<Route
															path="editor"
															element={
																<Suspense fallback={<PageLoadingSkeleton />}>
																	<EditorPage />
																</Suspense>
															}
														/>
														<Route
															path="system"
															element={
																<Suspense fallback={<PageLoadingSkeleton />}>
																	<SystemPage />
																</Suspense>
															}
														/>
														<Route
															path="developer"
															element={
																<Suspense fallback={<PageLoadingSkeleton />}>
																	<DeveloperPage />
																</Suspense>
															}
														/>
														<Route
															path="models"
															element={
																<Suspense fallback={<PageLoadingSkeleton />}>
																	<ModelsPage />
																</Suspense>
															}
														/>
													</Route>
													<Route
														path="/content/:id"
														element={
															<RouteWrapper>
																<DocumentPage />
															</RouteWrapper>
														}
													/>
													<Route
														path="/debug/tasks"
														element={
															<RouteWrapper>
																<DebugTasksPage />
															</RouteWrapper>
														}
													/>
													<Route
														path="/debug/redux"
														element={
															<RouteWrapper>
																<DebugReduxPage />
															</RouteWrapper>
														}
													/>
													<Route
														path="/debug/logs"
														element={
															<RouteWrapper>
																<DebugLogsPage />
															</RouteWrapper>
														}
													/>
													<Route
														path="/search"
														element={
															<RouteWrapper>
																<SearchPage />
															</RouteWrapper>
														}
													/>
													<Route
														path="/resources/files"
														element={
															<RouteWrapper>
																<FilesPage />
															</RouteWrapper>
														}
													/>
													<Route
														path="/resources/content"
														element={
															<RouteWrapper>
																<ContentPage />
															</RouteWrapper>
														}
													/>
													<Route
														path="/resources/data"
														element={
															<RouteWrapper>
																<DataPage />
															</RouteWrapper>
														}
													/>
													<Route
														path="/library"
														element={<Navigate to="/resources/content" replace />}
													/>
													<Route
														path="/resources"
														element={<Navigate to="/resources/documents" replace />}
													/>
												</Routes>
											</Suspense>
										</Layout>
									}
								/>
							</Routes>
						</Router>
					</TooltipProvider>
				</AppProvider>
			</Provider>
		</ErrorBoundary>
	);
};

export default App;
