# GrandWall mobile

Expo SDK 57 application for GrandWall warehouse operations.

The app supports Android, iOS, web, phones, and tablets. Expo Router controls
the authenticated routes and role-based screens.

## Development

```powershell
Copy-Item .env.example .env.local
npm.cmd ci
npx.cmd expo start --dev-client --clear
```

For web development:

```powershell
npx.cmd expo start --web --clear
```

For release validation:

```powershell
npm.cmd run check
npx.cmd expo config --type public
npx.cmd expo-doctor
```

See `BUILD_ANDROID.md` for APK and Google Play AAB builds.
