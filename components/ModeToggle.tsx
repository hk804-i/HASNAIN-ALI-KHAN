import React from 'react';
import { ChatBubbleLeftRightIcon, PhoneIcon } from './icons';

interface ModeToggleProps {
  mode: 'text' | 'audio';
  onToggle: (mode: 'text' | 'audio') => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onToggle }) => {
  const activeClasses = 'bg-cyan-500 text-white';
  const inactiveClasses = 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50';

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-900/50 p-1 rounded-full flex items-center border border-white/10 backdrop-blur-sm">
        <button
          onClick={() => onToggle('text')}
          className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${mode === 'text' ? activeClasses : inactiveClasses}`}
          aria-pressed={mode === 'text'}
        >
          <ChatBubbleLeftRightIcon className="w-5 h-5" />
          Text
        </button>
        <button
          onClick={() => onToggle('audio')}
          className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${mode === 'audio' ? activeClasses : inactiveClasses}`}
          aria-pressed={mode === 'audio'}
        >
          <PhoneIcon className="w-5 h-5" />
          Voice
        </button>
      </div>
    </div>
  );
};

export default ModeToggle;
