import React from 'react';
import { Composition, getInputProps } from 'remotion';
import { MyComposition } from './Composition';
import { Scene } from '../types';

export const RemotionRoot: React.FC = () => {
  // Allow passing data via CLI input props or fallback to default/empty
  const inputProps = getInputProps();
  
  // Handle both Array input (legacy/direct) and Object input { scenes: [...] }
  let scenes: Scene[] = [];
  if (Array.isArray(inputProps)) {
      scenes = inputProps as Scene[];
  } else if (inputProps && Array.isArray(inputProps.scenes)) {
      scenes = inputProps.scenes as Scene[];
  }

  // Calculate total duration based on scenes
  const fps = 30;
  const CHAPTER_TITLE_DURATION = 1.0; // 1.0 seconds per chapter title drop
  const totalDurationInSeconds = scenes.reduce((acc, scene, index) => {
    // Important: Duration must account for playback speed (1.5x)
    // actualDuration is the raw audio length. 
    // If we play at 1.5x speed, the visible duration is raw / 1.5
    const rawDuration = scene.actualDuration || scene.durationInSeconds || 5;
    const playbackSpeed = 1.5;
    const effectiveDuration = rawDuration / playbackSpeed;
    
    // Add chapter title drop duration for all scenes except the first one
    const chapterTitleDuration = index > 0 ? CHAPTER_TITLE_DURATION : 0;
    
    return acc + effectiveDuration + chapterTitleDuration;
  }, 0);
  
  // Ensure at least 1 frame to avoid errors if empty
  // Add a small buffer (e.g., 1 second / 30 frames) to prevent premature cutoff
  // Audio decoding or rounding errors often cause the last frame to drop.
  const durationInFrames = Math.max(1, Math.ceil(totalDurationInSeconds * fps) + 30);

  return (
    <>
      <Composition
        id="MyVideo"
        component={MyComposition}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: scenes,
        }}
      />
    </>
  );
};

