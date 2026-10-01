import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { router, type Href } from "expo-router";
import { useAuth } from "../../auth/auth-context";
import { UserRole } from "../../auth/auth-types";
import { registerPushDevice } from "../../api/push-api";
import { savePushToken, unregisterPush } from "./push-registration";
import { colors } from "../../theme";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
const Context = createContext<{
  status: string;
  enable: () => void;
  busy: boolean;
}>({ status: "", enable: () => {}, busy: false });
export function PushNotificationProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const current = useRef(session);
  useEffect(() => {
    current.current = session;
  }, [session]);
  const [status, setStatus] = useState("Bildirişləri aktivləşdirin."),
    [busy, setBusy] = useState(false);
  const flight = useRef(false),
    handled = useRef<string | null>(null);
  const enable = useCallback(async () => {
    const user = current.current;
    if (
      !user ||
      user.role !== UserRole.Manager ||
      flight.current ||
      Platform.OS === "web"
    )
      return;
    flight.current = true;
    setBusy(true);
    try {
      if (!Device.isDevice)
        throw new Error("Bildirişləri telefonda aktivləşdirin.");
      if (Constants.executionEnvironment === "storeClient")
        throw new Error("Bildirişlər üçün GrandWall tətbiqini quraşdırın.");
      if (Platform.OS === "android")
        await Notifications.setNotificationChannelAsync("returns", {
          name: "Yeni vazvrad və vitrin",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
        });
      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== "granted")
        permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== "granted") {
        setStatus(
          "Bildiriş icazəsi bağlıdır. Telefon ayarlarından aça bilərsiniz.",
        );
        return;
      }
      const projectId =
        Constants.easConfig?.projectId ??
        Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) throw new Error("Tətbiqi yeniləyib təkrar yoxlayın.");
      const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
        .data;
      if (current.current?.userId !== user.userId) return;
      await registerPushDevice(token, user.accessToken);
      await savePushToken(token);
      if (
        current.current?.userId !== user.userId ||
        current.current?.role !== UserRole.Manager
      ) {
        await unregisterPush(user.accessToken).catch(() => {});
        return;
      }
      setStatus("Yeni vazvrad və vitrin bildirişləri aktivdir.");
    } catch (e) {
      setStatus(
        e instanceof Error &&
          [
            "Bildirişləri telefonda aktivləşdirin.",
            "Bildirişlər üçün GrandWall tətbiqini quraşdırın.",
          ].includes(e.message)
          ? e.message
          : "Bildirişləri aktivləşdirmək mümkün olmadı. Tətbiqi yeniləyib təkrar yoxlayın.",
      );
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (session?.role !== UserRole.Manager) return;
    const timer = setTimeout(() => void enable(), 0);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void enable();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [enable, session?.role, session?.userId]);
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      if (
        !response ||
        !current.current ||
        current.current.role !== UserRole.Manager
      )
        return;
      const notification = response.notification,
        data = notification.request.content.data ?? {};
      if (
        handled.current === notification.request.identifier ||
        data.userId !== current.current.userId
      )
        return;
      if (
        typeof data.returnId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          data.returnId,
        )
      )
        return;
      handled.current = notification.request.identifier;
      router.push(("/return-detail/" + data.returnId) as Href);
      void Notifications.clearLastNotificationResponseAsync();
    };
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    if (session?.role === UserRole.Manager)
      void Notifications.getLastNotificationResponseAsync().then(open);
    return () => sub.remove();
  }, [session?.role, session?.userId]);
  return (
    <Context.Provider value={{ status, busy, enable: () => void enable() }}>
      {children}
    </Context.Provider>
  );
}
export function PushNotificationSettings() {
  const { session } = useAuth();
  const { status, busy, enable } = useContext(Context);
  if (session?.role !== UserRole.Manager || Platform.OS === "web") return null;
  return (
    <View
      style={{
        padding: 18,
        gap: 12,
        borderRadius: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>
        Vazvrad bildirişləri
      </Text>
      <Text
        style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}
      >
        {status}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={enable}
        style={{
          padding: 16,
          borderRadius: 12,
          backgroundColor: colors.primary,
        }}
      >
        <Text
          style={{
            color: colors.background,
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          {busy ? "Aktivləşdirilir…" : "Bildirişləri aktivləşdir"}
        </Text>
      </Pressable>
    </View>
  );
}
