import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Scene } from '../types';

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

