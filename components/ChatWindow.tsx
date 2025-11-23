import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ImagePart } from '../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { SendIcon, AiIcon, AttachmentIcon, XCircleIcon, MicrophoneIcon, CameraIcon } from './icons';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string, image?: ImagePart) => void;
  error: string | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onSendMessage, error }) => {
  const [inputValue, setInputValue] = useState('');
  const [image, setImage] = useState<ImagePart | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  // FIX: The `SpeechRecognition` type is not available in the default TypeScript DOM library.
  // Using `any` to avoid a compilation error. The runtime code already checks for API availability.
  const recognitionRef = useRef<any | null>(null);
  
  const isSpeechRecognitionSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!isSpeechRecognitionSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
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

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if (isRecording) setIsRecording(false);
    };

    recognition.onend = () => {
      if (isRecording) setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };

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

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            setImage({
                mimeType: file.type,
                data: base64String,
            });
        };
        reader.readAsDataURL(file);
    }
    // Reset the input value to allow selecting the same file again
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((inputValue.trim() || image) && !isLoading) {
      onSendMessage(inputValue.trim(), image ?? undefined);
      setInputValue('');
      setImage(null);
       if (isRecording) {
         recognitionRef.current?.stop();
         setIsRecording(false);
      }
    }
  };
  
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col h-full max-h-[95vh] w-full max-w-4xl mx-auto my-4 overflow-hidden border border-white/10">
      <header className="p-4 border-b border-white/10 flex items-center gap-4 animate-softGlow rounded-t-2xl">
        <AiIcon className="w-10 h-10 rounded-full" />
        <h1 className="text-xl font-bold text-gray-100 tracking-wider">H.A.I. - Advanced Assistant</h1>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        {messages.map((msg, index) => (
          <MessageBubble key={index} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start items-end gap-3 my-4 animate-fadeIn">
             <AiIcon className="w-9 h-9 rounded-full shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
             <div className="bg-gray-800/80 rounded-xl rounded-bl-none p-2">
                <TypingIndicator />
             </div>
          </div>
        )}
        {error && <p className="text-red-400 text-sm text-center animate-fadeIn">{error}</p>}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 border-t border-white/10">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
              type="file"
              ref={attachmentInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
          />
           <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
          />
          <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              disabled={isLoading || !!image}
              className="p-3 text-gray-400 hover:text-cyan-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
              aria-label="Attach image from gallery"
          >
              <AttachmentIcon className="w-6 h-6" />
          </button>
           <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isLoading || !!image}
              className="p-3 text-gray-400 hover:text-cyan-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
              aria-label="Take photo with camera"
          >
              <CameraIcon className="w-6 h-6" />
          </button>
          <div className="flex-1 w-full relative">
              {image && (
                  <div className="absolute bottom-[calc(100%+0.5rem)] left-0 bg-gray-900/80 p-1 rounded-lg shadow-lg animate-fadeIn">
                      <img src={`data:${image.mimeType};base64,${image.data}`} className="h-20 w-20 object-cover rounded" alt="Preview" />
                      <button
                          type="button"
                          onClick={() => setImage(null)}
                          className="absolute -top-2 -right-2 text-gray-300 bg-gray-800 rounded-full hover:bg-red-500 hover:text-white transition-all"
                          aria-label="Remove image"
                      >
                          <XCircleIcon className="w-6 h-6"/>
                      </button>
                  </div>
              )}
              <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask H.A.I. anything..."
                  disabled={isLoading}
                  className="flex-1 w-full px-5 py-3 bg-gray-900/50 text-gray-200 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition duration-300 disabled:opacity-50"
                  autoComplete="off"
              />
          </div>
           {isSpeechRecognitionSupported && (
             <button
                type="button"
                onClick={handleToggleRecording}
                disabled={isLoading}
                className={`p-3 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-cyan-400'}`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                <MicrophoneIcon className="w-6 h-6" />
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || (!inputValue.trim() && !image)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-3 rounded-full hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900 transform hover:scale-105 active:scale-95"
              aria-label="Send message"
            >
              <SendIcon className="w-6 h-6" />
            </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatWindow;