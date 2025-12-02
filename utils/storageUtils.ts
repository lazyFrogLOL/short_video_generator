import { openDB, DBSchema } from 'idb';
import { Scene } from '../types';

interface VideoProjectDB extends DBSchema {
  projects: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      topic: string;
      scenes: Scene[];
    };
  };
}

const DB_NAME = 'autodrive-visual-academy-db';
const STORE_NAME = 'projects';
const CURRENT_PROJECT_KEY = 'current_project';

export const initDB = async () => {
  return openDB<VideoProjectDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

export const saveCurrentProject = async (scenes: Scene[], topic: string) => {
  const db = await initDB();
  
  // Remove AudioBuffer as it is not serializable to IDB
  const serializableScenes = scenes.map(({ audioBuffer, ...rest }) => rest);

  await db.put(STORE_NAME, {
    id: CURRENT_PROJECT_KEY,
    timestamp: Date.now(),
    topic,
    scenes: serializableScenes,
  });
};

export const loadCurrentProject = async () => {
  const db = await initDB();
  return db.get(STORE_NAME, CURRENT_PROJECT_KEY);
};

export const clearCurrentProject = async () => {
  const db = await initDB();
  await db.delete(STORE_NAME, CURRENT_PROJECT_KEY);
};

