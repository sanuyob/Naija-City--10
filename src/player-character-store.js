const DB_NAME = 'naija-city-player-assets';
const DB_VERSION = 1;
const STORE_NAME = 'characters';
const ARA_KEY = 'ara-female';
const LEGACY_KEY = 'default-player';
const ACTIVE_KEY = 'active-player';
const DEFAULT_CHARACTER_ID = 'ara-female';

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

function readKey(db, key) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error || new Error('Could not read player storage.'));
  });
}

export async function loadSavedPlayerCharacter(characterId = 'ara-female') {
  const db = await openDatabase();
  try {
    const saved = await readKey(db, characterId === 'ara-female' ? ARA_KEY : characterId);
    // Existing installs saved Ara under default-player before the roster existed.
    if (saved || characterId !== 'ara-female') return saved;
    return await readKey(db, LEGACY_KEY);
  } finally {
    db.close();
  }
}

export async function hasSavedPlayerCharacter(characterId = 'ara-female') {
  const saved = await loadSavedPlayerCharacter(characterId);
  return !!(saved?.buffer instanceof ArrayBuffer && saved.buffer.byteLength > 20);
}

export async function getActivePlayerCharacter() {
  const db = await openDatabase();
  try {
    const saved = await readKey(db, ACTIVE_KEY);
    return DEFAULT_CHARACTER_ID;
  } finally {
    db.close();
  }
}

export async function setActivePlayerCharacter(characterId) {
  if (characterId !== 'ara-female') {
    throw new Error('Ara 3D Female is the only playable character.');
  }
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(characterId, ACTIVE_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not save the main character.'));
      tx.onabort = () => reject(tx.error || new Error('Main character selection was cancelled.'));
    });
  } finally {
    db.close();
  }
}

export async function savePlayerCharacter(buffer, metadata = {}, characterId = 'ara-female') {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20) {
    throw new Error('The converted character file is empty or invalid.');
  }
  if (characterId !== ARA_KEY) throw new Error('Only the Ara second character slot can be imported.');
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({
        buffer: buffer.slice(0),
        metadata: { ...metadata, characterId: ARA_KEY, displayName: 'Ara 3D Female' },
        savedAt: new Date().toISOString()
      }, ARA_KEY);
      tx.objectStore(STORE_NAME).put(ARA_KEY, ACTIVE_KEY);
      // Remove the legacy single-player override after migrating the same asset.
      tx.objectStore(STORE_NAME).delete(LEGACY_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not save the second character.'));
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
      const store = tx.objectStore(STORE_NAME);
      store.delete(ARA_KEY);
      store.delete(LEGACY_KEY);
      store.put(DEFAULT_CHARACTER_ID, ACTIVE_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not remove the Ara character.'));
      tx.onabort = () => reject(tx.error || new Error('Character reset was cancelled.'));
    });
  } finally {
    db.close();
  }
}
