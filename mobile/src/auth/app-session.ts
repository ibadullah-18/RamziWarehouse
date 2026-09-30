import { ApiError, authApi } from '../api/auth-api';
import { clearAuthSession, getAuthSession, saveAuthSession } from './auth-storage';
import { SessionManager } from './session-manager';

export const appSession = new SessionManager({
  load: getAuthSession,
  save: saveAuthSession,
  clear: clearAuthSession,
  refresh: refreshToken => authApi.refreshToken({ refreshToken }),
  revoke: refreshToken => authApi.logout({ refreshToken }),
  invalid: error => error instanceof ApiError && (error.status === 400 || error.status === 401),
  now: () => Date.now(),
});
