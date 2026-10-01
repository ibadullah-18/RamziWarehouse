import type { ConfigContext, ExpoConfig } from "expo/config";

// EAS file environment variable.
// google-services.json Git daxilində saxlanmır.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,

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
