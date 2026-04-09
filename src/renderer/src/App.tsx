import React, { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AppProvider } from './contexts';
import { AppLayout } from './components/AppLayout';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AppLoadingSkeleton } from './components/AppLoadingSkeleton';
import type { AppStartupInfo } from '../../shared/types';
import WelcomePage from './pages/welcome/WelcomePage';
import ConfigPage from './pages/welcome/ConfigPage';
import { Layout as SettingsLayout } from './pages/settings';
import { initializeTaskStore } from './services/task-store';
import { loadDocuments, refreshDocument, documentRemoved } from './store/documents/actions';
import { loadResources, resourceRemoved } from './store/workspace';
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
const DocumentsPage = lazy(() => import('./pages/resources/Documents/DocumentsPage'));
const ImagesPage = lazy(() => import('./pages/resources/Images/ImagesPage'));
const FilesPage = lazy(() => import('./pages/resources/Files/FilesPage'));
const SearchPage = lazy(() => import('./pages/search/Page'));

// Lazy-loaded settings pages
const GeneralPage = lazy(() => import('./pages/settings/pages/GeneralPage'));
const ProvidersPage = lazy(() => import('./pages/settings/pages/ProvidersPage'));
const WorkspacePage = lazy(() => import('./pages/settings/pages/WorkspacePage'));
const SystemPage = lazy(() => import('./pages/settings/pages/SystemPage'));
const ThemesPage = lazy(() => import('./pages/settings/pages/ThemesPage'));

const FALLBACK_STARTUP_INFO: AppStartupInfo = {
	startupCount: 0,
	isFirstRun: false,
	isInitialized: true,
};

function RouteWrapper({ children }: { children: React.ReactNode }) {
	return (
		<AppErrorBoundary level="route">
			<Suspense fallback={<AppLoadingSkeleton />}>{children}</Suspense>
		</AppErrorBoundary>
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
		if (startupInfo) {
			const splashTimer = setTimeout(() => {
				setShowSplash(false);
			}, 3000);

			return () => clearTimeout(splashTimer);
		}
	}, [startupInfo]);

	if (!startupInfo) {
		return (
			<AppErrorBoundary level="root">
				<Provider store={store}>
					<AppProvider>
						<AppLoadingSkeleton />
					</AppProvider>
				</Provider>
			</AppErrorBoundary>
		);
	}

	return (
		<AppErrorBoundary level="root">
			<Provider store={store}>
				<AppProvider>
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
									<AppLayout>
										<Suspense fallback={<AppLoadingSkeleton />}>
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
															<Suspense fallback={<AppLoadingSkeleton />}>
																<GeneralPage />
															</Suspense>
														}
													/>
													<Route
														path="general"
														element={
															<Suspense fallback={<AppLoadingSkeleton />}>
																<GeneralPage />
															</Suspense>
														}
													/>
													<Route
														path="workspace"
														element={
															<Suspense fallback={<AppLoadingSkeleton />}>
																<WorkspacePage />
															</Suspense>
														}
													/>
													<Route
														path="providers"
														element={
															<Suspense fallback={<AppLoadingSkeleton />}>
																<ProvidersPage />
															</Suspense>
														}
													/>
													<Route
														path="themes"
														element={
															<Suspense fallback={<AppLoadingSkeleton />}>
																<ThemesPage />
															</Suspense>
														}
													/>
													<Route
														path="system"
														element={
															<Suspense fallback={<AppLoadingSkeleton />}>
																<SystemPage />
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
													path="/resources/documents"
													element={
														<RouteWrapper>
															<DocumentsPage />
														</RouteWrapper>
													}
												/>
												<Route
													path="/resources/images"
													element={
														<RouteWrapper>
															<ImagesPage />
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
													path="/library"
													element={<Navigate to="/resources/documents" replace />}
												/>
												<Route
													path="/resources"
													element={<Navigate to="/resources/documents" replace />}
												/>
											</Routes>
										</Suspense>
									</AppLayout>
								}
							/>
						</Routes>
					</Router>
				</AppProvider>
			</Provider>
		</AppErrorBoundary>
	);
};

export default App;
