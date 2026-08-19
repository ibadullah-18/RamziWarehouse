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

import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../theme';

type OrderReceiptActionProps = {
  orderId: string;
};

export function OrderReceiptAction({
  orderId,
}: OrderReceiptActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Qaimə çekini aç"
      onPress={() => {
        router.push(
          `/order-receipt/${orderId}` as Href,
        );
      }}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name="receipt-outline"
          size={25}
          color={colors.white}
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>
          Qaimə çekini hazırla
        </Text>

        <Text style={styles.description}>
          Ön baxış, PDF və WhatsApp göndərişi
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={22}
        color={colors.white}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryDark,
  },

  pressed: {
    opacity: 0.75,
  },

  iconContainer: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  textContainer: {
    flex: 1,
  },

  title: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  description: {
    color: '#D8E2F2',
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});