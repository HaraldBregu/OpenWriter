import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6">
          Welcome to Tesseract
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          A modern, advanced text editor
        </p>
        <div className="space-y-4">
          <div className="inline-block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Clean & Simple
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Focus on what matters with a streamlined interface
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;