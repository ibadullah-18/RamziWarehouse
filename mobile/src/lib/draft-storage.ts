import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Keeps half-written forms (a big return, a handover) on the device, so a phone call or
 * switching apps does not lose them: the phone may close the app in the background, and the
 * web app on iPhone is often reloaded when you come back to it.
 *
 * Text: phone app → a file in the app's documents folder; web → localStorage.
 * Photos: phone app → the photo files already on the device; web → IndexedDB (the blob:
 * address of a photo dies with the page).
 */

const key = (name: string) => `ramzi.draft.${name}`;

export async function saveDraft(name: string, value: unknown): Promise<void> {
  try {
    const text = JSON.stringify(value);
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key(name), text);
      return;
    }
    const file = new File(Paths.document, `${key(name)}.json`);
    file.write(text);
  } catch {
    // Saving the draft is a safety net; never break the form because of it.
  }
}

export async function loadDraft<T>(name: string): Promise<T | null> {
  try {
    let text: string | null;
    if (Platform.OS === 'web') text = window.localStorage.getItem(key(name));
    else {
      const file = new File(Paths.document, `${key(name)}.json`);
      text = file.exists ? await file.text() : null;
    }
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export async function clearDraft(name: string): Promise<void> {
  try {
    if (Platform.OS === 'web') window.localStorage.removeItem(key(name));
    else {
      const file = new File(Paths.document, `${key(name)}.json`);
      if (file.exists) file.delete();
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------- photos (web: IndexedDB)

const DB = 'ramzi-drafts';
const STORE = 'photos';

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** Keeps a draft photo so it survives a reload (web). On the phone the file itself stays. */
export async function keepDraftPhoto(id: string, uri: string): Promise<void> {
  if (Platform.OS !== 'web') return;
  try {
    const blob = await (await fetch(uri)).blob();
    await run('readwrite', (store) => store.put(blob, id));
  } catch {
    // ignore
  }
}

/** The photo's address after a restart, or null if it is gone. */
export async function restoreDraftPhoto(id: string, uri: string): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') return new File(uri).exists ? uri : null;
    const blob = await run<Blob | undefined>('readonly', (store) => store.get(id));
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

export async function dropDraftPhotos(ids: string[]): Promise<void> {
  if (Platform.OS !== 'web' || ids.length === 0) return;
  try {
    for (const id of ids) await run('readwrite', (store) => store.delete(id));
  } catch {
    // ignore
  }
}
