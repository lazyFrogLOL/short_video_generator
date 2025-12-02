export interface Scene {
  id: number;
  title: string;
  visual_description: string;
  narration: string;
  durationInSeconds: number;
  imageData?: string; // Base64
  audioBuffer?: AudioBuffer; // Decoded audio
  audioData?: string; // Base64 audio for export
  actualDuration?: number; // Actual duration of the generated audio in seconds
}

export interface StoryboardResponse {
  scenes: {
    title: string;
    visual_description: string;
    narration: string;
    durationInSeconds: number;
  }[];
}

export type ImageSize = "1K" | "2K" | "4K";

export type AppState = 'IDLE' | 'GENERATING_SCRIPT' | 'REVIEW_SCRIPT' | 'GENERATING_ASSETS' | 'PLAYING' | 'FINISHED';