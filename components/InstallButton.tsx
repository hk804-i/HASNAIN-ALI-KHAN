
import React from 'react';
import { DownloadIcon } from './icons';

interface InstallButtonProps {
  onClick: () => void;
}

const InstallButton: React.FC<InstallButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-full shadow-lg hover:shadow-emerald-400/50 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-gray-900 animate-pulse"
      aria-label="Install Super AI App"
    >
      <DownloadIcon className="w-5 h-5" />
      <span>Install App</span>
    </button>
  );
};

export default InstallButton;