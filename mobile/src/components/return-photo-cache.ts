import { downloadProductReturnPhoto } from "../api/product-return-api";
import { cachedPhoto } from "../lib/photo-cache";

/** Return photo as a local URI (phone: cached file; web app: object URL). */
export function cachedReturnPhoto(
  token: string,
  userId: string,
  returnId: string,
  photoId: string,
  thumbnail = true,
): Promise<string> {
  return cachedPhoto(`grandwall-${userId}-${photoId}-${thumbnail ? "thumb" : "full"}.jpg`, () =>
    downloadProductReturnPhoto(token, returnId, photoId, thumbnail),
  );
}
