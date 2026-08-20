import { Ionicons } from '@expo/vector-icons';
import {
    router,
    type Href,
} from 'expo-router';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { useAuth } from '../auth/auth-context';
import { canManageOperations } from '../auth/permissions';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../theme';

export function CustomersButton() {
  const { session } = useAuth();
  const canManage = canManageOperations(session?.role);

  return (
    <Pressable
      onPress={() => {
        router.push('/customers' as Href);
      }}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.icon}>
        <Ionicons
          name="storefront-outline"
          size={22}
          color={colors.primary}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Müştərilər</Text>
        <Text style={styles.description}>
          {canManage
            ? 'Müştərilərə bax, əlavə et və dəyiş'
            : 'Müştəri siyahısına bax'}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textLight}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  icon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  content: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.72,
  },
});