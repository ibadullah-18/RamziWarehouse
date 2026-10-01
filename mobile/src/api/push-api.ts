import { authenticatedFetch } from "./authenticated-fetch";
export async function registerPushDevice(
  token: string,
  accessToken: string,
  remove = false,
) {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("Server ünvanı təyin edilməyib.");
  const response = await authenticatedFetch(base + "/api/push-devices", {
    method: remove ? "DELETE" : "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
    signal: AbortSignal.timeout(remove ? 3000 : 20000),
  });
  if (!response.ok) throw new Error("Bildiriş xidməti aktivləşdirilə bilmədi.");
}
