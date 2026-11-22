import { appendLocalFile } from '../lib/upload-file';
import { authenticatedFetch } from './authenticated-fetch';

/** "Mal təhvil" (server: api/handovers). */
export type Handover = {
  id: string;
  customerId: string;
  customerName: string;
  note: string | null;
  businessDate: string;
  createdByUserId: string;
  createdByFullName: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  photos: { id: string }[];
  canEdit: boolean;
};

export type HandoverDay = {
  date: string;
  isToday: boolean;
  items: Handover[];
};

export type LocalPhoto = { uri: string; fileName: string };

const base = () => {
  const value = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (!value) throw new Error('Server ünvanı təyin edilməyib.');
  return value;
};

async function problem(response: Response, fallback: string): Promise<Error> {
  try {
    const body = (await response.json()) as { detail?: string; title?: string };
    return new Error(body.detail || body.title || fallback);
  } catch {
    return new Error(fallback);
  }
}

async function json<T>(token: string, path: string, init: RequestInit = {}, fallback = 'Əməliyyat alınmadı.'): Promise<T> {
  const response = await authenticatedFetch(base() + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    signal: init.signal ?? AbortSignal.timeout(30000),
  });
  if (!response.ok) throw await problem(response, fallback);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Sends the photos, customer and note in one request. Repeating with the same operationId is safe. */
export async function createHandover(
  token: string,
  input: { operationId: string; customerId: string; note: string; photos: LocalPhoto[] },
): Promise<Handover> {
  const form = new FormData();
  form.append('operationId', input.operationId);
  form.append('customerId', input.customerId);
  if (input.note.trim()) form.append('note', input.note.trim());
  for (const photo of input.photos) await appendLocalFile(form, 'files', photo.uri, photo.fileName);
  return json<Handover>(token, '/api/handovers', { method: 'POST', body: form, signal: AbortSignal.timeout(180000) }, 'Təhvil göndərilmədi. İnterneti yoxlayıb təkrar basın.');
}

export const getHandoverDay = (token: string, date: string, mine: boolean) =>
  json<HandoverDay>(token, `/api/handovers?date=${encodeURIComponent(date)}&mine=${mine}`, {}, 'Təhvillər alınmadı.');

export const updateHandover = (token: string, id: string, customerId: string, note: string) =>
  json<Handover>(token, `/api/handovers/${id}`, { method: 'PUT', body: JSON.stringify({ customerId, note }) }, 'Dəyişiklik saxlanmadı.');

export const deleteHandover = (token: string, id: string) =>
  json<void>(token, `/api/handovers/${id}`, { method: 'DELETE' }, 'Silinmədi.');

export async function downloadHandoverPhoto(token: string, handoverId: string, photoId: string, thumbnail: boolean): Promise<Uint8Array> {
  const response = await authenticatedFetch(`${base()}/api/handovers/${handoverId}/photos/${photoId}/file?thumbnail=${thumbnail}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'image/*' },
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw await problem(response, 'Şəkil açılmadı.');
  return new Uint8Array(await response.arrayBuffer());
}
