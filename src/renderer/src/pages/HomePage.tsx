import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaPermissionDemo } from '../components/MediaPermissionDemo';
import { MediaRecorder } from '../components/MediaRecorder';

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'welcome' | 'permissions' | 'recorder'>('welcome');

  useEffect(() => {
    const cleanup = window.api.onLanguageChange((lng: string) => {
      i18n.changeLanguage(lng);
    });
    return cleanup;
  }, [i18n]);

  useEffect(() => {
    const cleanup = window.api.onThemeChange((theme: string) => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    });
    return cleanup;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('welcome')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'welcome'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🏠 Welcome
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'permissions'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🔐 Permissions
            </button>
            <button
              onClick={() => setActiveTab('recorder')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'recorder'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🎥 Recorder
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'welcome' && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6">
                {t('welcome')}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                {t('description')}
              </p>
              <div className="space-y-4">
                <div className="inline-block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    {t('subtitle')}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('focusMessage')}
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => window.api.playSound()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors"
                  >
                    {t('clickMe')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && <MediaPermissionDemo />}

        {activeTab === 'recorder' && <MediaRecorder />}
      </div>
    </div>
  );
};

export default HomePage;
