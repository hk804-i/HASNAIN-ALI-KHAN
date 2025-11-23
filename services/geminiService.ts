// FIX: Removed import of non-exported 'LiveSession' type.
import { GoogleGenAI, Chat, GenerateContentResponse, Modality } from "@google/genai";
import { ChatMessage, ImagePart, Source } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let chat: Chat | null = null;

function getChatInstance(): Chat {
    if (!chat) {
        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are H.A.I. (Human-like Advanced Intelligence), an AI assistant created by Hasnain Ali. Talk like a friendly, knowledgeable human friend. Be conversational and approachable. Your primary language is English. You're also an expert in colloquial Urdu, so switch to it naturally if the user starts speaking it, and switch back to English if they do. Avoid being overly robotic or formal.",
                tools: [{googleSearch: {}}],
            },
        });
    }
    return chat;
}

export const sendMessageToAI = async (message: string, image?: ImagePart): Promise<ChatMessage> => {
    try {
        const chatInstance = getChatInstance();
        
        const result: GenerateContentResponse = image 
            ? await chatInstance.sendMessage({ 
                message: [
                    ...(message ? [{ text: message }] : []),
                    { inlineData: { mimeType: image.mimeType, data: image.data } }
                ] 
            })
            : await chatInstance.sendMessage({ message });

        const responseText = result.text;
        
        const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources: Source[] = [];
        if (groundingChunks) {
            for (const chunk of groundingChunks) {
                if (chunk.web) {
                    sources.push({
                        uri: chunk.web.uri,
                        title: chunk.web.title || chunk.web.uri,
                    });
                }
            }
        }
        
        return {
            role: 'model',
            content: responseText,
            sources: sources.length > 0 ? sources : undefined,
        };
    } catch (error) {
        console.error("Error sending message to AI:", error);
        let errorMessage = "Sorry, I encountered an error. Please try again.";
        if (error instanceof Error) {
            errorMessage = `Sorry, an error occurred: ${error.message}`;
        }
        return {
            role: 'model',
            content: errorMessage,
        };
    }
};

// FIX: Removed non-exported 'LiveSession' type from the return value, allowing it to be inferred.
export const connectToLiveAI = (
    callbacks: {
        onopen: () => void;
        onmessage: (message: any) => void;
        onerror: (e: any) => void;
        onclose: (e: any) => void;
    },
    language: 'en-US' | 'ur-PK' = 'en-US',
    voice: 'male' | 'female' = 'male'
) => {
    const systemInstruction = language === 'ur-PK'
        ? "Aap H.A.I. hain, Hasnain Ali ke dostana voice assistant. Bilkul ek aam insaan ki tarah, dosti ke andaaz mein baat karein. Aapki zaban Urdu hai, is liye Urdu mein hi jawab dein. Apni guftagu ko mukhtasir aur aasan rakhein."
        : "You are H.A.I., a friendly voice assistant by Hasnain Ali. Speak naturally and conversationally, like a real person. Your primary language is English. Keep your responses concise and friendly.";

    const voiceName = voice === 'male' ? 'Zephyr' : 'Puck';

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: systemInstruction,
            tools: [{googleSearch: {}}],
        },
    });
    return sessionPromise;
};