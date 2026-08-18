import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    ApiError,
    authApi,
} from '../api/auth-api';
import {
    clearAuthSession,
    getAuthSession,
    saveAuthSession,
} from './auth-storage';
import {
    AuthSession,
    LoginRequest,
} from './auth-types';

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (
    request: LoginRequest,
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [session, setSession] =
    useState<AuthSession | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      try {
        const storedSession =
          await getAuthSession();

        if (!storedSession) {
          return;
        }

        try {
          const refreshedSession =
            await authApi.refreshToken({
              refreshToken:
                storedSession.refreshToken,
            });

          await saveAuthSession(
            refreshedSession,
          );

          if (isActive) {
            setSession(refreshedSession);
          }
        } catch (error) {
          const tokenIsInvalid =
            error instanceof ApiError &&
            (error.status === 400 ||
              error.status === 401);

          if (tokenIsInvalid) {
            await clearAuthSession();

            if (isActive) {
              setSession(null);
            }

            return;
          }

          if (isActive) {
            setSession(storedSession);
          }
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, []);

  const signIn = useCallback(
    async (request: LoginRequest) => {
      const newSession =
        await authApi.login(request);

      await saveAuthSession(newSession);

      setSession(newSession);
    },
    [],
  );

  const signOut = useCallback(async () => {
    const currentRefreshToken =
      session?.refreshToken;

    try {
      if (currentRefreshToken) {
        await authApi.logout({
          refreshToken:
            currentRefreshToken,
        });
      }
    } finally {
      await clearAuthSession();
      setSession(null);
    }
  }, [session?.refreshToken]);

  const value =
    useMemo<AuthContextValue>(
      () => ({
        session,
        isLoading,
        isAuthenticated:
          session !== null,
        signIn,
        signOut,
      }),
      [
        session,
        isLoading,
        signIn,
        signOut,
      ],
    );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth yalnız AuthProvider daxilində işlədilə bilər.',
    );
  }

  return context;
};