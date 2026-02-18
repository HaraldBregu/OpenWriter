import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaPermissionDemo } from '../components/MediaPermissionDemo';
import { MediaRecorder } from '../components/MediaRecorder';
import { useContextMenu } from '@/hooks/useContextMenu';

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'welcome' | 'permissions' | 'recorder' | 'contextMenu'>('welcome');
  const { showContextMenu, showContextMenuEditable } = useContextMenu();

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
    <div
      onContextMenu={(e) => {
        e.preventDefault()
        showContextMenu()
      }}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('welcome')}
              className={`py-4 px-2 border-b-2 font-normal transition-colors ${activeTab === 'welcome'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              🏠 Welcome
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`py-4 px-2 border-b-2 font-normal transition-colors ${activeTab === 'permissions'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              🔐 Permissions
            </button>
            <button
              onClick={() => setActiveTab('recorder')}
              className={`py-4 px-2 border-b-2 font-normal transition-colors ${activeTab === 'recorder'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              🎥 Recorder
            </button>
            <button
              onClick={() => setActiveTab('contextMenu')}
              className={`py-4 px-2 border-b-2 font-normal transition-colors ${activeTab === 'contextMenu'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              🖱️ Context Menu
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'welcome' && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h1 className="text-6xl font-light text-gray-900 dark:text-white mb-6">
                {t('welcome')}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                {t('description')}
              </p>
              <div className="space-y-4">
                <div className="inline-block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-normal text-gray-800 dark:text-gray-200 mb-2">
                    {t('subtitle')}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('focusMessage')}
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => window.api.playSound()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-normal rounded-lg shadow-md transition-colors"
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

        {activeTab === 'contextMenu' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-normal text-gray-800 dark:text-gray-200 mb-4">
                Context Menu Demo
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Right-click anywhere on this card to see the standard context menu.
                Right-click on the textarea below to see the editable context menu.
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-normal text-muted-foreground">Standard Context Menu</h3>
                  <div
                    className="h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-700/50"
                    onContextMenu={(e) => {
                      e.preventDefault()
                      showContextMenu()
                    }}
                  >
                    <span className="text-gray-500 dark:text-gray-400">Right-click here</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-normal text-muted-foreground">Editable Context Menu</h3>
                  <textarea
                    className="w-full h-32 p-3 border rounded-lg bg-background dark:bg-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Right-click here to see cut/copy/paste options..."
                    onContextMenu={(e) => {
                      e.preventDefault()
                      showContextMenuEditable()
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-normal text-gray-800 dark:text-gray-200 mb-3">
                Usage
              </h3>
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto">
                {`import { useContextMenu } from '@/hooks/useContextMenu'

function MyComponent() {
  const { showContextMenu, showContextMenuEditable } = useContextMenu()

  return (
    <div onContextMenu={(e) => {
      e.preventDefault()
      showContextMenu()
    }}>
      <textarea onContextMenu={(e) => {
        e.preventDefault()
        showContextMenuEditable()
      }} />
    </div>
  )
}`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
