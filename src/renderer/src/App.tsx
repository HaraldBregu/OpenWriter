import React, { Suspense, useEffect } from "react";
import {
  MemoryRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FallbackLoader, LazyLoader } from "./components/LazyLoader";
import "./i18n";

const MainContainer = React.lazy(() => import('./pages/MainContainer'));
const LanguageSelector = React.lazy(() => import('./pages/LanguageSelector'));
interface ProtectedProps {
  child: JSX.Element;
}

const ProtectedComponent: React.FC<ProtectedProps> = ({ child }) => {
  const savedLanguage = localStorage.getItem("appLanguage");
  return savedLanguage ? <LazyLoader child={child} /> : <Navigate to="/select-language" replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/select-language" element={<LazyLoader child={<LanguageSelector />} />} />
      <Route
        path="/editor"
        element={<ProtectedComponent child={<MainContainer />} />}
      />
      <Route
        path="*"
        element={
          localStorage.getItem("appLanguage") ? (
            <Navigate replace to="/editor" />
          ) : (
            <Navigate replace to="/select-language" />
          )
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  const { i18n } = useTranslation();

  
 //remove comment
  useEffect(() => {
    /*
    const handleLanguageChange = (lang: string) => {
      i18n.changeLanguage(lang);
      localStorage.setItem("appLanguage", lang);
    };
*/
    //const unsubscribe = window.electron.onLanguageChanged(handleLanguageChange);

    const unsubscribe = window.electron.ipcRenderer.on('language-changed', (_: any, lang: string) => {
      i18n.changeLanguage(lang);
      localStorage.setItem("appLanguage", lang);
      console.log('setting lang', lang)
    });
    
    window.electron.ipcRenderer.removeAllListeners('language-changed');
    
    const savedLanguage = localStorage.getItem("appLanguage");
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }

    return unsubscribe;
  }, [i18n]);

  return (
    <Router>
      <Suspense fallback={<FallbackLoader />}>
        <AppRoutes />
      </Suspense>
    </Router>
  );
};

export default App;
