import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getReturnStatusLabel, getReturnTypeSummary } from '../features/product-returns/product-return-status';
import { ProductReturn } from '../features/product-returns/product-return-types';
import { colors } from '../theme';

const money = (value: number) =>
  `${value.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;

/** One return or showcase item in a list: date, customer, codes and the credited state. */
export function ReturnCard({
  record,
  highlight,
  onPress,
}: {
  record: ProductReturn;
  /** Text to emphasise in codes, e.g. the code being searched. */
  highlight?: string;
  onPress: () => void;
}) {
  const date = new Date(record.returnDateUtc).toLocaleDateString('az-AZ', {
    timeZone: 'Asia/Baku',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const needle = highlight?.trim();
  const quantity = record.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.top}>
        <Text style={styles.customer} numberOfLines={2}>
          {record.customerName}
        </Text>
        <Text style={styles.type}>{getReturnTypeSummary(record.items.map((item) => item.productType))}</Text>
      </View>
      <View style={styles.top}>
        <Text style={styles.status}>{getReturnStatusLabel(record.status)}</Text>
      </View>
      <Text style={styles.muted}>
        {date} · {record.warehouseName}
        {record.returnPersonName ? ` · ${record.returnPersonName}` : ''}
      </Text>
      {record.items.slice(0, 4).map((item) => {
        const matches = Boolean(needle) && (item.productCode.includes(needle!) || item.batchNumber.includes(needle!));
        return (
          <Text key={item.id} style={[styles.code, matches && styles.match]}>
            Kod {item.productCode} · Partiya {item.batchNumber} · {item.quantity} ədəd
          </Text>
        );
      })}
      {record.items.length > 4 ? <Text style={styles.muted}>+ {record.items.length - 4} digər məhsul</Text> : null}
      <View style={styles.bottom}>
        <Text style={styles.muted}>{quantity} ədəd</Text>
        {record.amount > 0 ? (
          <Text style={[styles.badge, record.appliedAmount > 0 && styles.applied]}>
            {money(record.amount)}
            {record.appliedAmount > 0 ? ' · borcdan çıxılıb' : ''}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  customer: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' },
  status: { color: colors.warning, fontSize: 14, fontWeight: '600' },
  type: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  muted: { color: colors.textSecondary, fontSize: 14 },
  code: { color: colors.text, fontSize: 16, lineHeight: 23 },
  match: { color: colors.primary, fontWeight: '700' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  badge: { color: colors.warning, fontSize: 14, fontWeight: '600' },
  applied: { color: colors.success },
});
