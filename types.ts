export interface Scene {
  id: number;
  title: string;
  visual_description: string;
  narration: string;
  durationInSeconds: number;
  imageData?: string; // Base64
  imageFile?: string; // File path reference (for exported projects)
  videoData?: string; // Base64 video (for scene 1)
  videoFile?: string; // File path reference (for exported projects)
  audioBuffer?: AudioBuffer; // Decoded audio
  audioData?: string; // Base64 audio for export
  audioFile?: string; // File path reference (for exported projects)
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