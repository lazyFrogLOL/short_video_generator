import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';

interface ChapterTitleDropProps {
  title: string;
  sceneIndex: number; // Which scene this title is for (1, 2, 3, ...)
}

export const ChapterTitleDrop: React.FC<ChapterTitleDropProps> = ({ title, sceneIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Timeline:
  // 0.0s - 0.3s: Black screen (reduced for faster transition)
  // 0.1s - 0.4s: Title drops down
  // 0.6s - 1.0s: Fade out smoothly (prepare for next scene)
  const BLACK_SCREEN_DURATION = fps * 0.3; // 0.3 seconds (reduced)
  const TITLE_DROP_START = fps * 0.1; // Start at 0.1s
  const TITLE_DROP_DURATION = fps * 0.3; // Takes 0.3s (faster)
  const FADE_OUT_START = fps * 0.6; // Start fading out at 0.6s (earlier)
  const FADE_OUT_DURATION = fps * 0.4; // Fade out takes 0.4s (smoother)
  const TOTAL_DURATION = fps * 1.0; // Total 1.0 seconds (reduced for faster pacing)
  
  // Spring animation for title drop (heavy impact effect)
  const dropAnimation = spring({
    frame: Math.max(0, frame - TITLE_DROP_START),
    fps,
    config: {
      damping: 12, // Damping: smaller = more bounce, 12 gives "heavy object" feel
      stiffness: 150, // Stiffness: larger = faster drop
      mass: 2, // Mass: larger = more inertia
    }
  });
  
  // Map spring animation to translateY: from -1200px (above screen) to 0 (center)
  const titleTranslateY = interpolate(
    dropAnimation,
    [0, 1],
    [-1200, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Title opacity: fade in as it drops, then fade out smoothly
  const titleOpacity = interpolate(
    frame,
    [TITLE_DROP_START, TITLE_DROP_START + 10, FADE_OUT_START, FADE_OUT_START + FADE_OUT_DURATION],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.4, 0, 0.2, 1) // Smooth bezier curve for natural fade
    }
  );
  
  // Show black screen for the first 0.5 seconds
  const showBlackScreen = frame < BLACK_SCREEN_DURATION;
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Black Screen Layer */}
      {showBlackScreen && (
        <AbsoluteFill style={{ backgroundColor: 'black', zIndex: 1 }} />
      )}
      
      {/* Chapter Title Drop Layer */}
      {frame >= TITLE_DROP_START && frame < FADE_OUT_START + FADE_OUT_DURATION && (
        <AbsoluteFill
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 5,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, calc(-50% + ${titleTranslateY}px))`,
              opacity: titleOpacity,
              width: '80%',
              textAlign: 'center'
            }}
          >
            <h1
              style={{
                color: '#FFD700', // Bright gold/yellow, eye-catching
                fontSize: '90px', // Large and impactful
                fontWeight: 900,
                fontFamily: '"Arial Black", system-ui, sans-serif',
                textShadow: '0 10px 30px rgba(0,0,0,0.9), 0 5px 15px rgba(0,0,0,0.7)', // Strong shadow for depth
                margin: 0,
                lineHeight: 1,
                letterSpacing: '2px'
              }}
            >
              {title}
            </h1>
          </div>
        </AbsoluteFill>
      )}
      
      {/* Heavy Impact Sound Effect */}
      <Audio 
        src={staticFile("heavy_impact.mp3")}
        startFrom={0}
        volume={0.8}
      />
    </AbsoluteFill>
  );
};

