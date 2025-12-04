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
  const openingImgFolder = folder.folder("opening-images");

  // Process scenes: save assets and create modified scene data with file paths
  const modifiedScenes = scenes.map((scene) => {
    const sceneCopy: any = { ...scene };
    
    // Remove audioBuffer (not serializable) and Base64 data
    // IMPORTANT: Remove Base64 data to prevent browser crashes from loading large JSON files
    delete sceneCopy.audioBuffer;
    delete sceneCopy.videoData;  // Remove Base64 video data
    delete sceneCopy.imageData;  // Remove Base64 image data
    delete sceneCopy.audioData;  // Remove Base64 audio data
    
    // Save scene video (for scene 2) as file and update reference
    if (scene.sceneVideoData && videoFolder) {
      const sceneVideoFileName = `${scene.id + 1}_scene.mp4`;
      videoFolder.file(sceneVideoFileName, scene.sceneVideoData, { base64: true });
      // Use absolute path for Remotion (starts with /) to access public directory
      sceneCopy.sceneVideoFile = `/videos/${sceneVideoFileName}`;
      // Remove Base64 data
      delete sceneCopy.sceneVideoData;
    }
    
    // Save image as file and update reference
    if (scene.imageData && imgFolder) {
      const imageFileName = `${scene.id + 1}.png`;
      imgFolder.file(imageFileName, scene.imageData, { base64: true });
      // Use absolute path for Remotion (starts with /) to access public directory
      sceneCopy.imageFile = `/images/${imageFileName}`;
    }
    
    // Save opening images as files and update reference
    if (scene.openingImages && scene.openingImages.length > 0 && openingImgFolder) {
      const openingImageFiles: string[] = [];
      scene.openingImages.forEach((imageData, index) => {
        const openingImageFileName = `${scene.id + 1}_opening_${index + 1}.png`;
        openingImgFolder.file(openingImageFileName, imageData, { base64: true });
        // Use absolute path for Remotion (starts with /) to access public directory
        openingImageFiles.push(`/opening-images/${openingImageFileName}`);
      });
      sceneCopy.openingImageFiles = openingImageFiles;
      // Remove Base64 data
      delete sceneCopy.openingImages;
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
  const openingImgFolder = folder.folder("opening-images");
  const videoFolder = folder.folder("videos");

  scenes.forEach((scene) => {
    // Images
    if (scene.imageData && imgFolder) {
      // Base64 string to Blob
      imgFolder.file(`${scene.id + 1}.png`, scene.imageData, { base64: true });
    }

    // Opening Images
    if (scene.openingImages && scene.openingImages.length > 0 && openingImgFolder) {
      scene.openingImages.forEach((imageData, index) => {
        openingImgFolder.file(`${scene.id + 1}_opening_${index + 1}.png`, imageData, { base64: true });
      });
    }

    // Scene Video (for scene 2)
    if (scene.sceneVideoData && videoFolder) {
      videoFolder.file(`${scene.id + 1}_scene.mp4`, scene.sceneVideoData, { base64: true });
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

