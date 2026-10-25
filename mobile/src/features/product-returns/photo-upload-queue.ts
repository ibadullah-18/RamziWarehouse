import { useSyncExternalStore } from 'react';

import { uploadProductReturnPhoto } from '../../api/product-return-api';
import { appSession } from '../../auth/app-session';
import type { CapturedPhoto } from './photo-capture';

export type PhotoJobStatus = 'queued' | 'uploading' | 'failed';

export type PhotoJob = CapturedPhoto & {
  id: string;
  returnId: string;
  status: PhotoJobStatus;
  attempts: number;
  error: string | null;
};

const maxAutomaticAttempts = 3;
const concurrentUploads = 2;

let jobs: PhotoJob[] = [];
let running = 0;
const listeners = new Set<() => void>();
const uploadedListeners = new Set<(returnId: string) => void>();

function publish(next: PhotoJob[]) {
  jobs = next;
  listeners.forEach((listener) => listener());
}

function update(id: string, patch: Partial<PhotoJob>) {
  publish(jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)));
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function upload(job: PhotoJob) {
  update(job.id, { status: 'uploading', error: null });
  for (let attempt = job.attempts; attempt < maxAutomaticAttempts; attempt++) {
    try {
      const token = await appSession.accessToken();
      if (!token) throw new Error('Sessiya bitib. Yenidən daxil olun.');
      // Every attempt reuses the same operation id, so a lost response never stores a photo twice.
      await uploadProductReturnPhoto(token, job.returnId, job);
      publish(jobs.filter((current) => current.id !== job.id));
      uploadedListeners.forEach((listener) => listener(job.returnId));
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Şəkil göndərilmədi.';
      update(job.id, { attempts: attempt + 1, error: message });
      if (attempt + 1 >= maxAutomaticAttempts) break;
      await wait(1500 * (attempt + 1));
    }
  }
  update(job.id, { status: 'failed' });
}

function pump() {
  while (running < concurrentUploads) {
    const next = jobs.find((job) => job.status === 'queued');
    if (!next) return;
    running++;
    update(next.id, { status: 'uploading' });
    void upload(next).finally(() => {
      running--;
      pump();
    });
  }
}

/** Starts uploading in the background; the screen does not wait for it. */
export function enqueuePhoto(returnId: string, photo: CapturedPhoto) {
  publish([
    ...jobs,
    { ...photo, id: photo.operationId, returnId, status: 'queued', attempts: 0, error: null },
  ]);
  pump();
}

export function retryPhoto(id: string) {
  update(id, { status: 'queued', attempts: 0, error: null });
  pump();
}

export function discardPhoto(id: string) {
  publish(jobs.filter((job) => job.id !== id));
}

export function onPhotoUploaded(listener: (returnId: string) => void) {
  uploadedListeners.add(listener);
  return () => {
    uploadedListeners.delete(listener);
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePhotoJobs(returnId: string | undefined): PhotoJob[] {
  const all = useSyncExternalStore(subscribe, () => jobs, () => jobs);
  return returnId ? all.filter((job) => job.returnId === returnId) : [];
}
