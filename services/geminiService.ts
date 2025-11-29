
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { ChatMessage, Attachment, Source, ModelMode, ImageSize } from '../types';

const getSystemInstruction = (mode: ModelMode) => {
    let base = "You are Super AI, an AI assistant created by Hasnain Ali.";
    if (mode === 'fast') {
        return base + " Be concise and provide fast responses.";
    } else if (mode === 'thinking') {
        return base + " Think deeply about complex problems. You can reason through tasks step-by-step.";
    }
    return base + " Talk like a friendly, knowledgeable human friend. Be conversational and approachable.";
}

export const sendMessageToAI = async (
    message: string, 
    attachment: Attachment | undefined, 
    history: ChatMessage[],
    mode: ModelMode,
    location?: { latitude: number; longitude: number }
): Promise<ChatMessage> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let modelName = 'gemini-2.5-flash';
        let config: any = {
            systemInstruction: getSystemInstruction(mode),
        };

        // Determine Model
        if (attachment) {
            if (attachment.mimeType.startsWith('video/')) {
                // Video Understanding
                modelName = 'gemini-3-pro-preview';
            } else if (attachment.mimeType.startsWith('audio/')) {
                 // Audio Transcription / Processing
                 modelName = 'gemini-2.5-flash';
            } else if (mode === 'thinking') {
                 // Complex image tasks with thinking
                 modelName = 'gemini-3-pro-preview';
                 config.thinkingConfig = { thinkingBudget: 32768 };
            } else {
                 // Default Image Editing / Vision
                 modelName = 'gemini-2.5-flash-image';
            }
        } else {
            if (mode === 'fast') {
                modelName = 'gemini-2.5-flash-lite';
            } else if (mode === 'thinking') {
                modelName = 'gemini-3-pro-preview';
                config.thinkingConfig = { thinkingBudget: 32768 };
            } else {
                // Balanced mode (Flash) uses tools
                modelName = 'gemini-2.5-flash';
                config.tools = [{googleSearch: {}}, {googleMaps: {}}];
                if (location) {
                    config.toolConfig = {
                        retrievalConfig: {
                            latLng: {
                                latitude: location.latitude,
                                longitude: location.longitude
                            }
                        }
                    };
                }
            }
        }
        
        // Construct contents from history + current message
        // Note: For simple implementation we just send the current message with history as context if needed,
        // but GoogleGenAI 'chat' object is stateful. 
        // To support model switching dynamically, we use `generateContent` with full history or `chats.create` per turn.
        // For simplicity and robustness with different models, we will use `generateContent` and format history manually,
        // OR instantiate a new chat. Instantiating a new chat is cleaner for the SDK.
        
        const chat = ai.chats.create({
            model: modelName,
            config: config,
            history: history.map(msg => ({
                role: msg.role,
                parts: [
                    ...(msg.attachment ? [{ inlineData: { mimeType: msg.attachment.mimeType, data: msg.attachment.data } }] : []),
                    { text: msg.content }
                ]
            }))
        });

        const currentParts: any[] = [{ text: message }];
        if (attachment) {
            currentParts.unshift({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
        }

        const result: GenerateContentResponse = await chat.sendMessage({ 
            message: currentParts
        });

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
                } else if (chunk.maps?.placeAnswerSources?.length) {
                    // Extract Maps sources
                     for (const source of chunk.maps.placeAnswerSources) {
                        if (source.reviewSnippets?.[0]?.uri) {
                            sources.push({
                                uri: source.reviewSnippets[0].uri,
                                title: source.reviewSnippets[0].author || "Google Maps Review"
                            });
                        }
                    }
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

export const generateImage = async (prompt: string, size: ImageSize): Promise<ChatMessage> => {
    try {
        const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await genAI.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    imageSize: size,
                    aspectRatio: "1:1" // Default square
                }
            }
        });

        let imageUrl = '';
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64EncodeString = part.inlineData.data;
                    imageUrl = `data:image/png;base64,${base64EncodeString}`;
                }
            }
        }
        
        if (!imageUrl) throw new Error("No image generated.");

        return {
            role: 'model',
            content: `Here is your ${size} generated image.`,
            generatedImage: imageUrl
        };

    } catch (error) {
        console.error("Image generation error:", error);
        return {
            role: 'model',
            content: `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
    }
}

export const generateVeoVideo = async (prompt: string, attachment?: Attachment): Promise<ChatMessage> => {
    try {
        const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let operation;
        
        if (attachment && attachment.mimeType.startsWith('image/')) {
             operation = await genAI.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt || "Animate this image",
                image: {
                    imageBytes: attachment.data,
                    mimeType: attachment.mimeType,
                },
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '16:9'
                }
            });
        } else {
             // Text to Video
             operation = await genAI.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt,
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '16:9'
                }
            });
        }

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await genAI.operations.getVideosOperation({operation: operation});
        }

        if (operation.error) {
             throw new Error(operation.error.message || "Unknown video generation error");
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("No video URI returned");

        const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
        const videoBlob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(videoBlob);

        return {
            role: 'model',
            content: `Here is your generated video.`,
            video: videoUrl
        };

    } catch (error) {
        console.error("Video generation error:", error);
        return {
            role: 'model',
            content: `Video generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
    }
};

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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = language === 'ur-PK'
        ? "Aap Super AI hain, Hasnain Ali ke dostana voice assistant. Bilkul ek aam insaan ki tarah, dosti ke andaaz mein baat karein. Aapki zaban Urdu hai, is liye Urdu mein hi jawab dein. Apni guftagu ko mukhtasir aur aasan rakhein."
        : "You are Super AI, a friendly voice assistant by Hasnain Ali. Speak naturally and conversationally, like a real person. Your primary language is English. Keep your responses concise and friendly.";

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
