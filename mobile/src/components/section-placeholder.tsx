import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../theme';

type IconName =
  ComponentProps<typeof Ionicons>['name'];

interface SectionPlaceholderProps {
  icon: IconName;
  title: string;
  description: string;
}

export function SectionPlaceholder({
  icon,
  title,
  description,
}: SectionPlaceholderProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={30}
            color={colors.primary}
          />
        </View>

        <Text style={styles.title}>
          {title}
        </Text>

        <Text style={styles.description}>
          {description}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },

  iconContainer: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    backgroundColor:
      colors.primarySoft,
  },

  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.xl,
  },

  description: {
    maxWidth: 300,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});