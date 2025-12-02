import React, { useEffect, useState, useRef } from 'react';
import { Scene, ImageSize } from '../types';
import { generateImageForScene, generateSpeechForScene } from '../services/geminiService';
import { saveCurrentProject } from '../utils/storageUtils';
import { decodeBase64, decodeAudioData, createWavFile, uint8ArrayToBase64 } from '../utils/audioUtils';

interface AssetGeneratorProps {
  script: Scene[];
  imageSize: ImageSize;
  onComplete: (completedScenes: Scene[]) => void;
  topic?: string;
}

const AssetGenerator: React.FC<AssetGeneratorProps> = ({ script, imageSize, onComplete, topic = "project" }) => {
  const [imgCount, setImgCount] = useState(0);
  const [audioCount, setAudioCount] = useState(0);
  const [status, setStatus] = useState("初始化资源生成任务...");
  const hasRun = useRef(false);
  
  // Fix: Cast window to any to access webkitAudioContext
  const [audioContext] = useState(() => new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }));

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const generateAssets = async () => {
      const results: Scene[] = [...script];
      const totalScenes = script.length;

      // Helper for retry logic
      async function retryOperation<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
        try {
          return await fn();
        } catch (error) {
          console.warn(`Operation failed, retrying... (${retries} left)`);
          if (retries <= 0) throw error;
          await new Promise(resolve => setTimeout(resolve, delay));
          return retryOperation(fn, retries - 1, delay * 2);
        }
      }

      // --- SAFE INCREMENTAL SAVE HELPER ---
      // Ensures we don't bombard IDB with requests by throttling saves
      let isSaving = false;
      let pendingSave = false;
      const safeSave = async () => {
          if (isSaving) {
              pendingSave = true;
              return;
          }
          isSaving = true;
          try {
              await saveCurrentProject(results, topic);
              console.log("Incremental save success");
          } catch(e) {
              console.warn("Incremental save failed (ignored)", e);
          } finally {
              isSaving = false;
              if (pendingSave) {
                  pendingSave = false;
                  // If a save was requested while we were saving, do it now (debounced tail call)
                  // Use timeout to let event loop breathe
                  setTimeout(safeSave, 500); 
              }
          }
      };

      // ---------------------------------------------------------
      // PROCESS 1: Generate Audio (Concurrent Batches)
      // Batch size 3, retry 2 times
      // ---------------------------------------------------------
      const audioLoop = async () => {
        const BATCH_SIZE = 3;
        for (let i = 0; i < totalScenes; i += BATCH_SIZE) {
          const batch = script.slice(i, i + BATCH_SIZE);
          
          await Promise.all(batch.map(async (scene, index) => {
            const actualIndex = i + index;
            try {
              await retryOperation(async () => {
                 const audioBase64 = await generateSpeechForScene(scene.narration);
                 
                 // Important: Poe/Gemini TTS returns encoded audio (e.g. MP3), not raw PCM.
                 // We must use decodeAudioData to get the AudioBuffer for playback/duration.
                 const rawBytes = decodeBase64(audioBase64);
                 const audioBuffer = await decodeAudioData(rawBytes, audioContext);
                 
                 results[actualIndex].audioBuffer = audioBuffer;
                 results[actualIndex].actualDuration = audioBuffer.duration;
                 
                 // Store original file data (MP3/WAV) from Poe directly.
                 // No need to re-encode as WAV since modern browsers and Remotion support MP3.
                 // Re-encoding raw PCM would corrupt the file since rawBytes is already an encoded file.
                 results[actualIndex].audioData = audioBase64;
                 
                 // Persist progress to IndexedDB safely
                 safeSave();

              }, 2, 1000); // Retry 2 times, starting with 1s delay
            } catch (error) {
              console.error(`Audio generation COMPLETELY FAILED for scene ${actualIndex + 1} after retries.`, error);
              // Non-blocking error, player will handle missing audio
            } finally {
              setAudioCount(prev => prev + 1);
            }
          }));
        }
      };

      // ---------------------------------------------------------
      // PROCESS 2: Generate Images (Concurrent Batches)
      // Batch size 3, retry 2 times
      // ---------------------------------------------------------
      const imageLoop = async () => {
        const BATCH_SIZE = 3;
        for (let i = 0; i < totalScenes; i += BATCH_SIZE) {
          const batch = script.slice(i, i + BATCH_SIZE);
          
          await Promise.all(batch.map(async (scene, index) => {
            const actualIndex = i + index;
            
            const styleName = (actualIndex === 0 || actualIndex === totalScenes - 1) ? "视觉冲击 (Pop Art)" : "信息图表 (Infographic)";
            setStatus(`正在绘制场景 ${actualIndex + 1}/${totalScenes} [${styleName}]`);

            try {
                await retryOperation(async () => {
                    // Pass narration as context AND the index 'i' AND totalScenes for style logic
                    const imageData = await generateImageForScene(scene.visual_description, scene.narration, imageSize, actualIndex, totalScenes);
                    
                    if (!imageData) throw new Error("Generated image data is empty");
                    results[actualIndex].imageData = imageData;

                    // Persist progress to IndexedDB safely
                    safeSave();

                }, 2, 2000);
            } catch (error) {
                console.error(`Image failed for scene ${actualIndex + 1}:`, error);
                // Non-blocking error
            } finally {
                setImgCount(prev => prev + 1);
            }
          }));
        }
      };

      // Execute both flows concurrently (but internally sequential)
      await Promise.all([audioLoop(), imageLoop()]);

      // VALIDATION: Check if we have at least some data
      const validImages = results.filter(r => !!r.imageData).length;
      const validAudio = results.filter(r => !!r.audioBuffer).length;

      if (validImages === 0 && validAudio === 0) {
          setStatus("生成失败：未生成任何有效素材。请检查 API Key 配额或网络连接。");
          // Do NOT call onComplete, let user see the error
          return;
      }
      
      setStatus(`生成完毕: ${validImages}/${totalScenes} 张图片, ${validAudio}/${totalScenes} 条语音。正在保存...`);

      try {
          await saveCurrentProject(results, topic);
      } catch(e) {
          console.error("Final save failed", e);
      }

      setStatus("所有素材生成完毕！正在合成视频流...");
      
      // Small delay to let user see 100%
      setTimeout(() => {
        onComplete(results);
      }, 800);
    };

    generateAssets();
  }, [script, imageSize, onComplete, audioContext]);

  const totalScenes = script.length;
  // Calculate total progress percentage based on both tasks
  const totalTasks = totalScenes * 2;
  const completedTasks = imgCount + audioCount;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center max-w-2xl mx-auto p-8 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
        <div className="mb-8 relative w-24 h-24">
            <svg className="animate-spin w-full h-full text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-white text-lg">
                {progressPercent}%
            </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2 font-serif text-white">制作进行中</h2>
        <p className="text-blue-300 mb-8 text-base animate-pulse">{status}</p>
        
        {/* Detailed Progress Bars */}
        <div className="w-full space-y-4 px-8">
            {/* Image Progress */}
            <div>
                <div className="flex justify-between text-xs uppercase tracking-wider text-gray-400 mb-1">
                    <span>图像生成 (Gemini 3 Pro)</span>
                    <span>{imgCount} / {totalScenes}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div 
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${(imgCount / totalScenes) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Audio Progress */}
            <div>
                <div className="flex justify-between text-xs uppercase tracking-wider text-gray-400 mb-1">
                    <span>语音合成 (Flash TTS)</span>
                    <span>{audioCount} / {totalScenes}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${(audioCount / totalScenes) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AssetGenerator;