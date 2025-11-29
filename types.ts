
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    webkitAudioContext: any;
  }
}

export type ModelMode = 'fast' | 'balanced' | 'thinking';
export type ImageSize = '1K' | '2K' | '4K';

export interface Source {
  uri: string;
  title: string;
}

export interface Attachment {
  mimeType: string;
  data: string; // base64 string
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  attachment?: Attachment; // Generalized from image for images, videos, audio
  video?: string; // URL for the generated video
  generatedImage?: string; // URL for the generated image
  sources?: Source[];
}

export interface TranscriptEntry {
  source: 'user' | 'model';
  text: string;
  sources?: Source[];
}
