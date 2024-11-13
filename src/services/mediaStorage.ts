import { openDB } from 'idb';

const DB_NAME = 'mediaStore';
const STORE_NAME = 'media';
const VERSION = 1;

const initDB = async () => {
  return openDB(DB_NAME, VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
};

export async function saveMedia(key: string, file: File): Promise<void> {
  try {
    const db = await initDB();
    await db.put(STORE_NAME, file, key);
  } catch (error) {
    console.error('Error saving media:', error);
    throw error;
  }
}

export async function getMedia(key: string): Promise<File | null> {
  try {
    const db = await initDB();
    return await db.get(STORE_NAME, key);
  } catch (error) {
    console.error('Error getting media:', error);
    return null;
  }
}

export async function deleteMedia(key: string): Promise<void> {
  try {
    const db = await initDB();
    await db.delete(STORE_NAME, key);
  } catch (error) {
    console.error('Error deleting media:', error);
    throw error;
  }
} 