import { authenticatedFetch } from "./authenticated-fetch";
export type ReturnPerson = { id: string; name: string; isActive: boolean };
export async function returnPersonRequest<T>(
  token: string,
  path = "",
  method = "GET",
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await authenticatedFetch(
      `${process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "")}/api/return-persons${path}`,
      {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    if (!response.ok)
      throw new Error(
        "Şəxs siyahısı saxlanılmadı və ya alınmadı. Yenidən sınayın.",
      );
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
