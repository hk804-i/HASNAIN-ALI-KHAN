import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 p-2">
      <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-[dotFlashing_1.4s_infinite_linear_forwards]"></div>
      <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-[dotFlashing_1.4s_infinite_linear_forwards] [animation-delay:0.2s]"></div>
      <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-[dotFlashing_1.4s_infinite_linear_forwards] [animation-delay:0.4s]"></div>
    </div>
  );
};

export default TypingIndicator;