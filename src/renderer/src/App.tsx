import React, { useEffect } from "react";
import {
  RouterProvider,
  Outlet,
  createHashRouter,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./i18n";
import { ELayout } from "./pages/editor/ELayout";
import AppTabs from "./AppTabs";
import About from "./pages/About";
import FileViewer from "./pages/FileViewer";

const toolbar: Route = "/browser-tab-bar";
const root: Route = "/";
const fileViewer: Route = "/file-viewer";
const about: Route = "/about";

const ProtectedRoutes = () => {
  return <Outlet />
};

const router = createHashRouter([
  {
    element: <AppTabs />,
    path: toolbar,
  },
  {
    element: <ProtectedRoutes />,
    children: [
      {
        element: <ELayout />,
        path: root,
      },
    ]
  },
  {
    element: <ProtectedRoutes />,
    children: [
      {
        element: <FileViewer />,
        path: fileViewer,
      },
    ]
  },
  // TODO: Add a route for the about page
  {
    element: <ProtectedRoutes />,
    children: [
      {
        element: <About isOpen={true} onClose={() => {}} />,
        path: about,
      },
    ]
  },
]);

const App: React.FC = () => {
  const [showAbout, setShowAbout] = React.useState(false);
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!window.electron) return;

    const showAboutCleanup = window.electron.ipcRenderer.on('show-about', () => {
      setShowAbout(true);
    });

    return () => {
      showAboutCleanup();
    }
  }, [window.electron]);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on('language-changed', (_: unknown, lang: string) => {
      i18n.changeLanguage(lang);
      localStorage.setItem("appLanguage", lang);
    });

    const savedLanguage = localStorage.getItem("appLanguage");

    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }

    return unsubscribe;
  }, [i18n]);

  return (
    <>
      <RouterProvider router={router} />
      <About isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
};

export default App;
