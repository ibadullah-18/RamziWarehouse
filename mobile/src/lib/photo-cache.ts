import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Keeps downloaded (authenticated) photos so lists scroll without fetching them again.
 * Phone app: a file in the cache folder (also what sharing needs). Web app: an in-memory
 * object URL — the phone-only file API does not exist in the browser.
 */
const pending = new Map<string, Promise<string>>();
const webUrls = new Map<string, string>();

export function cachedPhoto(key: string, download: () => Promise<Uint8Array>): Promise<string> {
  const running = pending.get(key);
  if (running) return running;

  const promise = (async () => {
    if (Platform.OS === 'web') {
      const known = webUrls.get(key);
      if (known) return known;
      const bytes = await download();
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/jpeg' }));
      webUrls.set(key, url);
      return url;
    }
    const file = new File(Paths.cache, key.endsWith('.jpg') ? key : `${key}.jpg`);
    if (file.exists && file.size > 0) return file.uri;
    file.write(await download());
    return file.uri;
  })();

  pending.set(key, promise);
  void promise.finally(() => pending.delete(key)).catch(() => {});
  return promise;
}
