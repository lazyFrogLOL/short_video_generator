import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, useVideoConfig, staticFile, Video, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Scene } from '../../types';
import { FadeTransition } from './transitions';
import { ChapterTitleDrop } from './ChapterTitleDrop';

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

  // Chapter title drop duration: 1.5 seconds (increased for better visibility)
  const CHAPTER_TITLE_DURATION = fps * 1.5;
  
  // Pre-calculate all scene start frames to avoid closure issues in map
  let frameCounter = 0;
  const sceneTimings = scenes.map((scene, index) => {
    const rawDuration = scene.actualDuration || scene.durationInSeconds || 5;
    const playbackSpeed = 1.5;
    const effectiveDuration = rawDuration / playbackSpeed;
    // Add a small buffer (0.2 seconds) to ensure audio completes playback
    // This accounts for audio decoding precision and playback timing issues
    const durationFrames = Math.ceil((effectiveDuration + 0.2) * fps);
    
    let chapterTitleStartFrame: number | null = null;
    let sceneStartFrame: number;
    
    if (index === 0) {
      // First scene: no chapter title drop
      sceneStartFrame = frameCounter;
      frameCounter += durationFrames;
    } else {
      // Other scenes: chapter title drop first
      chapterTitleStartFrame = frameCounter;
      sceneStartFrame = frameCounter + CHAPTER_TITLE_DURATION;
      frameCounter = sceneStartFrame + durationFrames;
    }
    
    return {
      scene,
      index,
      durationFrames,
      chapterTitleStartFrame,
      sceneStartFrame
    };
  });
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {sceneTimings.map((timing) => {
        const { scene, index, durationFrames, chapterTitleStartFrame, sceneStartFrame } = timing;
        
        // Insert chapter title drop before each scene (except the first one)
        if (index > 0 && chapterTitleStartFrame !== null) {
          return (
            <React.Fragment key={`scene-${index}`}>
              {/* Chapter Title Drop Sequence */}
              <Sequence
                from={chapterTitleStartFrame}
                durationInFrames={CHAPTER_TITLE_DURATION}
              >
                <ChapterTitleDrop 
                  title={scene.title}
                  sceneIndex={index}
                />
              </Sequence>
              
              {/* Scene Content Sequence */}
              <Sequence
                key={scene.id}
                from={sceneStartFrame}
                durationInFrames={durationFrames}
              >
                <SceneContent 
                  scene={scene}
                  index={index}
                  durationFrames={durationFrames}
                  getImageSrc={getImageSrc}
                  getVideoSrc={getVideoSrc}
                  getAudioSrc={getAudioSrc}
                  transitionFrames={30} // Increased to 1 second for smoother transitions
                  transitionType={index % 4 === 0 ? 'fade' : index % 4 === 1 ? 'slide-left' : index % 4 === 2 ? 'zoom-fade' : 'blur-fade'}
                />
              </Sequence>
            </React.Fragment>
          );
        } else {
          // First scene: no chapter title drop
          return (
            <Sequence
              key={scene.id}
              from={sceneStartFrame}
              durationInFrames={durationFrames}
            >
              <SceneContent 
                scene={scene}
                index={index}
                durationFrames={durationFrames}
                getImageSrc={getImageSrc}
                getVideoSrc={getVideoSrc}
                getAudioSrc={getAudioSrc}
                transitionFrames={30} // Increased to 1 second for smoother transitions
                transitionType="fade"
              />
            </Sequence>
          );
        }
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
  transitionType: 'fade' | 'slide-left' | 'zoom-fade' | 'blur-fade';
}> = ({ scene, index, durationFrames, getImageSrc, getVideoSrc, getAudioSrc, transitionFrames, transitionType }) => {
  const frame = useCurrentFrame(); // This is relative to the Sequence
  const { fps } = useVideoConfig();
  
  // Ken Burns Effect: Slow zoom in/out for static images to keep them "breathing"
  // This prevents the "dead image" feeling in short videos
  const kenBurnsScale = interpolate(
    frame,
    [0, durationFrames],
    [1, 1.08], // Slowly zoom from 1x to 1.08x (subtle but noticeable)
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.ease
    }
  );
  
  // Optional: Add subtle pan effect (can be enabled if needed)
  // const kenBurnsX = interpolate(
  //   frame,
  //   [0, durationFrames],
  //   [0, 2], // Slight horizontal pan
  //   { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.ease }
  // );
  
  // Typewriter Effect: Calculate how many characters to show based on current frame
  // Show text gradually over a longer duration based on text length and scene duration
  const textLength = scene.narration.length;
  // Calculate typing duration: 
  // - Base: 3 seconds minimum, or 80% of scene duration (whichever is longer)
  // - Add extra time for longer text: 0.1 seconds per character after 20 chars
  const baseDuration = Math.max(durationFrames * 0.8, fps * 3); // At least 3 seconds or 80% of scene
  const extraDuration = Math.max(0, (textLength - 20) * fps * 0.1); // 0.1s per char after 20 chars
  const typewriterDuration = Math.min(baseDuration + extraDuration, durationFrames * 0.95); // Max 95% of scene
  
  const charProgress = interpolate(
    frame,
    [0, typewriterDuration],
    [0, textLength],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.ease
    }
  );
  const visibleText = scene.narration.substring(0, Math.floor(charProgress));
  
  return (
    <>
      {/* Visual Layer with Transition */}
      {/* Skip fade in for first scene (index 0) - show immediately */}
      <FadeTransition 
        durationInFrames={transitionFrames} 
        type={transitionType}
        skipFadeIn={index === 0}
      >
                    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'black', overflow: 'hidden' }}>
                        {/* For first scene (index 0), use fixed video file */}
                        {/* Video will automatically loop until Sequence duration (based on audio) ends */}
                        {index === 0 ? (
                            <>
                                <Video 
                                    src={staticFile("video/formal.mp4")}
                                    style={{
                                        width: '100%',
                                        height: '100%', // Full screen display
                                        objectFit: 'cover',
                                        position: 'absolute',
                                        top: 0
                                    }}
                                    // Note: Remotion Video automatically loops within Sequence duration
                                    // The Sequence duration is calculated from audio length, so video will
                                    // loop until audio finishes playing
                                />
                                
                                {/* Opening Images Carousel */}
                                {(() => {
                                  // Support both Base64 (openingImages) and file paths (openingImageFiles)
                                  const openingImages = scene.openingImageFiles || scene.openingImages;
                                  if (!openingImages || openingImages.length === 0) return null;
                                  
                                  const delayFrames = fps * 2; // 2 second delay before starting
                                  const imageDuration = fps * 2; // 2 second per image
                                  const fadeFrames = fps * 0.3; // 0.3 second fade transition
                                  
                                  return (
                                    <>
                                      {/* Image container positioned at 1/3 from top, 16:9 aspect ratio */}
                                      <AbsoluteFill
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'center',
                                          alignItems: 'flex-start',
                                          paddingTop: '33.33%', // 1/3 from top
                                          pointerEvents: 'none',
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: '100%',
                                            aspectRatio: '16/9',
                                            position: 'relative',
                                            overflow: 'visible', // Changed to visible to show glow effects
                                            borderRadius: '12px',
                                            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.8), 0 0 60px rgba(255, 255, 255, 0.1)',
                                            border: '2px solid rgba(255, 255, 255, 0.2)',
                                          }}
                                        >
                                          {openingImages.map((imageSrc, imgIndex) => {
                                            const imageStartFrame = delayFrames + imgIndex * imageDuration;
                                            const imageEndFrame = delayFrames + (imgIndex + 1) * imageDuration;
                                            const imageMidFrame = (imageStartFrame + imageEndFrame) / 2;
                                            
                                            // Calculate opacity with more dramatic fade
                                            const opacity = interpolate(
                                              frame,
                                              [
                                                imageStartFrame,
                                                imageStartFrame + fadeFrames * 0.5,
                                                imageEndFrame - fadeFrames * 0.5,
                                                imageEndFrame
                                              ],
                                              [0, 1, 1, 0],
                                              {
                                                extrapolateLeft: 'clamp',
                                                extrapolateRight: 'clamp',
                                                easing: Easing.out(Easing.cubic) // More dramatic easing
                                              }
                                            );
                                            
                                            // Dramatic zoom in effect: start from 1.3x, zoom to 1.0x, then back to 1.1x
                                            const zoomInFrames = fps * 0.4; // Fast zoom in
                                            const scale = interpolate(
                                              frame,
                                              [
                                                imageStartFrame,
                                                imageStartFrame + zoomInFrames,
                                                imageMidFrame,
                                                imageEndFrame - fadeFrames,
                                                imageEndFrame
                                              ],
                                              [1.3, 1.0, 1.0, 1.05, 1.1],
                                              {
                                                extrapolateLeft: 'clamp',
                                                extrapolateRight: 'clamp',
                                                easing: Easing.out(Easing.back(1.5)) // Bounce effect
                                              }
                                            );
                                            
                                            // Subtle rotation for dramatic effect
                                            const rotation = interpolate(
                                              frame,
                                              [
                                                imageStartFrame,
                                                imageStartFrame + zoomInFrames,
                                                imageEndFrame
                                              ],
                                              [5, 0, -2], // Start slightly rotated, then straighten
                                              {
                                                extrapolateLeft: 'clamp',
                                                extrapolateRight: 'clamp',
                                                easing: Easing.out(Easing.cubic)
                                              }
                                            );
                                            
                                            // Glow intensity for dramatic entrance
                                            const glowIntensity = interpolate(
                                              frame,
                                              [
                                                imageStartFrame,
                                                imageStartFrame + zoomInFrames,
                                                imageEndFrame - fadeFrames,
                                                imageEndFrame
                                              ],
                                              [1.5, 0.3, 0.3, 0],
                                              {
                                                extrapolateLeft: 'clamp',
                                                extrapolateRight: 'clamp',
                                                easing: Easing.out(Easing.cubic)
                                              }
                                            );
                                            
                                            // Determine image source: Base64 or file path
                                            const imgSrc = scene.openingImageFiles 
                                              ? getImageSrc(imageSrc) // File path
                                              : `data:image/png;base64,${imageSrc}`; // Base64
                                            
                                            return (
                                              <Img
                                                key={imgIndex}
                                                src={imgSrc}
                                                style={{
                                                  position: 'absolute',
                                                  top: 0,
                                                  left: 0,
                                                  width: '100%',
                                                  height: '100%',
                                                  objectFit: 'cover',
                                                  opacity: opacity,
                                                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                                                  transformOrigin: 'center center',
                                                  filter: `drop-shadow(0 0 ${20 * glowIntensity}px rgba(255, 255, 255, ${0.6 * glowIntensity})) drop-shadow(0 0 ${40 * glowIntensity}px rgba(255, 255, 255, ${0.4 * glowIntensity}))`,
                                                  transition: 'all 0.1s ease-out',
                                                }}
                                              />
                                            );
                                          })}
                                        </div>
                                      </AbsoluteFill>
                                      
                                      {/* Click sound effects at transitions */}
                                      {openingImages.map((_, imgIndex) => {
                                        if (imgIndex === 0) return null; // Skip first image (no transition before it)
                                        const transitionFrame = delayFrames + imgIndex * imageDuration;
                                        
                                        return (
                                          <Sequence
                                            key={`click-${imgIndex}`}
                                            from={transitionFrame}
                                            durationInFrames={1}
                                          >
                                            <Audio
                                              src={staticFile("click.wav")}
                                              volume={1}
                                            />
                                          </Sequence>
                                        );
                                      })}
                                    </>
                                  );
                                })()}
                            </>
                        ) : index === 1 && (scene.sceneVideoData || scene.sceneVideoFile) ? (
                            // Scene 2: Show video first (5 seconds), then image
                            (() => {
                              const videoDuration = fps * 5; // 5 seconds video
                              const isVideoPhase = frame < videoDuration;
                              const imagePhaseFrame = frame - videoDuration; // Frame relative to image phase start
                              const imagePhaseDuration = durationFrames - videoDuration; // Duration of image phase
                              
                              // Ken Burns effect for image phase only
                              const imageKenBurnsScale = interpolate(
                                imagePhaseFrame,
                                [0, imagePhaseDuration],
                                [1, 1.08],
                                {
                                  extrapolateLeft: 'clamp',
                                  extrapolateRight: 'clamp',
                                  easing: Easing.ease
                                }
                              );
                              
                              const videoSrc = scene.sceneVideoFile 
                                ? getVideoSrc(scene.sceneVideoFile)
                                : `data:video/mp4;base64,${scene.sceneVideoData}`;
                              
                              return (
                                <>
                                  {/* Video phase: 0-5 seconds */}
                                  {isVideoPhase && (
                                    <Video 
                                      src={videoSrc}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        position: 'absolute',
                                        top: 0
                                      }}
                                    />
                                  )}
                                  
                                  {/* Image phase: after 5 seconds */}
                                  {!isVideoPhase && (
                                    <>
                                      {scene.imageFile ? (
                                        <Img 
                                          src={getImageSrc(scene.imageFile)}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            position: 'absolute',
                                            top: 0,
                                            transform: `scale(${imageKenBurnsScale})`,
                                            transformOrigin: 'center center'
                                          }}
                                        />
                                      ) : scene.imageData ? (
                                        <Img 
                                          src={`data:image/png;base64,${scene.imageData}`} 
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            position: 'absolute',
                                            top: 0,
                                            transform: `scale(${imageKenBurnsScale})`,
                                            transformOrigin: 'center center'
                                          }}
                                        />
                                      ) : null}
                                    </>
                                  )}
                                </>
                              );
                            })()
                        ) : scene.videoFile ? (
                            // Use video file path if available (for exported projects)
                            <Video 
                                src={getVideoSrc(scene.videoFile)}
                                style={{
                                    width: '100%',
                                    height: '100%', // Full screen display
                                    objectFit: 'cover',
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
                                    height: '100%', // Full screen display
                                    objectFit: 'cover', // Changed to 'cover' for better Ken Burns effect
                                    position: 'absolute',
                                    top: 0,
                                    // Ken Burns Effect: Slow zoom in
                                    transform: `scale(${kenBurnsScale})`,
                                    transformOrigin: 'center center'
                                }}
                            />
                        ) : scene.imageData ? (
                            // Fallback to Base64 data
                            <Img 
                                src={`data:image/png;base64,${scene.imageData}`} 
                                style={{
                                    width: '100%',
                                    height: '100%', // Full screen display
                                    objectFit: 'cover', // Changed to 'cover' for better Ken Burns effect
                                    position: 'absolute',
                                    top: 0,
                                    // Ken Burns Effect: Slow zoom in
                                    transform: `scale(${kenBurnsScale})`,
                                    transformOrigin: 'center center'
                                }}
                            />
                        ) : (
                            <div style={{ color: 'white', fontSize: 60 }}>
                                {scene.visual_description}
                            </div>
                        )}
                    </AbsoluteFill>
                </FadeTransition>

                {/* Caption Layer - Immersive Overlay Style (No black background) */}
                <div style={{
                    position: 'absolute',
                    top: '70%', // Positioned at bottom 30% (moved up from bottom edge)
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '90%',
                    textAlign: 'center',
                    zIndex: 20, // Ensure text is above image
                    pointerEvents: 'none' // Don't block interactions
                }}>
                    <p style={{
                        color: '#FFFFFF',
                        fontSize: '55px', // Larger font size for better visibility
                        fontWeight: 900, // Extra bold for impact
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        margin: 0,
                        lineHeight: 1.2,
                        // Strong text stroke/shadow to ensure readability on any background
                        textShadow: `
                            3px 3px 0 #000,
                            -1px -1px 0 #000,
                            1px -1px 0 #000,
                            -1px 1px 0 #000,
                            1px 1px 0 #000,
                            0 0 10px rgba(0, 0, 0, 0.8)
                        `,
                        // Additional stroke effect via webkit-text-stroke (if supported)
                        WebkitTextStroke: '2px #000'
                    }}>
                        {visibleText}
                        {/* Blinking cursor effect */}
                        {Math.floor(charProgress) < textLength && (
                            <span style={{
                                display: 'inline-block',
                                width: '4px',
                                height: '55px',
                                backgroundColor: '#FFFFFF',
                                marginLeft: '4px',
                                opacity: interpolate(
                                    frame % (fps * 1), // 1 second cycle
                                    [0, fps * 0.5 - 0.1, fps * 0.5 + 0.1, fps * 1],
                                    [1, 1, 0, 0],
                                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                                )
                            }} />
                        )}
                    </p>
                </div>

                        {/* Audio Layer - defaulting to mpeg (mp3) as most AI TTS returns mp3 */}
                        {scene.audioFile ? (
                            // Use file path if available (for exported projects)
                            <Audio 
                                src={getAudioSrc(scene.audioFile)}
                                playbackRate={1.5} // Apply 1.5x speed to match Player preview
                            />
                        ) : scene.audioData ? (
                            // Fallback to Base64 data
                            <Audio 
                                src={`data:audio/mpeg;base64,${scene.audioData}`} 
                                playbackRate={1.5} // Apply 1.5x speed to match Player preview
                            />
                        ) : null}
    </>
  );
};

