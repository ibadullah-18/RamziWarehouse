import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AndroidAppVersion,
  getAndroidAppVersion,
  getInstalledVersionCode,
  openAppUpdate,
} from '../api/app-version-api';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../theme';

export function AppUpdateBanner() {
  const [versionInfo, setVersionInfo] =
    useState<AndroidAppVersion | null>(null);

  const [dismissed, setDismissed] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkVersion() {
      try {
        const installedVersionCode =
          getInstalledVersionCode();

        const info = await getAndroidAppVersion();

        if (!active) {
          return;
        }

        if (
          installedVersionCode > 0 &&
          installedVersionCode < info.latestVersionCode
        ) {
          setVersionInfo(info);
        }
      } catch (error) {
        console.warn(
          'GrandWall update yoxlaması uğursuz oldu:',
          error,
        );
      }
    }

    void checkVersion();

    return () => {
      active = false;
    };
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!versionInfo || isOpening) {
      return;
    }

    try {
      setIsOpening(true);
      await openAppUpdate(versionInfo.downloadUrl);
    } catch (error) {
      console.warn(
        'GrandWall update linki açıla bilmədi:',
        error,
      );
    } finally {
      setIsOpening(false);
    }
  }, [isOpening, versionInfo]);

  if (!versionInfo || dismissed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons
          name="arrow-up-circle-outline"
          size={23}
          color={colors.primary}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          Yeni versiya mövcuddur
        </Text>

        <Text style={styles.description}>
          GrandWall {versionInfo.latestVersion}
        </Text>
      </View>

      <Pressable
        onPress={() => void handleUpdate()}
        disabled={isOpening}
        style={({ pressed }) => [
          styles.updateButton,
          pressed && styles.pressed,
        ]}
      >
        {isOpening ? (
          <ActivityIndicator
            size="small"
            color={colors.white}
          />
        ) : (
          <Text style={styles.updateText}>
            Yenilə
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => setDismissed(true)}
        hitSlop={10}
        style={styles.closeButton}
      >
        <Ionicons
          name="close"
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  icon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  content: {
    flex: 1,
    marginLeft: spacing.md,
  },

  title: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  description: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 3,
  },

  updateButton: {
    minWidth: 64,
    height: 36,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  updateText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  closeButton: {
    marginLeft: spacing.sm,
    padding: 2,
  },

  pressed: {
    opacity: 0.8,
  },
});
