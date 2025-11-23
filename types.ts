
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    // FIX: Add webkitAudioContext to window type to support Safari and older browsers.
    webkitAudioContext: any;
  }
}

export interface Source {
  uri: string;
  title: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  image?: string; // data URL for display
  sources?: Source[];
}

export interface ImagePart {
  mimeType: string;
  data: string; // base64 string
}

export interface TranscriptEntry {
  source: 'user' | 'model';
  text: string;
  sources?: Source[];
}