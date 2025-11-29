
import React, { useState } from 'react';
import { ChatMessage } from '../types';
import { UserIcon, AiIcon, LinkIcon, CopyIcon, CheckIcon, HandThumbUpIcon, HandThumbDownIcon } from './icons';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    if (message.content) {
        navigator.clipboard.writeText(message.content)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => console.error('Failed to copy:', err));
    }
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(prev => (prev === type ? null : type));
    console.log(`Feedback for message: ${type}`);
  };

  const bubbleClasses = isUser
    ? 'bg-indigo-500/50 text-white rounded-br-none'
    : 'bg-gray-800/80 text-gray-200 rounded-bl-none';
  
  const wrapperClasses = isUser ? 'justify-end' : 'justify-start';
  const avatar = isUser ? 
    <UserIcon className="w-9 h-9 p-2 bg-gray-600 text-gray-300 rounded-full" /> : 
    <div className="w-9 h-9 min-w-[2.25rem] rounded-full bg-gray-900 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(56,189,248,0.2)]">
        <AiIcon className="w-6 h-6" />
    </div>;

  return (
    <div className={`flex items-end gap-3 my-4 animate-fadeIn ${wrapperClasses} group`}>
      {!isUser && avatar}
      <div className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-3 rounded-xl shadow-lg relative ${bubbleClasses}`}>
        {message.content && (
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/20 text-gray-300 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/40 hover:text-white focus:opacity-100"
                aria-label="Copy message"
            >
                {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
            </button>
        )}

        {/* User Uploaded Attachment */}
        {message.attachment && message.attachment.mimeType.startsWith('image/') && (
          <img src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`} alt="User upload" className="rounded-lg mb-2 max-h-60 w-auto" />
        )}

        {/* Generated Video */}
        {message.video && (
          <div className="mb-2 rounded-lg overflow-hidden border border-gray-700 bg-black">
             <video controls src={message.video} className="w-full max-h-96" playsInline />
          </div>
        )}

        {/* Generated Image */}
        {message.generatedImage && (
             <div className="mb-2 rounded-lg overflow-hidden border border-gray-700">
                <img src={message.generatedImage} alt="Generated result" className="w-full h-auto" />
             </div>
        )}

        {message.content && <p className="text-base break-words leading-relaxed whitespace-pre-wrap pr-6">{message.content}</p>}
        
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-600/50">
            <h4 className="text-xs font-bold text-gray-400 mb-2">Sources:</h4>
            <ul className="space-y-2">
              {message.sources.map((source, index) => (
                <li key={index} className="text-xs">
                  <a href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-cyan-400 hover:text-cyan-300 hover:underline transition-colors">
                    <LinkIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span className="truncate">{source.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isUser && message.content && (
            <div className="flex items-center justify-end gap-2 mt-2 pt-1">
                <button onClick={() => handleFeedback('up')} className={`transition-colors duration-200 p-1 rounded hover:bg-white/10 ${feedback === 'up' ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}`}><HandThumbUpIcon className="w-4 h-4" /></button>
                <button onClick={() => handleFeedback('down')} className={`transition-colors duration-200 p-1 rounded hover:bg-white/10 ${feedback === 'down' ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'}`}><HandThumbDownIcon className="w-4 h-4" /></button>
            </div>
        )}
      </div>
      {isUser && avatar}
    </div>
  );
};

export default MessageBubble;
