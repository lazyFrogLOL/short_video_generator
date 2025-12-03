/**
 * Transition effects for scene changes
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

type TransitionType = 
  | 'fade'           // Simple fade in/out
  | 'slide-left'    // Slide from right to left
  | 'slide-right'   // Slide from left to right
  | 'slide-up'      // Slide from bottom to top
  | 'slide-down'    // Slide from top to bottom
  | 'zoom-in'       // Zoom in from 1.1x to 1x
  | 'zoom-out'      // Zoom out from 0.9x to 1x
  | 'zoom-fade'     // Combined zoom and fade
  | 'blur-fade'     // Blur + fade effect
  | 'rotate-fade';  // Rotate + fade effect

interface FadeTransitionProps {
  children: React.ReactNode;
  durationInFrames?: number; // Transition duration in frames
  type?: TransitionType;
  skipFadeIn?: boolean; // Skip fade in effect (for first scene)
}

/**
 * Fade transition - smooth fade in/out between scenes
 */
export const FadeTransition: React.FC<FadeTransitionProps> = ({ 
  children, 
  durationInFrames = 15, // 0.5 seconds at 30fps
  type = 'fade',
  skipFadeIn = false // Default to false, enable fade in
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: sceneDuration } = useVideoConfig();
  
  // Calculate opacity for fade in at start and fade out at end
  const fadeInOpacity = skipFadeIn 
    ? 1 // Skip fade in, start at full opacity
    : interpolate(
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
  
  // Calculate transition progress (0 to 1)
  const transitionProgress = skipFadeIn 
    ? 1 
    : Math.min(1, frame / durationInFrames);
  
  // Slide effects
  let translateX = 0;
  let translateY = 0;
  
  if (type === 'slide-left') {
    translateX = interpolate(
      transitionProgress,
      [0, 1],
      [100, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
    );
  } else if (type === 'slide-right') {
    translateX = interpolate(
      transitionProgress,
      [0, 1],
      [-100, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
    );
  } else if (type === 'slide-up') {
    translateY = interpolate(
      transitionProgress,
      [0, 1],
      [100, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
    );
  } else if (type === 'slide-down') {
    translateY = interpolate(
      transitionProgress,
      [0, 1],
      [-100, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
    );
  }
  
  // Zoom effects
  let scale = 1;
  if (type === 'zoom-in' || type === 'zoom-fade') {
    scale = interpolate(
      transitionProgress,
      [0, 1],
      [1.15, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
    );
  } else if (type === 'zoom-out') {
    scale = interpolate(
      transitionProgress,
      [0, 1],
      [0.85, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
    );
  }
  
  // Rotate effect
  let rotate = 0;
  if (type === 'rotate-fade') {
    rotate = interpolate(
      transitionProgress,
      [0, 1],
      [-5, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
    );
  }
  
  // Blur effect (for blur-fade)
  const blur = type === 'blur-fade'
    ? interpolate(
        transitionProgress,
        [0, 1],
        [10, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
      )
    : 0;
  
  // Build transform string
  const transformParts: string[] = [];
  if (translateX !== 0) transformParts.push(`translateX(${translateX}px)`);
  if (translateY !== 0) transformParts.push(`translateY(${translateY}px)`);
  if (scale !== 1) transformParts.push(`scale(${scale})`);
  if (rotate !== 0) transformParts.push(`rotate(${rotate}deg)`);
  
  const transforms = transformParts.length > 0 ? transformParts.join(' ') : undefined;
  
  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: transforms || undefined,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
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

