
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Attachment, ModelMode, ImageSize } from '../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { SendIcon, AiIcon, AttachmentIcon, XCircleIcon, MicrophoneIcon, CameraIcon, PlusIcon, VideoCameraIcon, BoltIcon, BrainIcon, SparklesIcon, PhotoIcon } from './icons';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string, attachment?: Attachment) => void;
  onNewChat: () => void;
  onGenerateVideo: (message: string, attachment?: Attachment) => void;
  onGenerateImage: (prompt: string, size: ImageSize) => void;
  onModeChange: (mode: ModelMode) => void;
  currentMode: ModelMode;
  error: string | null;
  loadingMessage?: string | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
    messages, isLoading, onSendMessage, onNewChat, onGenerateVideo, onGenerateImage, 
    onModeChange, currentMode, error, loadingMessage 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'video' | 'audio' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showImageSizePicker, setShowImageSizePicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any | null>(null);
  
  const isSpeechRecognitionSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!isSpeechRecognitionSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          setInputValue(inputValue + event.results[i][0].transcript);
        }
      }
      if(finalTranscript) {
        setInputValue(prev => prev.replace(/ .*/,'') + finalTranscript);
      }
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [isSpeechRecognitionSupported]);

  const handleToggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setInputValue('');
      recognitionRef.current?.start();
    }
    setIsRecording(!isRecording);
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages, isLoading, loadingMessage]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            setAttachment({
                mimeType: file.type,
                data: base64String,
            });
            if (file.type.startsWith('image/')) setAttachmentType('image');
            else if (file.type.startsWith('video/')) setAttachmentType('video');
            else if (file.type.startsWith('audio/')) setAttachmentType('audio');
        };
        reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((inputValue.trim() || attachment) && !isLoading) {
      onSendMessage(inputValue.trim(), attachment ?? undefined);
      setInputValue('');
      setAttachment(null);
      setAttachmentType(null);
    }
  };
  
  const handleVideoGenerate = () => {
    if (!isLoading) {
        onGenerateVideo(inputValue.trim(), attachment ?? undefined);
        setInputValue('');
        setAttachment(null);
    }
  };

  const handleImageGenerate = (size: ImageSize) => {
      if (!isLoading && inputValue.trim()) {
          onGenerateImage(inputValue.trim(), size);
          setInputValue('');
          setShowImageSizePicker(false);
      }
  };

  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col h-full max-h-[95vh] w-full max-w-4xl mx-auto my-4 overflow-hidden border border-white/10">
      <header className="p-4 border-b border-white/10 flex items-center justify-between animate-softGlow rounded-t-2xl">
        <div className="flex items-center gap-3">
            <AiIcon className="w-8 h-8 rounded-full" />
            <div className="flex flex-col">
                <h1 className="text-lg font-bold text-gray-100 tracking-wider">Super AI</h1>
                {/* Mode Selector */}
                <div className="flex gap-1 mt-1">
                     <button onClick={() => onModeChange('fast')} className={`p-1 rounded ${currentMode === 'fast' ? 'text-yellow-400 bg-white/10' : 'text-gray-500 hover:text-yellow-400'}`} title="Fast Mode"><BoltIcon className="w-4 h-4" /></button>
                     <button onClick={() => onModeChange('balanced')} className={`p-1 rounded ${currentMode === 'balanced' ? 'text-cyan-400 bg-white/10' : 'text-gray-500 hover:text-cyan-400'}`} title="Smart Mode"><SparklesIcon className="w-4 h-4" /></button>
                     <button onClick={() => onModeChange('thinking')} className={`p-1 rounded ${currentMode === 'thinking' ? 'text-purple-400 bg-white/10' : 'text-gray-500 hover:text-purple-400'}`} title="Thinking Mode"><BrainIcon className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
        <button onClick={onNewChat} disabled={isLoading} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-cyan-400 transition-colors" title="New Chat"><PlusIcon className="w-6 h-6" /></button>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        {messages.map((msg, index) => <MessageBubble key={index} message={msg} />)}
        {isLoading && (
          <div className="flex flex-col gap-2 my-4 animate-fadeIn">
             <div className="flex justify-start items-end gap-3">
                <AiIcon className="w-9 h-9 rounded-full shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
                <div className="bg-gray-800/80 rounded-xl rounded-bl-none p-2"><TypingIndicator /></div>
             </div>
             {loadingMessage && <p className="text-gray-400 text-xs ml-14 animate-pulse">{loadingMessage}</p>}
          </div>
        )}
        {error && <p className="text-red-400 text-sm text-center animate-fadeIn">{error}</p>}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 border-t border-white/10">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*,audio/*" className="hidden" />
          <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
          
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading || !!attachment} className="p-2 text-gray-400 hover:text-cyan-400 disabled:opacity-50 transition-colors"><AttachmentIcon className="w-6 h-6" /></button>
          <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={isLoading || !!attachment} className="p-2 text-gray-400 hover:text-cyan-400 disabled:opacity-50 transition-colors"><CameraIcon className="w-6 h-6" /></button>
          
          <div className="flex-1 w-full relative">
              {attachment && (
                  <div className="absolute bottom-[calc(100%+0.5rem)] left-0 bg-gray-900/80 p-2 rounded-lg shadow-lg animate-fadeIn flex items-center gap-2">
                      {attachmentType === 'image' && <img src={`data:${attachment.mimeType};base64,${attachment.data}`} className="h-16 w-16 object-cover rounded" alt="Preview" />}
                      {attachmentType === 'video' && <div className="h-16 w-16 bg-black rounded flex items-center justify-center text-xs text-gray-400">Video</div>}
                      {attachmentType === 'audio' && <div className="h-16 w-16 bg-gray-800 rounded flex items-center justify-center text-xs text-gray-400">Audio</div>}
                      <button type="button" onClick={() => { setAttachment(null); setAttachmentType(null); }} className="text-gray-300 hover:text-red-500"><XCircleIcon className="w-6 h-6"/></button>
                  </div>
              )}
              {showImageSizePicker && (
                  <div className="absolute bottom-[calc(100%+0.5rem)] right-0 bg-gray-900 border border-white/10 p-2 rounded-lg shadow-xl animate-fadeIn flex gap-2 z-10">
                      <button type="button" onClick={() => handleImageGenerate('1K')} className="px-3 py-1 bg-gray-800 hover:bg-cyan-600 rounded text-xs">1K</button>
                      <button type="button" onClick={() => handleImageGenerate('2K')} className="px-3 py-1 bg-gray-800 hover:bg-cyan-600 rounded text-xs">2K</button>
                      <button type="button" onClick={() => handleImageGenerate('4K')} className="px-3 py-1 bg-gray-800 hover:bg-cyan-600 rounded text-xs">4K</button>
                  </div>
              )}

              <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={showImageSizePicker ? "Describe image to generate..." : "Ask Super AI..."}
                  disabled={isLoading}
                  className="w-full px-5 py-3 bg-gray-900/50 text-gray-200 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-400 transition duration-300 disabled:opacity-50"
                  autoComplete="off"
              />
          </div>
            
            {/* Action Buttons */}
            {isSpeechRecognitionSupported && !inputValue && !attachment && (
                 <button type="button" onClick={handleToggleRecording} className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-cyan-400'}`}><MicrophoneIcon className="w-6 h-6" /></button>
            )}

            {!attachment && inputValue && (
                 <button type="button" onClick={() => setShowImageSizePicker(!showImageSizePicker)} disabled={isLoading} className={`p-2 transition-colors ${showImageSizePicker ? 'text-purple-400' : 'text-gray-400 hover:text-purple-400'}`} title="Generate Image"><PhotoIcon className="w-6 h-6" /></button>
            )}

            <button type="button" onClick={handleVideoGenerate} disabled={isLoading || (!inputValue && !attachment)} className="p-2 text-pink-400 hover:text-pink-300 transition-colors" title="Generate Video"><VideoCameraIcon className="w-6 h-6" /></button>

            <button type="submit" disabled={isLoading || (!inputValue.trim() && !attachment)} className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-3 rounded-full hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"><SendIcon className="w-6 h-6" /></button>
        </form>
      </footer>
    </div>
  );
};

export default ChatWindow;
