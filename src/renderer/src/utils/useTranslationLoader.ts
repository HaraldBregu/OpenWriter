import { useState } from "react";
import { useTranslation } from "react-i18next";

// custom hook to deal with langauge change.
const useTranslationLoader = () => {
  const [language, setLanguage] = useState<string>(
    localStorage.getItem("appLanguage") || "en"
  );
  const { i18n } = useTranslation();

  // Function to change language
  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem("appLanguage", lang); // Save selected language to localStorage
    i18n.changeLanguage(lang);// Update i18n with the new language
    window.electron.ipcRenderer.send('set-electron-language', lang)

    // window.electron.setElectronLanguage(lang);// Notify Electron to update its menu (menu translations)
  };

  return { language, changeLanguage };
};

export default useTranslationLoader;
