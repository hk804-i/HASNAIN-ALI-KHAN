
import React, { useState, useEffect } from 'react';
import { ChatMessage, Attachment, ModelMode, ImageSize } from './types';
import { sendMessageToAI, generateVeoVideo, generateImage } from './services/geminiService';
import ChatWindow from './components/ChatWindow';
import LiveAudio from './components/LiveAudio';
import ModeToggle from './components/ModeToggle';
import InstallButton from './components/InstallButton';

const CHAT_HISTORY_KEY = 'super-ai-chat-history';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'text' | 'audio'>('text');
  const [modelMode, setModelMode] = useState<ModelMode>('balanced');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

  useEffect(() => {
    // Load History
    try {
      const savedMessages = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedMessages) setMessages(JSON.parse(savedMessages));
      else setMessages([{ role: 'model', content: "Greetings. I am Super AI. How may I be of service to you today?" }]);
    } catch (e) {
      setMessages([{ role: 'model', content: "Greetings. I am Super AI. How may I be of service to you today?" }]);
    }

    // Get Location for Grounding
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
            (err) => console.log("Location access denied", err)
        );
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    const handleAppInstalled = () => setInstallPromptEvent(null);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  }, [messages]);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') console.log('User accepted the install prompt');
    setInstallPromptEvent(null);
  };

  const handleSendMessage = async (messageContent: string, attachment?: Attachment) => {
    setError(null);
    setLoadingMessage(null);
    const userMessage: ChatMessage = { role: 'user', content: messageContent, attachment };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const aiResponse = await sendMessageToAI(messageContent, attachment, messages, modelMode, location);
      setMessages(prev => [...prev, aiResponse]);
    } catch (e) {
      setError(`Failed to get response: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateVideo = async (prompt: string, attachment?: Attachment) => {
      if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (!hasKey) {
              try { await window.aistudio.openSelectKey(); } catch (e) { return; }
          }
      }

      setError(null);
      setMessages(prev => [...prev, { role: 'user', content: prompt || "Generate video", attachment }]);
      setIsLoading(true);
      setLoadingMessage("Creating your video with Veo...");

      try {
          const aiResponse = await generateVeoVideo(prompt, attachment);
          setMessages(prev => [...prev, aiResponse]);
      } catch (e) {
          setError(`Failed to generate video: ${e instanceof Error ? e.message : 'Unknown error'}`);
      } finally {
          setIsLoading(false);
          setLoadingMessage(null);
      }
  };

  const handleGenerateImage = async (prompt: string, size: ImageSize) => {
     if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (!hasKey) {
              try { await window.aistudio.openSelectKey(); } catch (e) { return; }
          }
      }
      setError(null);
      setMessages(prev => [...prev, { role: 'user', content: `Generate ${size} image: ${prompt}` }]);
      setIsLoading(true);
      setLoadingMessage(`Generating ${size} image...`);

      try {
          const aiResponse = await generateImage(prompt, size);
          setMessages(prev => [...prev, aiResponse]);
      } catch (e) {
          setError(`Failed to generate image: ${e instanceof Error ? e.message : 'Unknown error'}`);
      } finally {
          setIsLoading(false);
          setLoadingMessage(null);
      }
  }

  const handleNewChat = () => {
    setMessages([{ role: 'model', content: "Greetings. I am Super AI. How may I be of service to you today?" }]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white font-sans p-4 w-full">
       <div className="w-full max-w-4xl mx-auto flex justify-center items-center flex-wrap gap-4">
         <ModeToggle mode={chatMode} onToggle={setChatMode} />
         {installPromptEvent && <InstallButton onClick={handleInstallClick} />}
       </div>
       {chatMode === 'text' ? (
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onGenerateVideo={handleGenerateVideo}
            onGenerateImage={handleGenerateImage}
            onNewChat={handleNewChat}
            onModeChange={setModelMode}
            currentMode={modelMode}
            error={error}
            loadingMessage={loadingMessage}
          />
        ) : (
          <LiveAudio />
        )}
    </div>
  );
};

export default App;
