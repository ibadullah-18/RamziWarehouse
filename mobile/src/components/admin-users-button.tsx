import { Ionicons } from '@expo/vector-icons';
import {
    type Href,
    router,
} from 'expo-router';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { useAuth } from '../auth/auth-context';
import {
    canManageUsers,
} from '../auth/permissions';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../theme';

export function AdminUsersButton() {
  const { session } = useAuth();

  if (!canManageUsers(session?.role)) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="İşçiləri idarə et"
      onPress={() => {
        router.push('/users' as Href);
      }}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name="people-outline"
          size={23}
          color={colors.white}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          İşçilərin idarə edilməsi
        </Text>

        <Text style={styles.description}>
          İşçiləri gör, yarat və məlumatlarını dəyiş.
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={21}
        color={colors.white}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
  },

  pressed: {
    opacity: 0.78,
  },

  iconContainer: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  content: {
    flex: 1,
    marginHorizontal: spacing.md,
  },

  title: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  description: {
    color: colors.primarySoft,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 3,
  },
});