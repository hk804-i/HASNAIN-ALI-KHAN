import React, { useState, useRef, useEffect, useCallback } from 'react';
// FIX: Removed import of non-exported 'LiveSession' type.
import { LiveServerMessage } from '@google/genai';
import { connectToLiveAI } from '../services/geminiService';
import { createBlob, decode, decodeAudioData } from '../utils/audio';
import { TranscriptEntry, Source } from '../types';
import { PhoneIcon, PhoneXMarkIcon, UserIcon, AiIcon, PlayIcon, PauseIcon, LinkIcon } from './icons';
import LanguageSelector from './LanguageSelector';
import VoiceSelector from './VoiceSelector';

const OWNER_PASSWORD = 'hasnain'; // The owner's password

const LiveAudio: React.FC = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isPlaybackPaused, setIsPlaybackPaused] = useState(false);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [status, setStatus] = useState('Idle. Press start to talk.');
    const [language, setLanguage] = useState<'en-US' | 'ur-PK'>('en-US');
    const [voice, setVoice] = useState<'male' | 'female'>('male');
    const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);


    // FIX: Replaced non-exported 'LiveSession' type with an inferred type from `connectToLiveAI`.
    const sessionPromiseRef = useRef<ReturnType<typeof connectToLiveAI> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const currentSourcesRef = useRef<Source[]>([]);

    const stopSession = useCallback(async () => {
        setStatus('Stopping session...');
        if (sessionPromiseRef.current) {
            const session = await sessionPromiseRef.current;
            session.close();
            sessionPromiseRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            await inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
             for (const source of sourcesRef.current.values()) {
                source.stop();
             }
             sourcesRef.current.clear();
             await outputAudioContextRef.current.close();
        }
        setIsSessionActive(false);
        setIsPlaybackPaused(false);
        setStatus('Session ended. Press start to talk again.');
    }, []);

    const handleTogglePlayback = useCallback(() => {
        if (!outputAudioContextRef.current) return;
        const audioCtx = outputAudioContextRef.current;
        if (audioCtx.state === 'running') {
            audioCtx.suspend().then(() => {
                setIsPlaybackPaused(true);
            });
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                setIsPlaybackPaused(false);
            });
        }
    }, []);

    const handleMessage = async (message: LiveServerMessage) => {
        if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            currentInputTranscriptionRef.current += text;
        }
        if (message.serverContent?.outputTranscription) {
            const text = message.serverContent.outputTranscription.text;
            currentOutputTranscriptionRef.current += text;
        }
        
        const groundingMetadata = message.serverContent?.modelTurn?.groundingMetadata ?? message.serverContent?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
            for (const chunk of groundingMetadata.groundingChunks) {
                if (chunk.web) {
                    // Avoid duplicates
                    if (!currentSourcesRef.current.some(s => s.uri === chunk.web.uri)) {
                        currentSourcesRef.current.push({
                            uri: chunk.web.uri,
                            title: chunk.web.title || chunk.web.uri,
                        });
                    }
                }
            }
        }

        if (message.serverContent?.turnComplete) {
            const fullInput = currentInputTranscriptionRef.current.trim();
            const fullOutput = currentOutputTranscriptionRef.current.trim();
            const finalSources = [...currentSourcesRef.current];

            setTranscripts(prev => {
                const newTranscripts = [...prev];
                if (fullInput) newTranscripts.push({ source: 'user', text: fullInput });
                if (fullOutput) {
                    newTranscripts.push({ 
                        source: 'model', 
                        text: fullOutput,
                        sources: finalSources.length > 0 ? finalSources : undefined
                    });
                }
                return newTranscripts;
            });
            
            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
            currentSourcesRef.current = [];
        }
        
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && outputAudioContextRef.current) {
            const outputAudioContext = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);

            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.destination);
            
            source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
            });
            
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
        }

        if(message.serverContent?.interrupted){
            for (const source of sourcesRef.current.values()) {
              source.stop();
              sourcesRef.current.delete(source);
            }
            nextStartTimeRef.current = 0;
        }
    };

    const startSession = async () => {
        setTranscripts([]);
        setStatus('Initializing session...');
        setIsPlaybackPaused(false);
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsSessionActive(true);
            setStatus('Connecting to H.A.I...');

            sessionPromiseRef.current = connectToLiveAI({
                onopen: () => {
                    setStatus('Connection open. You can start speaking now.');
                    inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                    outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                    nextStartTimeRef.current = 0;

                    const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current!);
                    scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    
                    source.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                },
                onmessage: handleMessage,
                onerror: (e) => {
                    console.error('Session error:', e);
                    setStatus('An error occurred. Please try again.');
                    stopSession();
                },
                onclose: () => {
                    setStatus('Session closed.');
                    stopSession();
                },
            }, language, voice);

        } catch (error) {
            console.error("Failed to start session:", error);
            setStatus('Failed to get microphone access. Please check permissions.');
            setIsSessionActive(false);
        }
    };

    const attemptToChangeSetting = (changeCallback: () => void) => {
        if (isSettingsUnlocked) {
            changeCallback();
            return;
        }
        
        const password = prompt("Please enter the owner's password to change settings:");
        
        if (password === OWNER_PASSWORD) {
            setIsSettingsUnlocked(true);
            alert("Settings unlocked for this session.");
            changeCallback();
        } else if (password !== null) { // User entered something but it was wrong
            alert("Incorrect password. Settings remain locked.");
        }
    };
    
    useEffect(() => {
        return () => {
           if(isSessionActive) {
             stopSession();
           }
        };
    }, [isSessionActive, stopSession]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    return (
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col h-full max-h-[95vh] w-full max-w-4xl mx-auto my-4 overflow-hidden border border-white/10">
            <header className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <AiIcon className="w-10 h-10 rounded-full" />
                    <h1 className="text-xl font-bold text-gray-100 tracking-wider">H.A.I. - Voice Assistant</h1>
                </div>
                <div className="text-right">
                   <p className="text-sm font-medium text-cyan-400">{isSessionActive ? "Status: Active" : "Status: Offline"}</p>
                   <p className="text-xs text-gray-400">{status}</p>
                </div>
            </header>

            <div className="flex flex-wrap items-center justify-center gap-4 p-4 border-b border-white/10">
                 <LanguageSelector 
                    selectedLanguage={language}
                    onSelectLanguage={(lang) => attemptToChangeSetting(() => setLanguage(lang))}
                    disabled={isSessionActive}
                />
                 <VoiceSelector 
                    selectedVoice={voice}
                    onSelectVoice={(v) => attemptToChangeSetting(() => setVoice(v))}
                    disabled={isSessionActive}
                />
            </div>

            <main className="flex-1 px-6 pb-6 overflow-y-auto">
                {transcripts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                         <PhoneIcon className="w-16 h-16 mb-4"/>
                         <p>Select your language and voice, then press start.</p>
                    </div>
                )}
                {transcripts.map((entry, index) => (
                    <div key={index} className={`flex items-start gap-3 my-3 animate-fadeIn ${entry.source === 'user' ? 'justify-end' : 'justify-start'}`}>
                       {entry.source === 'model' && <AiIcon className="w-8 h-8 rounded-full flex-shrink-0" />}
                       <div className={`max-w-md px-4 py-2 rounded-xl ${entry.source === 'user' ? 'bg-indigo-500/50 rounded-br-none' : 'bg-gray-800/80 rounded-bl-none'}`}>
                         <p>{entry.text}</p>
                         {entry.source === 'model' && entry.sources && entry.sources.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-gray-600/50">
                                <h4 className="text-xs font-bold text-gray-400 mb-1">Sources:</h4>
                                <ul className="space-y-1">
                                {entry.sources.map((source, idx) => (
                                    <li key={idx} className="text-xs">
                                    <a 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-start gap-1.5 text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
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
                       {entry.source === 'user' && <UserIcon className="w-8 h-8 p-1.5 bg-gray-600 rounded-full flex-shrink-0" />}
                    </div>
                ))}
                 <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 border-t border-white/10 flex items-center justify-center gap-6">
                <button
                    onClick={isSessionActive ? stopSession : startSession}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 ${
                        isSessionActive 
                        ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400/50 animate-pulse' 
                        : 'bg-green-500 hover:bg-green-600 focus:ring-green-400/50'
                    }`}
                    aria-label={isSessionActive ? 'Stop Conversation' : 'Start Conversation'}
                >
                    {isSessionActive ? <PhoneXMarkIcon className="w-10 h-10 text-white" /> : <PhoneIcon className="w-10 h-10 text-white" />}
                </button>
                {isSessionActive && (
                    <button
                        onClick={handleTogglePlayback}
                        className="w-20 h-20 rounded-full flex items-center justify-center bg-gray-600/80 hover:bg-gray-700/80 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-500/50"
                        aria-label={isPlaybackPaused ? 'Resume Audio' : 'Pause Audio'}
                    >
                        {isPlaybackPaused ? <PlayIcon className="w-10 h-10 text-white" /> : <PauseIcon className="w-10 h-10 text-white" />}
                    </button>
                )}
            </footer>
        </div>
    );
};

export default LiveAudio;