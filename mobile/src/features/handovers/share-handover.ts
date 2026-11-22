import { Platform } from 'react-native';

import { downloadHandoverPhoto, type Handover } from '../../api/handover-api';
import { cachedPhoto } from '../../lib/photo-cache';

/** Photos ready to share: local file URIs (phone app) or File objects (web app). */
export type PreparedShare = { uris: string[]; files: File[]; note: string };

/** Downloads the full-size photos once (they are cached). */
export async function prepareHandoverShare(token: string, userId: string, handover: Handover): Promise<PreparedShare> {
  const uris = await Promise.all(
    handover.photos.map((photo) =>
      cachedPhoto(`tehvil-${userId}-${photo.id}-full.jpg`, () => downloadHandoverPhoto(token, handover.id, photo.id, false)),
    ),
  );
  const files =
    Platform.OS === 'web'
      ? await Promise.all(
          uris.map(async (uri, index) => {
            const blob = await (await fetch(uri)).blob();
            return new File([blob], `tehvil-${index + 1}.jpg`, { type: 'image/jpeg' });
          }),
        )
      : [];
  return { uris, files, note: handover.note?.trim() ?? '' };
}

export class ShareNeedsTapError extends Error {}

/**
 * Opens the share sheet (WhatsApp etc.) with the photos and, if there is one, the note.
 * The customer's name is deliberately NOT sent.
 * In the web app this must run straight from a tap; if the browser refuses because the
 * download took a moment, {@link ShareNeedsTapError} asks for one more tap.
 */
export async function sharePrepared(prepared: PreparedShare): Promise<'shared' | 'cancelled'> {
  if (Platform.OS === 'web') {
    const data: ShareData = prepared.note ? { files: prepared.files, text: prepared.note } : { files: prepared.files };
    if (!navigator.canShare?.(data)) {
      throw new Error('Bu brauzer şəkil paylaşmağı dəstəkləmir. Tətbiqi ana ekrana əlavə edib oradan, və ya Chrome/Safari ilə açın.');
    }
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      if (error instanceof Error && error.name === 'NotAllowedError') throw new ShareNeedsTapError('Şəkillər hazırdır. Paylaşmaq üçün yenidən toxunun.');
      throw error;
    }
  }

  // Loaded only in the phone app: this native module does not exist in the browser.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Share = (require('react-native-share') as typeof import('react-native-share')).default;
  const result = await Share.open({
    urls: prepared.uris.map((uri) => (uri.startsWith('file://') ? uri : `file://${uri}`)),
    type: 'image/jpeg',
    message: prepared.note || undefined,
    failOnCancel: false,
  });
  return result.dismissedAction ? 'cancelled' : 'shared';
}
