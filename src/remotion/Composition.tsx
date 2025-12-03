import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, useVideoConfig, staticFile, Video, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Scene } from '../../types';
import { FadeTransition } from './transitions';

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

  // Helper functions to convert file paths to staticFile format
  // If path starts with /, remove it and use staticFile (for public directory)
  // Otherwise use as-is (might be a URL or relative path)
  const getImageSrc = (path: string | undefined) => {
    if (!path) return undefined;
    if (path.startsWith('/')) {
      return staticFile(path.substring(1));
    }
    return path;
  };

  const getAudioSrc = (path: string | undefined) => {
    if (!path) return undefined;
    if (path.startsWith('/')) {
      return staticFile(path.substring(1));
    }
    return path;
  };

  const getVideoSrc = (path: string | undefined) => {
    if (!path) return undefined;
    if (path.startsWith('/')) {
      return staticFile(path.substring(1));
    }
    return path;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {scenes.map((scene, index) => {
        // Determine duration for this scene
        // Prioritize actualDuration (from audio decoding), fallback to estimation
        // IMPORTANT: For scene 0 (first scene), duration is based on audio length
        // The fixed video (formal.mp4) will loop automatically until audio finishes
        const rawDuration = scene.actualDuration || scene.durationInSeconds || 5;
        
        // Adjust duration for 1.5x playback speed
        const playbackSpeed = 1.5;
        const effectiveDuration = rawDuration / playbackSpeed;
        
        const durationFrames = Math.ceil(effectiveDuration * fps);
        
        const startFrame = currentFrame;
        currentFrame += durationFrames;

        // Transition duration: 0.5 seconds (15 frames at 30fps)
        const transitionFrames = 15;
        
        return (
            <Sequence
                key={scene.id}
                from={startFrame}
                durationInFrames={durationFrames}
            >
                <SceneContent 
                    scene={scene}
                    index={index}
                    durationFrames={durationFrames}
                    getImageSrc={getImageSrc}
                    getVideoSrc={getVideoSrc}
                    getAudioSrc={getAudioSrc}
                    transitionFrames={transitionFrames}
                />
            </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Separate component to use hooks properly within Sequence
const SceneContent: React.FC<{
  scene: Scene;
  index: number;
  durationFrames: number;
  getImageSrc: (path: string | undefined) => string | undefined;
  getVideoSrc: (path: string | undefined) => string | undefined;
  getAudioSrc: (path: string | undefined) => string | undefined;
  transitionFrames: number;
}> = ({ scene, index, durationFrames, getImageSrc, getVideoSrc, getAudioSrc, transitionFrames }) => {
  const frame = useCurrentFrame(); // This is relative to the Sequence
  
  return (
    <>
      {/* Visual Layer with Transition */}
      <FadeTransition durationInFrames={transitionFrames} type="fade">
                    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
                        {/* For first scene (index 0), use fixed video file */}
                        {/* Video will automatically loop until Sequence duration (based on audio) ends */}
                        {index === 0 ? (
                            <Video 
                                src={staticFile("video/formal.mp4")}
                                style={{
                                    width: '100%',
                                    height: '85%', // Leave space for the caption at the bottom
                                    objectFit: 'contain',
                                    position: 'absolute',
                                    top: 0
                                }}
                                // Note: Remotion Video automatically loops within Sequence duration
                                // The Sequence duration is calculated from audio length, so video will
                                // loop until audio finishes playing
                            />
                        ) : scene.videoFile ? (
                            // Use video file path if available (for exported projects)
                            <Video 
                                src={getVideoSrc(scene.videoFile)}
                                style={{
                                    width: '100%',
                                    height: '85%', // Leave space for the caption at the bottom
                                    objectFit: 'contain',
                                    position: 'absolute',
                                    top: 0
                                }}
                            />
                        ) : scene.imageFile ? (
                            // Use file path if available (for exported projects)
                            <Img 
                                src={getImageSrc(scene.imageFile)}
                                style={{
                                    width: '100%',
                                    height: '85%', // Leave space for the caption at the bottom
                                    objectFit: 'contain',
                                    position: 'absolute',
                                    top: 0
                                }}
                            />
                        ) : scene.imageData ? (
                            // Fallback to Base64 data
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
                </FadeTransition>

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

                        {/* Audio Layer with fade in/out - defaulting to mpeg (mp3) as most AI TTS returns mp3 */}
                        {scene.audioFile ? (
                            // Use file path if available (for exported projects)
                            <Audio 
                                src={getAudioSrc(scene.audioFile)}
                                playbackRate={1.5} // Apply 1.5x speed to match Player preview
                                volume={(frame) => {
                                    // Fade in at start (first 15 frames = 0.5s)
                                    const fadeIn = interpolate(
                                        frame,
                                        [0, 15],
                                        [0, 1],
                                        {
                                            extrapolateLeft: 'clamp',
                                            extrapolateRight: 'clamp',
                                            easing: Easing.ease
                                        }
                                    );
                                    // Fade out at end (last 15 frames)
                                    const fadeOut = interpolate(
                                        frame,
                                        [Math.max(0, durationFrames - 15), durationFrames],
                                        [1, 0],
                                        {
                                            extrapolateLeft: 'clamp',
                                            extrapolateRight: 'clamp',
                                            easing: Easing.ease
                                        }
                                    );
                                    return Math.min(fadeIn, fadeOut);
                                }}
                            />
                        ) : scene.audioData ? (
                            // Fallback to Base64 data
                            <Audio 
                                src={`data:audio/mpeg;base64,${scene.audioData}`} 
                                playbackRate={1.5} // Apply 1.5x speed to match Player preview
                                volume={(frame) => {
                                    // Fade in at start (first 15 frames = 0.5s)
                                    const fadeIn = interpolate(
                                        frame,
                                        [0, 15],
                                        [0, 1],
                                        {
                                            extrapolateLeft: 'clamp',
                                            extrapolateRight: 'clamp',
                                            easing: Easing.ease
                                        }
                                    );
                                    // Fade out at end (last 15 frames)
                                    const fadeOut = interpolate(
                                        frame,
                                        [Math.max(0, durationFrames - 15), durationFrames],
                                        [1, 0],
                                        {
                                            extrapolateLeft: 'clamp',
                                            extrapolateRight: 'clamp',
                                            easing: Easing.ease
                                        }
                                    );
                                    return Math.min(fadeIn, fadeOut);
                                }}
                            />
                        ) : null}
    </>
  );
};

