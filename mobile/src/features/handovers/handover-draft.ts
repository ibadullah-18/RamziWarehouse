import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';

import { clearDraft, dropDraftPhotos, keepDraftPhoto, loadDraft, restoreDraftPhoto, saveDraft } from '../../lib/draft-storage';
import type { Customer } from '../orders/create-order-types';
import { captureReturnPhoto, type CapturedPhoto } from '../product-returns/photo-capture';

export const MAX_HANDOVER_PHOTOS = 10;

/**
 * The handover being prepared: photos, customer and note. It lives outside the screen so the
 * camera can be opened right from the tab tap (the web app only opens the camera from a tap)
 * and nothing is lost when the driver switches tabs. It is also kept on the device, so a call
 * or closing the app does not lose the photos already taken.
 */
export type HandoverDraft = {
  photos: CapturedPhoto[];
  customer: Pick<Customer, 'id' | 'name'> | null;
  note: string;
  /** Same id for every retry of the same send: the server stores it once. */
  operationId: string;
};

type Saved = HandoverDraft & { v: 1; userId: string; savedAt: number };

const NAME = 'handover';
const KEEP_DAYS = 3;

const empty = (): HandoverDraft => ({ photos: [], customer: null, note: '', operationId: randomUUID() });
const hasContent = (d: HandoverDraft) => d.photos.length > 0 || !!d.customer || !!d.note.trim();

let draft: HandoverDraft = empty();
let owner: string | null = null;
const listeners = new Set<() => void>();

function persist() {
  if (!owner) return;
  if (hasContent(draft)) void saveDraft(NAME, { ...draft, v: 1, userId: owner, savedAt: Date.now() } satisfies Saved);
  else void clearDraft(NAME);
}

function set(next: HandoverDraft) {
  draft = next;
  listeners.forEach((listener) => listener());
  persist();
}

export const handoverDraft = {
  get: () => draft,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Called once the user is known: brings back this user's unfinished handover. */
  async attach(userId: string) {
    if (!userId || owner === userId) return;
    owner = userId;
    const saved = await loadDraft<Saved>(NAME);
    if (owner !== userId) return;
    if (!saved || saved.v !== 1 || saved.userId !== userId || Date.now() - saved.savedAt > KEEP_DAYS * 86400000) {
      if (hasContent(draft)) persist();
      return;
    }
    const photos = (
      await Promise.all(
        saved.photos.map(async (photo) => {
          const uri = await restoreDraftPhoto(photo.operationId, photo.uri);
          return uri ? { ...photo, uri } : null;
        }),
      )
    ).filter((photo): photo is CapturedPhoto => photo !== null);
    // Something taken meanwhile in this session wins over the old copy.
    if (owner !== userId || hasContent(draft)) return;
    set({ photos, customer: saved.customer, note: saved.note, operationId: saved.operationId });
  },

  setCustomer: (customer: HandoverDraft['customer']) => set({ ...draft, customer }),
  setNote: (note: string) => set({ ...draft, note }),
  remove(index: number) {
    const gone = draft.photos[index];
    if (gone) void dropDraftPhotos([gone.operationId]);
    set({ ...draft, photos: draft.photos.filter((_, i) => i !== index) });
  },
  reset() {
    void dropDraftPhotos(draft.photos.map((photo) => photo.operationId));
    set(empty());
  },

  /** Opens the camera; the new photo is added (or replaces the one at `replaceIndex`). */
  async capture(replaceIndex?: number): Promise<boolean> {
    if (replaceIndex === undefined && draft.photos.length >= MAX_HANDOVER_PHOTOS) return false;
    const photo = await captureReturnPhoto('tehvil');
    if (!photo) return false;
    await keepDraftPhoto(photo.operationId, photo.uri);
    const photos = [...draft.photos];
    if (replaceIndex !== undefined && replaceIndex < photos.length) {
      void dropDraftPhotos([photos[replaceIndex].operationId]);
      photos[replaceIndex] = photo;
    } else photos.push(photo);
    set({ ...draft, photos });
    return true;
  },
};

export function useHandoverDraft(): HandoverDraft {
  return useSyncExternalStore(handoverDraft.subscribe, handoverDraft.get, handoverDraft.get);
}
