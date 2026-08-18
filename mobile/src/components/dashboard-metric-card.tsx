import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../theme';

type MetricTone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger';

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: MetricTone;
  isLoading?: boolean;
}

const toneColors: Record<
  MetricTone,
  {
    icon: string;
    background: string;
  }
> = {
  primary: {
    icon: colors.primary,
    background: colors.primarySoft,
  },

  success: {
    icon: colors.success,
    background: colors.successSoft,
  },

  warning: {
    icon: colors.warning,
    background: colors.warningSoft,
  },

  danger: {
    icon: colors.danger,
    background: colors.dangerSoft,
  },
};

export function DashboardMetricCard({
  title,
  value,
  icon,
  tone = 'primary',
  isLoading = false,
}: DashboardMetricCardProps) {
  const skeletonOpacity = useSharedValue(0.35);

  useEffect(() => {
    if (isLoading) {
      skeletonOpacity.value = withRepeat(
        withTiming(0.85, {
          duration: 750,
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(skeletonOpacity);
      skeletonOpacity.value = 1;
    }

    return () => {
      cancelAnimation(skeletonOpacity);
    };
  }, [
    isLoading,
    skeletonOpacity,
  ]);

  const skeletonStyle = useAnimatedStyle(
    () => ({
      opacity: skeletonOpacity.value,
    }),
  );

  const selectedTone = toneColors[tone];

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor:
              selectedTone.background,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={selectedTone.icon}
        />
      </View>

      {isLoading ? (
        <Animated.View
          style={[
            styles.skeletonValue,
            skeletonStyle,
          ]}
        />
      ) : (
        <Text style={styles.value}>
          {value}
        </Text>
      )}

      <Text
        style={styles.title}
        numberOfLines={2}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    minHeight: 142,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  value: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '700',
    lineHeight: 34,
  },

  skeletonValue: {
    width: 52,
    height: 27,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    marginVertical: 3,
  },

  title: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
});