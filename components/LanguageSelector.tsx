import React from 'react';

interface LanguageSelectorProps {
  selectedLanguage: 'en-US' | 'ur-PK';
  onSelectLanguage: (language: 'en-US' | 'ur-PK') => void;
  disabled: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selectedLanguage, onSelectLanguage, disabled }) => {
  const activeClasses = 'bg-cyan-500 text-white';
  const inactiveClasses = 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50';

  return (
    <div className={`transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="bg-gray-900/50 p-1 rounded-full flex items-center border border-white/10 backdrop-blur-sm">
        <button
          onClick={() => onSelectLanguage('en-US')}
          disabled={disabled}
          className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${selectedLanguage === 'en-US' ? activeClasses : inactiveClasses}`}
          aria-pressed={selectedLanguage === 'en-US'}
        >
          English
        </button>
        <button
          onClick={() => onSelectLanguage('ur-PK')}
          disabled={disabled}
          className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${selectedLanguage === 'ur-PK' ? activeClasses : inactiveClasses}`}
          aria-pressed={selectedLanguage === 'ur-PK'}
        >
          Urdu
        </button>
      </div>
    </div>
  );
};

export default LanguageSelector;