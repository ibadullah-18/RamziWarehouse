import { Stack } from 'expo-router';

export default function ReturnDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}