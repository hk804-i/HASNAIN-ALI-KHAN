import React from 'react';

interface VoiceSelectorProps {
  selectedVoice: 'male' | 'female';
  onSelectVoice: (voice: 'male' | 'female') => void;
  disabled: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onSelectVoice, disabled }) => {
  const activeClasses = 'bg-cyan-500 text-white';
  const inactiveClasses = 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50';

  return (
    <div className={`transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="bg-gray-900/50 p-1 rounded-full flex items-center border border-white/10 backdrop-blur-sm">
        <button
          onClick={() => onSelectVoice('male')}
          disabled={disabled}
          className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${selectedVoice === 'male' ? activeClasses : inactiveClasses}`}
          aria-pressed={selectedVoice === 'male'}
        >
          Male
        </button>
        <button
          onClick={() => onSelectVoice('female')}
          disabled={disabled}
          className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${selectedVoice === 'female' ? activeClasses : inactiveClasses}`}
          aria-pressed={selectedVoice === 'female'}
        >
          Female
        </button>
      </div>
    </div>
  );
};

export default VoiceSelector;
