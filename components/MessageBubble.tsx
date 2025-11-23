

import React from 'react';
import { ChatMessage } from '../types';
import { UserIcon, AiIcon, LinkIcon } from './icons';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  const bubbleClasses = isUser
    ? 'bg-indigo-500/50 text-white rounded-br-none'
    : 'bg-gray-800/80 text-gray-200 rounded-bl-none';
  
  const wrapperClasses = isUser ? 'justify-end' : 'justify-start';
  const avatar = isUser ? 
    <UserIcon className="w-9 h-9 p-2 bg-gray-600 text-gray-300 rounded-full" /> : 
    <AiIcon className="w-9 h-9 rounded-full shadow-[0_0_15px_rgba(56,189,248,0.5)]" />;

  return (
    <div className={`flex items-end gap-3 my-4 animate-fadeIn ${wrapperClasses}`}>
      {!isUser && avatar}
      <div
        className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-3 rounded-xl shadow-lg ${bubbleClasses}`}
      >
        {message.image && (
          <img 
            src={message.image} 
            alt="User upload" 
            className="rounded-lg mb-2 max-h-60 w-auto"
          />
        )}
        {message.content && <p className="text-base break-words leading-relaxed whitespace-pre-wrap">{message.content}</p>}
        
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-600/50">
            <h4 className="text-xs font-bold text-gray-400 mb-2">Sources:</h4>
            <ul className="space-y-2">
              {message.sources.map((source, index) => (
                <li key={index} className="text-xs">
                  <a 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-start gap-2 text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                  >
                    <LinkIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span className="truncate">{source.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {isUser && avatar}
    </div>
  );
};

export default MessageBubble;