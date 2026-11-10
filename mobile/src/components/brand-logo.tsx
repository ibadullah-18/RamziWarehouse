import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useBranding } from '../features/branding/branding-provider';
import { colors } from '../theme';

type BrandLogoProps = {
  width?: number;
};

/**
 * The logo the admin uploaded; without one, the app name as a wordmark.
 * Name and logo are changed in İdarəetmə → Tətbiqin adı və loqosu.
 */
export function BrandLogo({ width = 280 }: BrandLogoProps) {
  const { appName, logoUrl } = useBranding();
  // Long names get a smaller font so the whole name fits on one line (web has no auto-fit).
  const textWidth = width - width / 5 - 12;
  const fontSize = Math.min(width / 7.5, textWidth / (Math.max(appName.length, 1) * 0.8));

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={appName}
      style={[styles.container, { width, height: width / 3 }]}
    >
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          contentFit="contain"
          transition={150}
          style={styles.image}
        />
      ) : (
        <View style={styles.wordmark}>
          <View style={[styles.badge, { width: width / 5, height: width / 5, borderRadius: width / 18 }]}>
            <Ionicons name="cube" size={width / 9} color={colors.white} />
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.name, { fontSize, letterSpacing: fontSize > 20 ? 2 : 1 }]}
          >
            {appName.toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    justifyContent: 'center',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  name: {
    flexShrink: 1,
    color: colors.primaryDark,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
