import * as SecureStore from 'expo-secure-store';

import { AuthSession } from './auth-types';

const AUTH_SESSION_KEY =
  'ram_collection_auth_session_v1';

const secureStoreOptions: SecureStore.SecureStoreOptions =
  {
    keychainAccessible:
      SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };

const isValidSession = (
  value: unknown,
): value is AuthSession => {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return false;
  }

  const session =
    value as Partial<AuthSession>;

  return (
    typeof session.accessToken === 'string' &&
    session.accessToken.length > 0 &&
    typeof session.refreshToken === 'string' &&
    session.refreshToken.length > 0 &&
    typeof session.userId === 'string' &&
    session.userId.length > 0 &&
    typeof session.fullName === 'string' &&
    typeof session.username === 'string' &&
    typeof session.role === 'number'
  );
};

export const saveAuthSession = async (
  session: AuthSession,
): Promise<void> => {
  await SecureStore.setItemAsync(
    AUTH_SESSION_KEY,
    JSON.stringify(session),
    secureStoreOptions,
  );
};

export const getAuthSession =
  async (): Promise<AuthSession | null> => {
    const storedValue =
      await SecureStore.getItemAsync(
        AUTH_SESSION_KEY,
        secureStoreOptions,
      );

    if (!storedValue) {
      return null;
    }

    try {
      const session =
        JSON.parse(storedValue) as unknown;

      if (!isValidSession(session)) {
        await clearAuthSession();
        return null;
      }

      return session;
    } catch {
      await clearAuthSession();
      return null;
    }
  };

export const clearAuthSession =
  async (): Promise<void> => {
    await SecureStore.deleteItemAsync(
      AUTH_SESSION_KEY,
      secureStoreOptions,
    );
  };