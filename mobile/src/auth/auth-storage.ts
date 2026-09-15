import * as SecureStore from 'expo-secure-store';

import { AuthSession } from './auth-types';

const AUTH_SESSION_KEY =
  'grandwall_auth_session_v1';

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
  await setStoredValue(
    AUTH_SESSION_KEY,
    JSON.stringify(session),
    secureStoreOptions,
  );
};

export const getAuthSession =
  async (): Promise<AuthSession | null> => {
    const storedValue =
      await getStoredValue(
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
    await deleteStoredValue(
      AUTH_SESSION_KEY,
      secureStoreOptions,
    );

  };
type SecureStoreOptions =
  Parameters<
    typeof SecureStore.getItemAsync
  >[1];

const webStorageFallback =
  new Map<string, string>();

function isWebRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

function getWebStorage(): Storage | null {
  if (!isWebRuntime()) {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function getStoredValue(
  key: string,
  options?: SecureStoreOptions,
): Promise<string | null> {
  if (isWebRuntime()) {
    const webStorage = getWebStorage();

    if (webStorage) {
      return webStorage.getItem(key);
    }

    return (
      webStorageFallback.get(key) ??
      null
    );
  }

  return SecureStore.getItemAsync(
    key,
    options,
  );
}

async function setStoredValue(
  key: string,
  value: string,
  options?: SecureStoreOptions,
): Promise<void> {
  if (isWebRuntime()) {
    const webStorage = getWebStorage();

    if (webStorage) {
      webStorage.setItem(key, value);
      return;
    }

    webStorageFallback.set(key, value);
    return;
  }

  await SecureStore.setItemAsync(
    key,
    value,
    options,
  );
}

async function deleteStoredValue(
  key: string,
  options?: SecureStoreOptions,
): Promise<void> {
  if (isWebRuntime()) {
    const webStorage = getWebStorage();

    if (webStorage) {
      webStorage.removeItem(key);
    }

    webStorageFallback.delete(key);
    return;
  }

  await SecureStore.deleteItemAsync(
    key,
    options,
  );
}
