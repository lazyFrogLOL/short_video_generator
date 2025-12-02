import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, useVideoConfig } from 'remotion';
import { Scene } from '../types';

interface MyCompositionProps {
  scenes: Scene[];
}

export const MyComposition: React.FC<MyCompositionProps> = ({ scenes }) => {
  const { fps } = useVideoConfig();
  
  let currentFrame = 0;

  if (!scenes || scenes.length === 0) {
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
        <h1 style={{ color: 'white', fontSize: 80 }}>No Scenes Data</h1>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {scenes.map((scene, index) => {
        // Determine duration for this scene
        // Prioritize actualDuration (from audio decoding), fallback to estimation
        const rawDuration = scene.actualDuration || scene.durationInSeconds || 5;
        
        // Adjust duration for 1.5x playback speed
        const playbackSpeed = 1.5;
        const effectiveDuration = rawDuration / playbackSpeed;
        
        const durationFrames = Math.ceil(effectiveDuration * fps);
        
        const startFrame = currentFrame;
        currentFrame += durationFrames;

        return (
            <Sequence
                key={scene.id}
                from={startFrame}
                durationInFrames={durationFrames}
            >
                {/* Visual Layer */}
                <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
                    {scene.imageData ? (
                        <Img 
                            src={`data:image/png;base64,${scene.imageData}`} 
                            style={{
                                width: '100%',
                                height: '85%', // Leave space for the caption at the bottom
                                objectFit: 'contain',
                                position: 'absolute',
                                top: 0
                            }}
                        />
                    ) : (
                        <div style={{ color: 'white', fontSize: 60 }}>
                            {scene.visual_description}
                        </div>
                    )}
                </AbsoluteFill>

                {/* Caption Layer (Bottom 10%) */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '15%', // Slightly larger than 10% for better readability
                    backgroundColor: '#0f172a', // slate-900
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '20px',
                    borderTop: '1px solid #1f2937',
                    zIndex: 10 // Ensure text is above image
                }}>
                    <p style={{
                        color: '#e2e8f0', // slate-200
                        fontSize: '40px',
                        fontFamily: 'sans-serif',
                        textAlign: 'center',
                        margin: 0,
                        lineHeight: 1.4
                    }}>
                        {scene.narration}
                    </p>
                </div>

                {/* Audio Layer - defaulting to mpeg (mp3) as most AI TTS returns mp3 */}
                {scene.audioData ? (
                    <Audio 
                        src={`data:audio/mpeg;base64,${scene.audioData}`} 
                        playbackRate={1.5} // Apply 1.5x speed to match Player preview
                    />
                ) : null}
            </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

