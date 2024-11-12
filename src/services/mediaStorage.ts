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

export async function saveMedia(key: string, file: File) {
  const db = await initDB();
  await db.put(STORE_NAME, file, key);
}

export async function getMedia(key: string): Promise<File | null> {
  const db = await initDB();
  return db.get(STORE_NAME, key);
}

export async function deleteMedia(key: string) {
  const db = await initDB();
  await db.delete(STORE_NAME, key);
} 