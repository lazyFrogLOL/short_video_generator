import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Scene } from '../types';

/**
 * Export Remotion data with assets cached as local files
 * Creates a ZIP containing:
 * - remotion-data.json (with file path references instead of Base64)
 * - images/ folder (all scene images as PNG files)
 * - videos/ folder (scene 1 video as MP4 file)
 * - audio/ folder (all scene audio as WAV/MP3 files)
 */
export const exportRemotionWithAssets = async (scenes: Scene[], topic: string = "video_project") => {
  const zip = new JSZip();
  const folderName = topic.replace(/\s+/g, '_') || 'project';
  
  // Create a folder for the project
  const folder = zip.folder(folderName);
  if (!folder) return;

  // Create subfolders for assets
  const imgFolder = folder.folder("images");
  const videoFolder = folder.folder("videos");
  const audioFolder = folder.folder("audio");

  // Process scenes: save assets and create modified scene data with file paths
  const modifiedScenes = scenes.map((scene) => {
    const sceneCopy: any = { ...scene };
    
    // Remove audioBuffer (not serializable) and Base64 data
    // IMPORTANT: Remove Base64 data to prevent browser crashes from loading large JSON files
    delete sceneCopy.audioBuffer;
    delete sceneCopy.videoData;  // Remove Base64 video data
    delete sceneCopy.imageData;  // Remove Base64 image data
    delete sceneCopy.audioData;  // Remove Base64 audio data
    
    
    // Save image as file and update reference
    if (scene.imageData && imgFolder) {
      const imageFileName = `${scene.id + 1}.png`;
      imgFolder.file(imageFileName, scene.imageData, { base64: true });
      // Use absolute path for Remotion (starts with /) to access public directory
      sceneCopy.imageFile = `/images/${imageFileName}`;
    }
    
    // Save audio as file and update reference
    if (scene.audioData && audioFolder) {
      // Determine file extension based on audio format
      // Poe returns MP3, but we'll use .mp3 extension
      const audioFileName = `${scene.id + 1}.mp3`;
      audioFolder.file(audioFileName, scene.audioData, { base64: true });
      // Use absolute path for Remotion (starts with /) to access public directory
      sceneCopy.audioFile = `/audio/${audioFileName}`;
    }
    
    return sceneCopy;
  });

  // Create Remotion data with file references
  const remotionData = { scenes: modifiedScenes };
  folder.file("remotion-data.json", JSON.stringify(remotionData, null, 2));

  // Generate and download ZIP
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${folderName}_remotion_with_assets.zip`);
};

export const downloadAssetsAsZip = async (scenes: Scene[], topic: string = "video_project") => {
  const zip = new JSZip();
  const folderName = topic.replace(/\s+/g, '_') || 'project';
  
  // Create a folder for the project
  const folder = zip.folder(folderName);
  if (!folder) return;

  const scriptData = scenes.map(s => ({
    id: s.id,
    title: s.title,
    narration: s.narration,
    duration: s.durationInSeconds,
    visual: s.visual_description,
    imageFile: `images/${s.id + 1}.png`,
    audioFile: `audio/${s.id + 1}.wav`
  }));

  // 1. Add Script JSON
  folder.file("script.json", JSON.stringify(scriptData, null, 2));

  // 2. Add Remotion Data (for direct use with Remotion)
  // Wrap in object { scenes: [...] }
  const remotionData = { scenes: scenes };
  folder.file("remotion-data.json", JSON.stringify(remotionData, null, 2));

  // 3. Add Assets
  const imgFolder = folder.folder("images");
  const audioFolder = folder.folder("audio");

  scenes.forEach((scene) => {
    // Images
    if (scene.imageData && imgFolder) {
      // Base64 string to Blob
      imgFolder.file(`${scene.id + 1}.png`, scene.imageData, { base64: true });
    }

    // Audio
    if (scene.audioData && audioFolder) {
       // audioData is Base64 WAV (from createWavFile)
       audioFolder.file(`${scene.id + 1}.wav`, scene.audioData, { base64: true });
    }
  });

  // 4. Generate ZIP
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${folderName}_assets.zip`);
};

