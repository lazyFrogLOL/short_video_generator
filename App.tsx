import React, { useState, useEffect } from 'react';
import { Scene, AppState, ImageSize } from './types';
import { generateScript } from './services/geminiService';
import AssetGenerator from './components/AssetGenerator';
import Player from './components/Player';
import { loadCurrentProject, clearCurrentProject } from './utils/storageUtils';
import { decodeAudioData, decodeBase64 } from './utils/audioUtils';

// Royalty-free music tracks (using Mixkit previews for demonstration)
const MUSIC_TRACKS = [
  { id: 'none', name: '无背景音乐', url: '' },
  { id: 'tech', name: '未来科技 (Tech House)', url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3' },
  { id: 'cinematic', name: '电影氛围 (Cinematic)', url: 'https://assets.mixkit.co/music/preview/mixkit-cinematic-mystery-trailer-2605.mp3' },
  { id: 'ambient', name: '深邃空间 (Ambient)', url: 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3' },
  { id: 'driving', name: '动感节奏 (Driving)', url: 'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3' }
];

export default function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [script, setScript] = useState<Scene[]>([]);
  const [completedScenes, setCompletedScenes] = useState<Scene[]>([]);
  const [imageSize, setImageSize] = useState<ImageSize>("2K");
  const [topic, setTopic] = useState("自动驾驶");
  const [description, setDescription] = useState("");
  const [selectedMusic, setSelectedMusic] = useState(MUSIC_TRACKS[0].url); // Default to None to avoid 404s
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    // Check for API Key presence via the window.aistudio helper or env
    const checkKey = async () => {
        if (window.aistudio) {
            const selected = await window.aistudio.hasSelectedApiKey();
            setHasApiKey(selected);
        } else {
             setHasApiKey(true); 
        }
    };
    checkKey();
  }, []);

  // Load cached project on mount
  useEffect(() => {
    const loadCached = async () => {
      try {
        const cached = await loadCurrentProject();
        if (cached && cached.scenes && cached.scenes.length > 0) {
          // We need to re-decode audio buffers because IDB doesn't store AudioBuffer objects directly (usually)
          // Or if we stored Base64, we need to decode.
          // Actually, IndexedDB CAN store Blobs/ArrayBuffers.
          // But AssetGenerator saves the whole 'Scene' object which has audioBuffer (AudioBuffer is NOT clonable/storable directly usually).
          // Wait, AudioBuffer is NOT serializable to IDB.
          // We need to check if storageUtils filtered it or if it failed.
          // Let's assume we need to reconstruct AudioBuffer from audioData (Base64 WAV) which IS saved.
          
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          
          const restoredScenes = await Promise.all(cached.scenes.map(async (s) => {
            if (s.audioData && !s.audioBuffer) {
               const rawBytes = decodeBase64(s.audioData);
               const buffer = await decodeAudioData(rawBytes, audioContext);
               return { ...s, audioBuffer: buffer };
            }
            return s;
          }));

          setTopic(cached.topic || "");
          setCompletedScenes(restoredScenes);
          setAppState('PLAYING');
          console.log("Restored project from cache");
        }
      } catch (e) {
        console.error("Failed to load cached project", e);
      }
    };
    loadCached();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
        await window.aistudio.openSelectKey();
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
    }
  };

  const startProduction = async () => {
    if (!topic.trim()) {
      setError("请输入一个主题");
      return;
    }

    try {
      setError(null);
      setAppState('GENERATING_SCRIPT');
      
      // Step 1: Generate Script with user topic and detailed description
      const response = await generateScript(topic, description);
      
      // Assign IDs
      const rawScenes = response.scenes.map((s, i) => ({
        ...s,
        id: i,
      }));
      
      setScript(rawScenes);
      setAppState('REVIEW_SCRIPT');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "无法生成剧本，请重试。");
      setAppState('IDLE');
    }
  };

  const handleScriptChange = (index: number, field: keyof Scene, value: string) => {
    const newScript = [...script];
    newScript[index] = { ...newScript[index], [field]: value };
    setScript(newScript);
  };

  const handleConfirmScript = () => {
    setAppState('GENERATING_ASSETS');
  };

  const handleAssetsComplete = (finalScenes: Scene[]) => {
    setCompletedScenes(finalScenes);
    setAppState('PLAYING');
  };

  const handleRestart = async () => {
    await clearCurrentProject(); // Clear cache on new start
    setAppState('IDLE');
    setScript([]);
    setCompletedScenes([]);
  };

  if (!hasApiKey) {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
              <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center border border-slate-700">
                  <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">需要访问权限</h1>
                  <p className="text-gray-400 mb-6">
                      为了使用 Nano Banana Pro (Gemini 3 Pro) 生成高质量图像和视频内容，您需要连接已启用计费的 Google Cloud 项目。
                  </p>
                  <button 
                    onClick={handleSelectKey}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/25"
                  >
                      选择 API 密钥
                  </button>
                  <p className="mt-4 text-xs text-gray-500">
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-gray-300">
                        查看计费文档
                    </a>
                  </p>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Header / Nav - Hidden during playback for immersive experience */}
      {appState !== 'PLAYING' && (
        <nav className="fixed top-0 left-0 w-full z-50 p-6 flex justify-end items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            {appState !== 'IDLE' && appState !== 'FINISHED' && (
                <div className="px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-mono border border-white/10 pointer-events-auto">
                    状态: {appState === 'GENERATING_SCRIPT' ? '生成剧本中' : '生成素材中'}
                </div>
            )}
        </nav>
      )}

      {/* Main Content Area */}
      <main className="w-full h-screen flex flex-col">
        
        {appState === 'IDLE' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
             {/* Decorative Background */}
             <div className="absolute inset-0 z-0">
                 <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]"></div>
                 <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px]"></div>
             </div>

            <div className="relative z-10 max-w-3xl w-full bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl">
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-6">
                    短视频生成器 (竖屏版)
                </h1>
                <p className="text-center text-gray-400 text-lg mb-8">
                    输入主题或参考文本，AI 自动生成高留存、快节奏的科普短视频脚本 (12个场景 / 120秒)。
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Topic Input */}
                    <div>
                         <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wider">
                             主题 (Topic)
                         </label>
                         <input 
                            id="topic"
                            type="text" 
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="例如：自动驾驶、量子计算、光合作用..."
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-lg"
                         />
                    </div>

                    {/* Detailed Description Input */}
                    <div>
                         <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wider">
                             详细内容 / 参考文本 (Optional)
                         </label>
                         <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="在此粘贴文章、长段描述或具体要求。AI 将根据此内容生成脚本，使其更精准..."
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-base h-32 resize-none custom-scrollbar"
                         />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Quality Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wider">画质选择</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setImageSize(size)}
                                        className={`py-2 px-2 text-sm rounded-lg border transition-all duration-200 font-mono ${
                                            imageSize === size 
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' 
                                            : 'bg-slate-800 border-slate-700 text-gray-400 hover:border-slate-500 hover:bg-slate-700'
                                        }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Music Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wider">背景音乐</label>
                            <div className="relative">
                                <select
                                    value={selectedMusic}
                                    onChange={(e) => setSelectedMusic(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 appearance-none"
                                >
                                    {MUSIC_TRACKS.map((track) => (
                                        <option key={track.id} value={track.url}>
                                            {track.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={startProduction}
                            disabled={!topic.trim()}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            开始制作
                        </button>
                         <p className="text-center text-xs text-gray-500 mt-3">
                            将生成 12 个高冲击力场景。预计耗时 3-4 分钟。
                        </p>
                    </div>
                </div>
            </div>
          </div>
        )}

        {appState === 'GENERATING_SCRIPT' && (
           <div className="flex-1 flex flex-col items-center justify-center">
               <div className="animate-pulse flex flex-col items-center">
                   <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.5)]">
                        <svg className="w-8 h-8 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                   </div>
                   <h2 className="text-2xl font-serif font-bold mb-2">正在策划 "{topic}" 脚本...</h2>
                   <p className="text-gray-400">正在构建 12 幕爆款短视频结构 (Gemini 2.5 Flash)</p>
               </div>
           </div>
        )}

        {appState === 'REVIEW_SCRIPT' && (
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden h-screen">
            <header className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center z-10 shadow-md shrink-0">
               <div>
                   <h2 className="text-xl font-bold text-white flex items-center gap-2">
                       <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                       脚本审核
                   </h2>
                   <p className="text-sm text-gray-400 mt-1">请检查并修改文案与画面描述，确认无误后开始生成素材。</p>
               </div>
               <button
                 onClick={handleConfirmScript}
                 className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-green-900/20 flex items-center gap-2"
               >
                 <span>确认并生成素材</span>
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
               </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {script.map((scene, index) => (
                <div key={scene.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/30 transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-blue-400 font-bold text-sm border border-slate-600">
                            {index + 1}
                        </span>
                        <h3 className="text-lg font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">{scene.title}</h3>
                    </div>
                    <span className="text-xs bg-slate-900/80 px-3 py-1 rounded-full text-gray-400 border border-slate-700 font-mono">
                        {scene.durationInSeconds}s
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visual Description */}
                    <div className="flex flex-col">
                      <label className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">
                          <span>画面描述 (Visual Prompt)</span>
                          <span className="text-blue-500/60 text-[10px]">AI 用于绘图</span>
                      </label>
                      <textarea
                        value={scene.visual_description}
                        onChange={(e) => handleScriptChange(index, 'visual_description', e.target.value)}
                        className="flex-1 w-full min-h-[120px] bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 text-sm text-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y transition-all"
                        placeholder="输入画面描述..."
                      />
                    </div>

                    {/* Narration */}
                    <div className="flex flex-col">
                      <label className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">
                          <span>配音文案 (Voiceover)</span>
                          <span className="text-green-500/60 text-[10px]">AI 用于 TTS</span>
                      </label>
                      <textarea
                        value={scene.narration}
                        onChange={(e) => handleScriptChange(index, 'narration', e.target.value)}
                        className="flex-1 w-full min-h-[120px] bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 text-sm text-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-y transition-all"
                         placeholder="输入配音文案..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {appState === 'GENERATING_ASSETS' && (
          <div className="flex-1 flex items-center justify-center">
            <AssetGenerator 
                script={script} 
                imageSize={imageSize} 
                onComplete={handleAssetsComplete} 
                topic={topic}
            />
          </div>
        )}

        {appState === 'PLAYING' && (
          <Player scenes={completedScenes} bgMusicUrl={selectedMusic} onRestart={handleRestart} topic={topic} />
        )}
      </main>
    </div>
  );
}