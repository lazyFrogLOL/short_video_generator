import React, { useEffect, useRef, useState } from 'react';
import { Scene } from '../types';
import { downloadAssetsAsZip, exportRemotionWithAssets } from '../utils/downloadUtils';
import './Player.css';

interface PlayerProps {
  scenes: Scene[];
  onRestart: () => void;
  bgMusicUrl?: string;
  topic?: string; // Add topic prop
}

const Player: React.FC<PlayerProps> = ({ scenes, onRestart, bgMusicUrl, topic = 'project' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(1); // For visual fade transition
  const [visibleText, setVisibleText] = useState(''); // For typewriter effect
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Audio Context once
  useEffect(() => {
    // Fix: Cast window to any to access webkitAudioContext
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Handle Background Music
  useEffect(() => {
    if (!bgMusicUrl) return;

    const bgm = new Audio(bgMusicUrl);
    bgm.loop = true;
    bgm.volume = 0.15; // Set a low volume for background music so it doesn't overpower narration
    bgmRef.current = bgm;

    // Try to play immediately if the user has interacted
    const playPromise = bgm.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("Auto-play was prevented or BGM source is invalid (404).", error);
        });
    }
    
    // Handle loading errors (e.g., 404)
    bgm.onerror = () => {
        console.error(`Background music failed to load: ${bgMusicUrl}. This might be due to an expired URL or network issue.`);
    };

    return () => {
        bgm.pause();
        bgm.src = "";
        bgmRef.current = null;
    };
  }, [bgMusicUrl]);

  // Stop BGM when finished
  useEffect(() => {
      if (isFinished && bgmRef.current) {
          bgmRef.current.pause();
      } else if (!isFinished && bgmRef.current && bgmRef.current.paused) {
          bgmRef.current.play().catch(() => {});
      }
  }, [isFinished]);

  const handleNext = () => {
    // Fade out current scene before switching
    setFadeOpacity(0);
    setTimeout(() => {
      if (currentIndex < scenes.length - 1) {
        setCurrentIndex(prev => prev + 1);
        // Fade in new scene
        setFadeOpacity(1);
      } else {
        setIsFinished(true);
        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.stop();
          } catch (e) {}
        }
        if (playTimeoutRef.current) {
          clearTimeout(playTimeoutRef.current);
        }
      }
    }, 300); // 300ms fade transition
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFinished(false);
      // Fade out current scene
      setFadeOpacity(0);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        // Fade in previous scene
        setFadeOpacity(1);
      }, 300);
    }
  };

  const playSceneAudio = (scene: Scene) => {
    // Cleanup previous state
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.onended = null;
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    
    if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
    }

    if (!audioContextRef.current) return;

    // 1. If audio buffer exists, play it directly without fade
    if (scene.audioBuffer) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = scene.audioBuffer;
        
        // Set playback speed to 1.5x
        source.playbackRate.value = 1.5;
        
        // Connect directly to destination (no fade in/out)
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => {
          setIsPlaying(false);
          handleNext();
        };

        source.start();
        sourceNodeRef.current = source;
        setIsPlaying(true);
    } 
    // 2. Fallback: If no audio, wait for estimated duration then skip
    else {
        console.warn(`Scene ${scene.id} has no audio. Using fallback timer.`);
        setIsPlaying(true);
        // Estimate duration based on text length. 
        // Approx 250ms per character for normal speech, but we are simulating 2x speed, so maybe 125ms?
        // Let's be safe and give enough time to read.
        // Min 3 seconds.
        const durationMs = Math.max(3000, scene.narration.length * 200);
        
        playTimeoutRef.current = setTimeout(() => {
            setIsPlaying(false);
            handleNext();
        }, durationMs);
    }
  };

  const currentScene = scenes[currentIndex];

  // Typewriter effect: Reset and start typing when scene changes
  useEffect(() => {
    // Clear any existing typewriter interval
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }
    
    // Reset visible text
    setVisibleText('');
    
    if (currentIndex < scenes.length && !isFinished) {
      const currentScene = scenes[currentIndex];
      const text = currentScene.narration;
      const textLength = text.length;
      
      // Calculate typing speed: show text over a longer duration based on text length and scene duration
      // Base: 3 seconds minimum, or 80% of scene duration (whichever is longer)
      // Add extra time for longer text: 0.1 seconds per character after 20 chars
      const sceneDuration = currentScene.actualDuration 
        ? (currentScene.actualDuration / 1.5) * 1000 // Account for 1.5x playback speed
        : Math.max(3000, textLength * 200);
      const baseDuration = Math.max(sceneDuration * 0.8, 3000); // At least 3 seconds or 80% of scene
      const extraDuration = Math.max(0, (textLength - 20) * 100); // 100ms per char after 20 chars
      const typewriterDuration = Math.min(baseDuration + extraDuration, sceneDuration * 0.95); // Max 95% of scene
      const charDelay = Math.max(50, typewriterDuration / textLength); // Min 50ms per char (slower than before)
      
      // Start typewriter effect
      let currentCharIndex = 0;
      typewriterIntervalRef.current = setInterval(() => {
        if (currentCharIndex < textLength) {
          currentCharIndex++;
          setVisibleText(text.substring(0, currentCharIndex));
        } else {
          // Typing complete
          if (typewriterIntervalRef.current) {
            clearInterval(typewriterIntervalRef.current);
            typewriterIntervalRef.current = null;
          }
        }
      }, charDelay);
    }
    
    // Cleanup on unmount or scene change
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
        typewriterIntervalRef.current = null;
      }
    };
  }, [currentIndex, scenes, isFinished]);

  useEffect(() => {
    if (currentScene && !isFinished) {
      // Skip fade in for first scene (index 0) - show immediately
      if (currentIndex === 0) {
        setFadeOpacity(1);
      } else {
        // Fade in when scene changes (for scenes after first)
        setFadeOpacity(1);
      }
      playSceneAudio(currentScene);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isFinished]);

  // Enable Spacebar navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isFinished) {
        event.preventDefault(); 
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, isFinished, scenes.length]);

  const handleExportRemotion = async () => {
    // Export Remotion data with assets cached as local files
    // This creates a ZIP containing:
    // - remotion-data.json (with file path references)
    // - images/ folder (all scene images)
    // - audio/ folder (all scene audio)
    await exportRemotionWithAssets(scenes, topic);
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fadeIn bg-slate-900 w-full">
        <h1 className="text-4xl font-serif font-bold text-white mb-6">完结</h1>
        <p className="text-gray-300 mb-8 max-w-lg">
          演示已结束。您可以导出 Remotion 数据用于视频渲染，或重新播放。
        </p>
        
        <div className="flex gap-4 mb-8">
            <button 
                onClick={onRestart}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold shadow-lg"
            >
                重新开始
            </button>
             <button 
                onClick={() => {
                     setIsFinished(false);
                     setCurrentIndex(0);
                }}
                className="px-6 py-3 border border-gray-600 hover:bg-gray-800 text-white rounded-lg transition-colors"
            >
                重播
            </button>
        </div>
        
        <div className="flex flex-col gap-3 w-full max-w-md">
            <button 
                onClick={handleExportRemotion}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl transition-all font-bold shadow-xl hover:scale-[1.02]"
            >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                导出 Remotion 数据包 (含素材文件)
            </button>

            <button 
                onClick={() => downloadAssetsAsZip(scenes, topic)}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded-xl transition-all font-bold shadow-lg hover:scale-[1.02]"
            >
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                下载项目素材包 (ZIP)
            </button>
        </div>

        <div className="mt-8 text-xs text-gray-500 max-w-md">
            Remotion 数据包包含 JSON 和所有素材文件（图片/音频），可直接用于渲染。项目素材包包含完整脚本和资源文件，方便后期编辑。
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      {/* 
          Main Container: Enforcing 9:16 Aspect Ratio
          Using Flex-Col to split 90% (Image) / 10% (Text)
      */}
      <div className="relative w-full h-full md:w-auto md:aspect-[9/16] md:max-h-screen flex flex-col bg-black shadow-2xl border-x border-gray-800">
        
        {/* --- TOP 90% AREA: IMAGE/VIDEO with Fade Transition --- */}
        <div className="flex-[9] relative w-full h-full overflow-hidden bg-black group flex items-center justify-center">
            {/* For first scene (index 0), use fixed video file */}
            <div 
              className="w-full h-full transition-opacity duration-300 ease-in-out"
              style={{ opacity: fadeOpacity }}
            >
              {currentIndex === 0 ? (
                 <>
                    <video 
                       src="/video/1.mp4"
                       autoPlay
                       loop
                       muted
                       playsInline
                       className="w-full h-full object-cover"
                    />
                    {/* Title overlay on blackboard area for first scene */}
                    <div 
                       className="absolute inset-0 flex items-center justify-center pointer-events-none"
                       style={{
                          paddingTop: '22%',
                          paddingBottom: '40%',
                          paddingLeft: '55%',
                          paddingRight: '5%',
                       }}
                    >
                       <div
                          className="font-bold text-center"
                          style={{
                             color: '#f0f0f0', // Slightly off-white for chalk effect
                             fontSize: 'clamp(32px, 5vw, 70px)',
                             fontFamily: '"Comic Sans MS", "Marker Felt", "Arial", sans-serif',
                             // Multiple text shadows for chalk-like effect
                             textShadow: `
                                2px 2px 0px rgba(0, 0, 0, 0.9),
                                4px 4px 0px rgba(0, 0, 0, 0.7),
                                6px 6px 8px rgba(0, 0, 0, 0.5),
                                0 0 15px rgba(255, 255, 255, 0.2)
                             `,
                             filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.4))',
                             letterSpacing: '4px',
                             lineHeight: 1.3,
                             maxWidth: '85%',
                             wordWrap: 'break-word',
                             // Rotate text 30 degrees for dynamic effect
                             transform: 'rotate(-30deg)',
                             transformOrigin: 'center center',
                          }}
                       >
                          {currentScene.title}
                       </div>
                    </div>
                 </>
              ) : currentScene.imageData ? (
                 <img 
                    src={`data:image/png;base64,${currentScene.imageData}`} 
                    alt={currentScene.visual_description}
                    className="w-full h-full object-cover ken-burns-image"
                    style={{
                      willChange: 'transform' // Optimize for animation
                    }}
                 />
              ) : (
                 <div className="w-full h-full flex items-center justify-center">
                     <span className="text-gray-600">Loading...</span>
                 </div>
              )}
            </div>
        </div>

        {/* --- BOTTOM 10% AREA: NARRATION (Immersive Overlay Style with Typewriter Effect) --- */}
        <div className="absolute bottom-[30%] left-1/2 transform -translate-x-1/2 w-[90%] text-center z-20 pointer-events-none">
             <p 
                className="text-white font-black text-center leading-tight"
                style={{
                    fontSize: 'clamp(32px, 4.5vw, 55px)',
                    fontWeight: 900,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    textShadow: `
                        3px 3px 0 #000,
                        -1px -1px 0 #000,
                        1px -1px 0 #000,
                        -1px 1px 0 #000,
                        1px 1px 0 #000,
                        0 0 10px rgba(0, 0, 0, 0.8)
                    `,
                    WebkitTextStroke: '2px #000'
                }}
             >
                {visibleText || currentScene.narration}
                {/* Blinking cursor effect */}
                {visibleText.length < currentScene.narration.length && (
                    <span 
                        className="inline-block bg-white ml-1"
                        style={{
                            width: '4px',
                            height: 'clamp(32px, 4.5vw, 55px)',
                            animation: 'blink 1s infinite'
                        }}
                    />
                )}
             </p>
        </div>

      </div>
    </div>
  );
};

export default Player;