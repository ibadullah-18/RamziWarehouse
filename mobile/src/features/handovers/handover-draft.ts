import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';

import type { Customer } from '../orders/create-order-types';
import { captureReturnPhoto, type CapturedPhoto } from '../product-returns/photo-capture';

export const MAX_HANDOVER_PHOTOS = 10;

/**
 * The handover being prepared: photos, customer and note. It lives outside the screen so the
 * camera can be opened right from the tab tap (the web app only opens the camera from a tap)
 * and nothing is lost when the driver switches tabs.
 */
export type HandoverDraft = {
  photos: CapturedPhoto[];
  customer: Pick<Customer, 'id' | 'name'> | null;
  note: string;
  /** Same id for every retry of the same send: the server stores it once. */
  operationId: string;
};

const empty = (): HandoverDraft => ({ photos: [], customer: null, note: '', operationId: randomUUID() });

let draft: HandoverDraft = empty();
const listeners = new Set<() => void>();

function set(next: HandoverDraft) {
  draft = next;
  listeners.forEach((listener) => listener());
}

export const handoverDraft = {
  get: () => draft,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  setCustomer: (customer: HandoverDraft['customer']) => set({ ...draft, customer }),
  setNote: (note: string) => set({ ...draft, note }),
  remove: (index: number) => set({ ...draft, photos: draft.photos.filter((_, i) => i !== index) }),
  reset: () => set(empty()),

  /** Opens the camera; the new photo is added (or replaces the one at `replaceIndex`). */
  async capture(replaceIndex?: number): Promise<boolean> {
    if (replaceIndex === undefined && draft.photos.length >= MAX_HANDOVER_PHOTOS) return false;
    const photo = await captureReturnPhoto('tehvil');
    if (!photo) return false;
    const photos = [...draft.photos];
    if (replaceIndex !== undefined && replaceIndex < photos.length) photos[replaceIndex] = photo;
    else photos.push(photo);
    set({ ...draft, photos });
    return true;
  },
};

export function useHandoverDraft(): HandoverDraft {
  return useSyncExternalStore(handoverDraft.subscribe, handoverDraft.get, handoverDraft.get);
}
