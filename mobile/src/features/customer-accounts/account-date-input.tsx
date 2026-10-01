import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme';
import { updateDatePart } from './account-navigation';

export default function AccountDateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parts = value.split('-');
  return (
    <View style={styles.row}>
      {[{ label: 'Gün', index: 2, length: 2 }, { label: 'Ay', index: 1, length: 2 }, { label: 'İl', index: 0, length: 4 }].map(field => (
        <View key={field.index} style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            accessibilityLabel={field.label}
            value={parts[field.index] ?? ''}
            onChangeText={digits => onChange(updateDatePart(value, field.index, digits))}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={field.length}
            autoCorrect={false}
            selectTextOnFocus
            placeholder={field.index === 0 ? 'İİİİ' : field.index === 1 ? 'AA' : 'GG'}
            placeholderTextColor={colors.textLight}
            style={styles.input}
          />
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, minWidth: 0, gap: 8 },
  label: { color: colors.textSecondary, fontSize: 15 },
  input: { color: colors.text, backgroundColor: colors.surface, borderColor: colors.inputBorder, borderWidth: 1, borderRadius: 12, minHeight: 56, padding: 12, fontSize: 18, textAlign: 'center' },
});
