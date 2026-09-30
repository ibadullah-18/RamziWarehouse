import { fetch as expoFetch } from 'expo/fetch';
import { appSession } from '../auth/app-session';

/** Retry only explicit 401 responses; never replay writes after network errors. */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const supplied = headers.get('Authorization');
  if (!supplied?.startsWith('Bearer ')) return expoFetch(url, options);
  const token = await appSession.accessToken();
  if (!token) throw new Error('Sessiya bitib. Yenidən daxil olun.');
  if (options.signal?.aborted) throw new Error('Sorğu dayandırıldı.');
  headers.set('Authorization', `Bearer ${token}`);
  const response = await expoFetch(url, { ...options, headers });
  if (response.status !== 401) return response;
  const refreshed = await appSession.accessToken(token);
  if (!refreshed) return response;
  if (options.signal?.aborted) return response;
  headers.set('Authorization', `Bearer ${refreshed}`);
  return expoFetch(url, { ...options, headers });
}
