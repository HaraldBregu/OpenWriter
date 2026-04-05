import React, { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AppProvider } from './contexts';
import { AppLayout } from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import type { AppStartupInfo } from '../../shared/types';
import WelcomePage from './pages/welcome/WelcomePage';
import FirstTimeConfigurationPage from './pages/welcome/FirstTimeConfigurationPage';
import { SettingsLayout } from './pages/settings/SettingsLayout';
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
const HomePage = lazy(() => import('./pages/HomePage'));
const DocumentPage = lazy(() => import('./pages/document/Page'));
const DebugTasksPage = lazy(() => import('./pages/debug/DebugTasksPage'));
const DebugReduxPage = lazy(() => import('./pages/debug/DebugReduxPage'));
const DebugLogsPage = lazy(() => import('./pages/debug/DebugLogsPage'));
const DocumentsPage = lazy(() => import('./pages/resources/Documents/DocumentsPage'));
const ImagesPage = lazy(() => import('./pages/resources/Images/ImagesPage'));
const FilesPage = lazy(() => import('./pages/resources/Files/FilesPage'));
const AgentsPage = lazy(() => import('./pages/agents/AgentsPage'));
const SearchPage = lazy(() => import('./pages/search/Page'));

// Lazy-loaded settings pages
const GeneralSettingsPage = lazy(() => import('./pages/settings/GeneralSettingsPage'));
const ProvidersSettingsPage = lazy(() => import('./pages/settings/ProvidersSettingsPage'));
const WorkspacePage = lazy(() => import('./pages/settings/WorkspacePage'));
const AgentsSettingsPage = lazy(() => import('./pages/settings/AgentsSettingsPage'));
const SystemSettingsPage = lazy(() => import('./pages/settings/SystemSettingsPage'));

const FALLBACK_STARTUP_INFO: AppStartupInfo = {
	startupCount: 0,
	isFirstRun: false,
	isInitialized: true,
};

function RouteWrapper({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary level="route">
			<Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>
		</ErrorBoundary>
	);
}

const App: React.FC = () => {
	const [startupInfo, setStartupInfo] = useState<AppStartupInfo | null>(null);

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

	if (!startupInfo) {
		return (
			<ErrorBoundary level="root">
				<Provider store={store}>
					<AppProvider>
						<LoadingSkeleton />
					</AppProvider>
				</Provider>
			</ErrorBoundary>
		);
	}

	return (
		<ErrorBoundary level="root">
			<Provider store={store}>
				<AppProvider>
					<Router>
						<Routes>
							<Route path="/">
								<Route
									index
									element={<WelcomePage startupInfo={startupInfo} onConfigured={setStartupInfo} />}
								/>
								<Route
									path="config"
									element={
										<RouteWrapper>
											<FirstTimeConfigurationPage onConfigured={setStartupInfo} />
										</RouteWrapper>
									}
								/>
							</Route>

							<Route
								path="*"
								element={
									<AppLayout>
										<Suspense fallback={<LoadingSkeleton />}>
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
															<Suspense fallback={<LoadingSkeleton />}>
																<GeneralSettingsPage />
															</Suspense>
														}
													/>
													<Route
														path="general"
														element={
															<Suspense fallback={<LoadingSkeleton />}>
																<GeneralSettingsPage />
															</Suspense>
														}
													/>
													<Route
														path="workspace"
														element={
															<Suspense fallback={<LoadingSkeleton />}>
																<WorkspacePage />
															</Suspense>
														}
													/>
													<Route
														path="providers"
														element={
															<Suspense fallback={<LoadingSkeleton />}>
																<ProvidersSettingsPage />
															</Suspense>
														}
													/>
													<Route
														path="agents"
														element={
															<Suspense fallback={<LoadingSkeleton />}>
																<AgentsSettingsPage />
															</Suspense>
														}
													/>
													<Route
														path="system"
														element={
															<Suspense fallback={<LoadingSkeleton />}>
																<SystemSettingsPage />
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
												<Route
													path="/agents"
													element={
														<RouteWrapper>
															<AgentsPage />
														</RouteWrapper>
													}
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
		</ErrorBoundary>
	);
};

export default App;
