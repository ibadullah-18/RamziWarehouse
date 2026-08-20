import { Stack } from 'expo-router';

import { colors } from '../../theme';

export default function AppStackLayout() {
  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,

        gestureEnabled: true,

        animation:
          'slide_from_right',

        contentStyle: {
          backgroundColor:
            colors.background,
        },
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          animation: 'none',
        }}
      />
    </Stack>
  );
}