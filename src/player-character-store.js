const DB_NAME = 'naija-city-player-assets';
const DB_VERSION = 1;
const STORE_NAME = 'characters';
const DEFAULT_KEY = 'default-player';

function openDatabase() {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error('This browser does not support local character storage.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error('Could not open local character storage.'));
  });
}

export async function loadSavedPlayerCharacter() {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(DEFAULT_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Could not read the saved character.'));
    });
  } finally {
    db.close();
  }
}

export async function savePlayerCharacter(buffer, metadata = {}) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20) {
    throw new Error('The converted character file is empty or invalid.');
  }
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({
        buffer: buffer.slice(0),
        metadata: { ...metadata },
        savedAt: new Date().toISOString()
      }, DEFAULT_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not save the character.'));
      tx.onabort = () => reject(tx.error || new Error('Character save was cancelled.'));
    });
  } finally {
    db.close();
  }
}

export async function clearSavedPlayerCharacter() {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(DEFAULT_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not clear the character.'));
      tx.onabort = () => reject(tx.error || new Error('Character reset was cancelled.'));
    });
  } finally {
    db.close();
  }
}
