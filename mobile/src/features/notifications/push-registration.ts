import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { disableWebPush } from "./web-push";
import { registerPushDevice } from "../../api/push-api";
const key = "grandwall.pushToken";
export const savePushToken = (token: string) =>
  SecureStore.setItemAsync(key, token);
export async function unregisterPush(accessToken: string) {
  if (Platform.OS === "web") return disableWebPush(accessToken);
  const token = await SecureStore.getItemAsync(key);
  if (!token) return;
  await registerPushDevice(token, accessToken, true);
  await SecureStore.deleteItemAsync(key);
}
