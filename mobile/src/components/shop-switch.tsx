import { Switch, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

/**
 * "Sədərək dükanı": when on, the customer is listed and chosen in the açot. Returns still
 * show every customer, so the switch only keeps the daily account list short.
 */
export function ShopSwitch({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>Sədərək dükanı</Text>
        <Text style={styles.description}>
          {value
            ? 'Açotda görünür və açot yaradarkən seçilə bilər.'
            : 'Açotda görünmür. Vazvradda bütün müştərilər görünür.'}
        </Text>
      </View>
      <Switch
        accessibilityLabel="Sədərək dükanı"
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primarySoft }}
        thumbColor={value ? colors.primary : colors.textLight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  text: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  description: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
