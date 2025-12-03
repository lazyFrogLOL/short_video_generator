/**
 * Transition effects for scene changes
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

interface FadeTransitionProps {
  children: React.ReactNode;
  durationInFrames?: number; // Transition duration in frames
  type?: 'fade' | 'slide' | 'zoom';
}

/**
 * Fade transition - smooth fade in/out between scenes
 */
export const FadeTransition: React.FC<FadeTransitionProps> = ({ 
  children, 
  durationInFrames = 15, // 0.5 seconds at 30fps
  type = 'fade'
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: sceneDuration } = useVideoConfig();
  
  // Calculate opacity for fade in at start and fade out at end
  const fadeInOpacity = interpolate(
    frame,
    [0, durationInFrames],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.ease
    }
  );
  
  const fadeOutOpacity = interpolate(
    frame,
    [Math.max(0, sceneDuration - durationInFrames), sceneDuration],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.ease
    }
  );
  
  // Use the minimum of fade in and fade out (for scenes shorter than 2x transition duration)
  const opacity = Math.min(fadeInOpacity, fadeOutOpacity);
  
  // For slide effect
  const slideOffset = type === 'slide' 
    ? interpolate(
        frame,
        [0, durationInFrames],
        [50, 0],
        {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.ease
        }
      )
    : 0;
  
  // For zoom effect
  const zoomScale = type === 'zoom'
    ? interpolate(
        frame,
        [0, durationInFrames],
        [1.1, 1],
        {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.ease
        }
      )
    : 1;
  
  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateX(${slideOffset}px) scale(${zoomScale})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * Crossfade transition - smooth crossfade between two scenes
 */
export const CrossfadeTransition: React.FC<{
  children: React.ReactNode;
  previousChildren?: React.ReactNode;
  durationInFrames?: number;
}> = ({ 
  children, 
  previousChildren,
  durationInFrames = 15 
}) => {
  const frame = useCurrentFrame();
  
  const previousOpacity = interpolate(
    frame,
    [0, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.ease
    }
  );
  
  const currentOpacity = interpolate(
    frame,
    [0, durationInFrames],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.ease
    }
  );
  
  return (
    <AbsoluteFill>
      {previousChildren && (
        <AbsoluteFill style={{ opacity: previousOpacity }}>
          {previousChildren}
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ opacity: currentOpacity }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

