import {unregisterPush} from '../features/notifications/push-registration';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { authApi } from '../api/auth-api';
import { appSession } from './app-session';
import { AuthSession, LoginRequest } from './auth-types';

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn(request: LoginRequest): Promise<void>;
  signOut(): Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const unsubscribe = appSession.subscribe(value => { if (active) setSession(value); });
    void appSession.restore().then(() => appSession.accessToken()).catch(() => {
      // Offline and temporary server failures preserve the saved login.
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) return;
    const renew = () => { void appSession.accessToken().catch(() => {}); };
    // OS timers pause in background; foreground and request checks handle that case.
    const timer = setInterval(() => { if (AppState.currentState === 'active') renew(); }, 30_000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') renew(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [session]);

  const signIn = useCallback(async (request: LoginRequest) => {
    await appSession.accept(await authApi.login(request));
  }, []);
  const signOut = useCallback(async () => {
    if(session?.role===1)await unregisterPush(session.accessToken).catch(()=>{});
    await appSession.signOut();
  }, [session]);
  const value = useMemo(() => ({ session, isLoading, isAuthenticated: session !== null, signIn, signOut }), [session, isLoading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth yalnız AuthProvider daxilində işlədilə bilər.');
  return context;
}
