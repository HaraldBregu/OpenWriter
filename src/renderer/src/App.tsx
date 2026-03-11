import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AppProvider } from './contexts';
import { AppLayout } from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import WelcomePage from './pages/WelcomePage';
import type { TaskEvent } from '../../shared/types';
import { taskEventReceived } from './store/tasks/actions';
import { loadWritings, refreshWriting } from './store/writings/actions';
import { writingRemoved } from './store/writings/actions';
import { loadResources, resourceRemoved } from './store/workspace';
import './index.css';

// IPC → Redux bridge: forward every task event into the store.
let initialized = false;
if (!initialized && typeof window.task?.onEvent === 'function') {
	initialized = true;
	window.task.onEvent((event: TaskEvent) => {
		store.dispatch(taskEventReceived(event));
	});
}

// IPC → Redux bridge: load writings on startup and re-load on file changes.
let writingsInitialized = false;
if (!writingsInitialized && typeof window.workspace?.onOutputFileChange === 'function') {
	writingsInitialized = true;
	store.dispatch(loadWritings());
	window.workspace.onOutputFileChange((event) => {
		if (event.outputType !== 'writings') return;
		if (event.type === 'changed') {
			store.dispatch(refreshWriting(event.fileId));
		} else if (event.type === 'removed') {
			store.dispatch(writingRemoved(event.fileId));
		} else {
			store.dispatch(loadWritings());
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
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DocumentPage = lazy(() => import('./pages/document/DocumentPage'));
const DebugPage = lazy(() => import('./pages/DebugPage'));
const ResourcesPage = lazy(() => import('./pages/resources/ResourcesPage'));

function RouteWrapper({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary level="route">
			<Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>
		</ErrorBoundary>
	);
}

const App: React.FC = () => {
	return (
		<ErrorBoundary level="root">
			<Provider store={store}>
				<AppProvider>
					<Router>
						<Routes>
							{/* Welcome page - standalone, shown first */}
							<Route path="/" element={<WelcomePage />} />

							{/* All other routes use AppLayout */}
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
													path="/settings"
													element={
														<RouteWrapper>
															<SettingsPage />
														</RouteWrapper>
													}
												/>
												<Route
													path="/content/:id"
													element={
														<RouteWrapper>
															<DocumentPage />
														</RouteWrapper>
													}
												/>
												<Route
													path="/debug"
													element={
														<RouteWrapper>
															<DebugPage />
														</RouteWrapper>
													}
												/>
												<Route
													path="/resources"
													element={
														<RouteWrapper>
															<ResourcesPage />
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
