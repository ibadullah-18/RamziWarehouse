// Notifications for the web app installed on the home screen (iPhone: Safari → Share →
// "Add to Home Screen", iOS 16.4+; Android: Chrome → "Install app"). The service worker
// in public/sw.js shows the message and opens /return-detail/{id} on tap.
import { authenticatedFetch } from "../../api/authenticated-fetch";

type WebPushSupport =
  | "supported"
  | "ios-needs-install" // iPhone Safari tab: push works only from the home screen app
  | "unsupported";

const apiBase = () => {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("Server ünvanı təyin edilməyib.");
  return base;
};

export const isIos = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac with touch.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

export function webPushSupport(): WebPushSupport {
  if (typeof window === "undefined") return "unsupported";
  const ok =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  if (ok) return "supported";
  return isIos() && !isStandalone() ? "ios-needs-install" : "unsupported";
}

export const webPermission = (): NotificationPermission | "unsupported" =>
  typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "unsupported";

const base64UrlToBytes = (value: string) => {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
};

const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) => {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
};

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (!existing) await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

async function send(
  method: "POST" | "DELETE",
  accessToken: string,
  body: object,
) {
  const response = await authenticatedFetch(
    apiBase() + "/api/push/web/subscriptions",
    {
      method,
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(method === "DELETE" ? 3000 : 20000),
    },
  );
  if (!response.ok) throw new Error("Bildiriş xidməti aktivləşdirilə bilmədi.");
}

/**
 * Asks for permission (must be started from a button press on iPhone) unless `silent`,
 * subscribes this browser and saves the subscription on the server.
 * Returns false when the user did not allow notifications.
 */
export async function enableWebPush(
  accessToken: string,
  silent = false,
): Promise<boolean> {
  // Ask first, before any other await, so iOS still sees the button press.
  let permission = Notification.permission;
  if (permission !== "granted") {
    if (silent) return false;
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return false;

  const keyResponse = await authenticatedFetch(
    apiBase() + "/api/push/web/public-key",
    {
      headers: { Authorization: "Bearer " + accessToken },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!keyResponse.ok) throw new Error("Bildiriş xidməti aktivləşdirilə bilmədi.");
  const { publicKey } = (await keyResponse.json()) as { publicKey?: string };
  if (!publicKey) throw new Error("Serverdə bildiriş açarları qurulmayıb.");
  const applicationServerKey = base64UrlToBytes(publicKey);

  const reg = await registration();
  let subscription = await reg.pushManager.getSubscription();
  // A subscription made with an old server key cannot receive messages any more.
  if (
    subscription &&
    !sameKey(subscription.options.applicationServerKey, applicationServerKey)
  ) {
    await subscription.unsubscribe().catch(() => false);
    subscription = null;
  }
  subscription ??= await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth)
    throw new Error("Bildiriş xidməti aktivləşdirilə bilmədi.");
  await send("POST", accessToken, {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });
  return true;
}

/** On sign-out: this browser stops receiving the signed-out user's notifications. */
export async function disableWebPush(accessToken: string) {
  if (webPushSupport() !== "supported") return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return;
  await send("DELETE", accessToken, { endpoint: subscription.endpoint }).catch(
    () => undefined,
  );
  await subscription.unsubscribe().catch(() => false);
}
