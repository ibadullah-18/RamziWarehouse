# GrandWall Android build

## Local validation

```powershell
cd mobile
npm.cmd ci
npx.cmd tsc --noEmit
npm.cmd run lint
npx.cmd expo config --type public
npx.cmd expo-doctor
```

## First EAS setup

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init
npx.cmd eas-cli@latest env:create --environment production --name EXPO_PUBLIC_API_URL --value https://YOUR_API_DOMAIN --visibility plaintext
```

Replace `https://YOUR_API_DOMAIN` with the real HTTPS API address.

## Installable APK

```powershell
npm.cmd run build:android:preview
```

## Google Play AAB

```powershell
npm.cmd run build:android:production
```

The production profile creates an Android App Bundle for Google Play.
The fixed application ID is `az.grandwall.warehouse`.
