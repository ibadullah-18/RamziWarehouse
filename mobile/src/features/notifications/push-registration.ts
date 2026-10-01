import * as SecureStore from "expo-secure-store";
import { registerPushDevice } from "../../api/push-api";
const key = "grandwall.pushToken";
export const savePushToken = (token: string) =>
  SecureStore.setItemAsync(key, token);
export async function unregisterPush(accessToken: string) {
  const token = await SecureStore.getItemAsync(key);
  if (!token) return;
  await registerPushDevice(token, accessToken, true);
  await SecureStore.deleteItemAsync(key);
}
