import { File } from "expo-file-system";
import { Platform } from "react-native";
import { authenticatedFetch } from "./authenticated-fetch";

/** App name and logo set by the admin (default name "Ramzi"). */
export type Branding = { appName: string; logoUrl: string | null };

export const apiBase = () => {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("Server ünvanı təyin edilməyib.");
  return base;
};

/** The server gives a relative logo URL; images need the full address. */
const absolute = (branding: Branding): Branding => ({
  appName: branding.appName,
  logoUrl: branding.logoUrl ? apiBase() + branding.logoUrl : null,
});

async function read(response: Response): Promise<Branding> {
  if (!response.ok) {
    let message = "Yadda saxlanmadı. Yenidən yoxlayın.";
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      message = problem.detail || problem.title || message;
    } catch {
      // keep the general message
    }
    throw new Error(message);
  }
  return absolute((await response.json()) as Branding);
}

export async function getBranding(): Promise<Branding> {
  const response = await fetch(apiBase() + "/api/branding", { signal: AbortSignal.timeout(15000) });
  return read(response);
}

export async function saveAppName(accessToken: string, appName: string): Promise<Branding> {
  return read(
    await authenticatedFetch(apiBase() + "/api/branding/name", {
      method: "PUT",
      headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ appName }),
      signal: AbortSignal.timeout(20000),
    }),
  );
}

export async function uploadLogo(
  accessToken: string,
  image: { uri: string; mimeType?: string | null; fileName?: string | null },
): Promise<Branding> {
  const form = new FormData();
  const name = image.fileName || "logo." + (image.mimeType?.split("/")[1] ?? "png");
  if (Platform.OS === "web") {
    const blob = await (await fetch(image.uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", new File(image.uri), name);
  }
  return read(
    await authenticatedFetch(apiBase() + "/api/branding/logo", {
      method: "PUT",
      headers: { Authorization: "Bearer " + accessToken, Accept: "application/json" },
      body: form,
      signal: AbortSignal.timeout(60000),
    }),
  );
}

export async function removeLogo(accessToken: string): Promise<Branding> {
  return read(
    await authenticatedFetch(apiBase() + "/api/branding/logo", {
      method: "DELETE",
      headers: { Authorization: "Bearer " + accessToken },
      signal: AbortSignal.timeout(20000),
    }),
  );
}
