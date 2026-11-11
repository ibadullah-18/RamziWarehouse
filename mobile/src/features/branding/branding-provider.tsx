import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Platform } from "react-native";
import { getBranding, type Branding } from "../../api/branding-api";

export const DEFAULT_APP_NAME = "Ramzi";

const CACHE_KEY = "ramzi.branding.v1";
const fallback: Branding = { appName: DEFAULT_APP_NAME, logoUrl: null };

type BrandingContext = Branding & {
  /** True once the saved name/logo has been read from the device (for the start animation). */
  ready: boolean;
  /** Re-reads the name and logo from the server. */
  refresh: () => Promise<void>;
  /** Shows a just-saved value at once (settings screen). */
  apply: (branding: Branding) => void;
};

const Context = createContext<BrandingContext>({
  ...fallback,
  ready: true,
  refresh: async () => {},
  apply: () => {},
});

// The last known name/logo is kept on the device so the app opens with it, even offline.
const cache = {
  async read(): Promise<Branding | null> {
    try {
      const raw =
        Platform.OS === "web"
          ? window.localStorage.getItem(CACHE_KEY)
          : await SecureStore.getItemAsync(CACHE_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw) as Branding;
      return typeof value.appName === "string" && value.appName ? value : null;
    } catch {
      return null;
    }
  },
  async write(value: Branding) {
    try {
      const raw = JSON.stringify(value);
      if (Platform.OS === "web") window.localStorage.setItem(CACHE_KEY, raw);
      else await SecureStore.setItemAsync(CACHE_KEY, raw);
    } catch {
      // only a convenience
    }
  },
};

export function BrandingProvider({ children }: PropsWithChildren) {
  const [branding, setBranding] = useState<Branding>(fallback);
  const [ready, setReady] = useState(false);

  const apply = useCallback((value: Branding) => {
    setBranding(value);
    void cache.write(value);
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await getBranding());
    } catch {
      // offline: keep what we have
    }
  }, [apply]);

  useEffect(() => {
    let alive = true;
    const start = async () => {
      const stored = await cache.read();
      if (alive && stored) setBranding(stored);
      if (alive) setReady(true);
      await refresh();
    };
    void start();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [refresh]);

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined")
      document.title = branding.appName;
  }, [branding.appName]);

  const value = useMemo(
    () => ({ ...branding, ready, refresh, apply }),
    [branding, ready, refresh, apply],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useBranding = () => useContext(Context);
