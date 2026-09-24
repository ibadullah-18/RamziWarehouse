import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

export type AndroidAppVersion = {
  platform: string;
  latestVersion: string;
  latestVersionCode: number;
  minimumVersionCode: number;
  forceUpdate: boolean;
  downloadUrl: string;
  releaseNotes: string[];
};

function getApiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!value) {
    throw new Error('EXPO_PUBLIC_API_URL təyin edilməyib.');
  }

  return value.replace(/\/+$/, '');
}

export function getInstalledVersionCode(): number {
  if (Platform.OS !== 'android') {
    return 0;
  }

  // Native build nömrəsi həmişə birinci götürülür.
  // EAS autoIncrement istifadə etdiyinə görə app.json-dakı
  // versionCode quraşdırılmış APK/AAB ilə eyni olmaya bilər.
  const value =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.android?.versionCode;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getAndroidAppVersion(): Promise<AndroidAppVersion> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/app-version/android`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Versiya məlumatı alınmadı (${response.status}).`,
    );
  }

  return (await response.json()) as AndroidAppVersion;
}

export async function openAppUpdate(
  downloadUrl: string,
): Promise<void> {
  const canOpen = await Linking.canOpenURL(downloadUrl);

  if (!canOpen) {
    throw new Error('Yeniləmə linkini açmaq mümkün olmadı.');
  }

  await Linking.openURL(downloadUrl);
}

