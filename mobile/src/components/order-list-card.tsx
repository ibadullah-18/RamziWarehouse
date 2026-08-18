import { Ionicons } from '@expo/vector-icons';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    getOrderStatusInfo,
} from '../features/orders/order-status';
import {
    OrderListItem,
} from '../features/orders/order-types';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../theme';

interface OrderListCardProps {
  order: OrderListItem;
}

function formatDate(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'Tarix yoxdur';
  }

  return new Intl.DateTimeFormat('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function OrderListCard({
  order,
}: OrderListCardProps) {
  const statusInfo =
    getOrderStatusInfo(order.status);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.orderNumberContainer}>
          <View style={styles.receiptIcon}>
            <Ionicons
              name="receipt-outline"
              size={20}
              color={colors.primary}
            />
          </View>

          <View style={styles.orderNumberText}>
            <Text style={styles.orderNumberLabel}>
              Qaimə
            </Text>

            <Text
              style={styles.orderNumber}
              numberOfLines={1}
            >
              № {order.orderNumber}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                statusInfo.backgroundColor,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: statusInfo.color,
              },
            ]}
          >
            {statusInfo.shortLabel}
          </Text>
        </View>
      </View>

      <View style={styles.customerRow}>
        <Ionicons
          name="business-outline"
          size={18}
          color={colors.textSecondary}
        />

        <Text
          style={styles.customerName}
          numberOfLines={2}
        >
          {order.customerName}
        </Text>
      </View>

      <View style={styles.informationGrid}>
        <View style={styles.informationItem}>
          <Text style={styles.informationLabel}>
            Anbar
          </Text>

          <Text
            style={styles.informationValue}
            numberOfLines={1}
          >
            {order.warehouseName}
          </Text>
        </View>

        <View style={styles.informationItem}>
          <Text style={styles.informationLabel}>
            Tarix
          </Text>

          <Text style={styles.informationValue}>
            {formatDate(order.orderDate)}
          </Text>
        </View>

        <View style={styles.informationItem}>
          <Text style={styles.informationLabel}>
            Məhsul sətri
          </Text>

          <Text style={styles.informationValue}>
            {order.itemLineCount}
          </Text>
        </View>

        <View style={styles.informationItem}>
          <Text style={styles.informationLabel}>
            Ümumi say
          </Text>

          <Text style={styles.informationValue}>
            {order.totalQuantity} ədəd
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.userRow}>
        <View style={styles.userInformation}>
          <Ionicons
            name="person-outline"
            size={16}
            color={colors.textLight}
          />

          <Text
            style={styles.userText}
            numberOfLines={1}
          >
            Yaradan: {order.createdByFullName}
          </Text>
        </View>

        {order.preparedByFullName ? (
          <View style={styles.userInformation}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={colors.success}
            />

            <Text
              style={styles.userText}
              numberOfLines={1}
            >
              Yığan: {order.preparedByFullName}
            </Text>
          </View>
        ) : (
          <View style={styles.userInformation}>
            <Ionicons
              name="time-outline"
              size={16}
              color={colors.warning}
            />

            <Text style={styles.userText}>
              Hələ yığılmayıb
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  orderNumberContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  receiptIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },

  orderNumberText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  orderNumberLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },

  orderNumber: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: 2,
  },

  statusBadge: {
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },

  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  customerName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  informationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    rowGap: spacing.md,
  },

  informationItem: {
    width: '50%',
    paddingRight: spacing.md,
  },

  informationLabel: {
    color: colors.textLight,
    fontSize: fontSize.xs,
  },

  informationValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  userRow: {
    gap: spacing.sm,
  },

  userInformation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  userText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
});