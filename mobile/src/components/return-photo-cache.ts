import { File, Paths } from "expo-file-system";
import { downloadProductReturnPhoto } from "../api/product-return-api";
const pending = new Map<string, Promise<string>>();
export function cachedReturnPhoto(
  token: string,
  userId: string,
  returnId: string,
  photoId: string,
  thumbnail = true,
): Promise<string> {
  const key = `grandwall-${userId}-${photoId}-${thumbnail ? "thumb" : "full"}.jpg`;
  const running = pending.get(key);
  if (running) return running;
  const file = new File(Paths.cache, key);
  const promise = (async () => {
    if (file.exists && file.size > 0) return file.uri;
    const bytes = await downloadProductReturnPhoto(
      token,
      returnId,
      photoId,
      thumbnail,
    );
    file.write(bytes);
    return file.uri;
  })();
  pending.set(key, promise);
  void promise.finally(() => pending.delete(key)).catch(() => {});
  return promise;
}
