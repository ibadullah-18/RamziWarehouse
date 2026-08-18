import { colors } from '../../theme';
import { OrderStatus } from './order-types';

export interface OrderStatusInfo {
  label: string;
  shortLabel: string;
  color: string;
  backgroundColor: string;
}

export const orderStatusFilters: readonly {
  label: string;
  value: OrderStatus | null;
}[] = [
  {
    label: 'Hamısı',
    value: null,
  },
  {
    label: 'Yeni',
    value: OrderStatus.Created,
  },
  {
    label: 'Hazırlanır',
    value: OrderStatus.InPreparation,
  },
  {
    label: 'Təhvil gözləyir',
    value: OrderStatus.ReadyForDelivery,
  },
  {
    label: 'Təhvil verilib',
    value: OrderStatus.Delivered,
  },
  {
    label: 'Ləğv edilib',
    value: OrderStatus.Cancelled,
  },
];

export function getOrderStatusInfo(
  status: OrderStatus,
): OrderStatusInfo {
  switch (status) {
    case OrderStatus.Created:
      return {
        label: 'Yeni yaradılıb',
        shortLabel: 'Yeni',
        color: colors.primary,
        backgroundColor: colors.primarySoft,
      };

    case OrderStatus.InPreparation:
      return {
        label: 'Hazırlanır',
        shortLabel: 'Hazırlanır',
        color: colors.warning,
        backgroundColor: colors.warningSoft,
      };

    case OrderStatus.ReadyForDelivery:
      return {
        label: 'Təhvil gözləyir',
        shortLabel: 'Hazırdır',
        color: colors.success,
        backgroundColor: colors.successSoft,
      };

    case OrderStatus.Delivered:
      return {
        label: 'Təhvil verilib',
        shortLabel: 'Təhvil verilib',
        color: '#356F64',
        backgroundColor: '#E8F3F0',
      };

    case OrderStatus.Cancelled:
      return {
        label: 'Ləğv edilib',
        shortLabel: 'Ləğv edilib',
        color: colors.danger,
        backgroundColor: colors.dangerSoft,
      };

    default:
      return {
        label: 'Naməlum status',
        shortLabel: 'Naməlum',
        color: colors.textSecondary,
        backgroundColor: colors.surfaceSecondary,
      };
  }
}