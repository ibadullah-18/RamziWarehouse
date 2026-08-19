import { Stack } from 'expo-router';

export default function CreateReturnLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}