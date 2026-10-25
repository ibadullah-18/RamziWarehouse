import type { ConfigContext, ExpoConfig } from "expo/config";

// EAS file environment variable.
// google-services.json Git daxilində saxlanmır.

// Yerli backend (http://...) ilə işləyəndə Android düz HTTP trafikinə icazə verməlidir.
// Canlı (https) build-lərdə bu açılmır.
const usesLocalHttpApi = /^http:\/\//i.test(process.env.EXPO_PUBLIC_API_URL ?? "");

const withCleartextForLocalApi = (
  plugins: ExpoConfig["plugins"],
): ExpoConfig["plugins"] =>
  usesLocalHttpApi
    ? plugins?.map((plugin) =>
        plugin === "expo-build-properties"
          ? ["expo-build-properties", { android: { usesCleartextTraffic: true } }]
          : plugin,
      )
    : plugins;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,

  plugins: withCleartextForLocalApi(config.plugins),

  android: {
    ...config.android,

    package: "az.grandwall.app",

    ...(process.env.GOOGLE_SERVICES_JSON
      ? {
          googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
        }
      : {}),
  },
});
