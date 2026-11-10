import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { colors } from "../../theme";
import { isIos, isStandalone } from "./web-push";
import { useBranding } from "../branding/branding-provider";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };
type InstallWindow = Window & { __grandwallInstallPrompt?: InstallPromptEvent };

/**
 * Web only, hidden inside the installed app: explains how to put the app on the home
 * screen. Android Chrome gets a one-tap install button (the event is captured in
 * public/index.html before React starts).
 */
export function InstallAppCard() {
  const { appName } = useBranding();
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(
    () =>
      Platform.OS === "web" && typeof window !== "undefined"
        ? ((window as InstallWindow).__grandwallInstallPrompt ?? null)
        : null,
  );
  const [installed, setInstalled] = useState(
    () => Platform.OS !== "web" || isStandalone(),
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onPrompt = (event: Event) =>
      setInstallEvent(event as InstallPromptEvent);
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const ios = isIos();
  const text = ios
    ? `Safari-də Paylaş düyməsinə (kvadrat və yuxarı ox) basın, sonra “Ana ekrana əlavə et” seçin. ${appName} ikonu ilə açın; bildirişlər yalnız belə işləyir (iOS 16.4+).`
    : installEvent
      ? `${appName} tətbiqini quraşdırın: ana ekranda ikon olacaq, bildirişlər gələcək.`
      : "Chrome menyusundan (⋮) “Ana ekrana əlavə et” və ya “Tətbiqi quraşdır” seçin.";

  return (
    <View
      style={{
        padding: 16,
        gap: 10,
        borderRadius: 14,
        backgroundColor: colors.primarySoft,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons
          name={ios ? "share-outline" : "download-outline"}
          size={20}
          color={colors.primary}
        />
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          Telefona tətbiq kimi əlavə edin
        </Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
        {text}
      </Text>
      {!ios && installEvent ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void installEvent.prompt().catch(() => undefined);
            setInstallEvent(null);
            (window as InstallWindow).__grandwallInstallPrompt = undefined;
          }}
          style={{
            padding: 14,
            borderRadius: 12,
            backgroundColor: colors.primary,
          }}
        >
          <Text
            style={{ color: colors.white, textAlign: "center", fontWeight: "600" }}
          >
            Tətbiqi quraşdır
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
