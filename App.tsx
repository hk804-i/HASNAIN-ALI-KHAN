import React, { useState, useEffect } from 'react';
import { ChatMessage, ImagePart } from './types';
import { sendMessageToAI } from './services/geminiService';
import ChatWindow from './components/ChatWindow';
import LiveAudio from './components/LiveAudio';
import ModeToggle from './components/ModeToggle';
import InstallButton from './components/InstallButton';

const CHAT_HISTORY_KEY = 'hai-chat-history';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'text' | 'audio'>('text');
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

  useEffect(() => {
    // Load chat history from localStorage on initial load
    try {
      const savedMessages = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        // Start with a welcome message if no history is found
        setMessages([
          {
            role: 'model',
            content: "Greetings. I am H.A.I., an advanced AI assistant developed by Hasnain Ali. I am equipped for complex tasks, from creative writing to code analysis. How may I be of service to you today?",
          },
        ]);
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
      // Fallback to welcome message if loading fails
      setMessages([
        {
          role: 'model',
          content: "Greetings. I am H.A.I., an advanced AI assistant developed by Hasnain Ali. I am equipped for complex tasks, from creative writing to code analysis. How may I be of service to you today?",
        },
      ]);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      } catch (e) {
        console.error("Failed to save chat history:", e);
      }
    }
  }, [messages]);


  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setInstallPromptEvent(null);
  };

  const handleSendMessage = async (messageContent: string, image?: ImagePart) => {
    setError(null);
    const userMessage: ChatMessage = {
      role: 'user',
      content: messageContent,
      image: image ? `data:${image.mimeType};base64,${image.data}` : undefined,
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      const aiResponse = await sendMessageToAI(messageContent, image);
      setMessages(prevMessages => [...prevMessages, aiResponse]);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to get response from AI: ${errorMessage}`);
      const errorResponse: ChatMessage = { role: 'model', content: "I'm having trouble connecting right now. Please try again later." };
       setMessages(prevMessages => [...prevMessages, errorResponse]);
    } finally {
      setIsLoading(false);
    }
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
            error={error}
          />
        ) : (
          <LiveAudio />
        )}
    </div>
  );
};

export default App;
