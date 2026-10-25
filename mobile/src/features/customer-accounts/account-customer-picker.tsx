import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAllCustomerAccounts } from '../../api/customer-account-api';
import { TextField } from '../../components/form-inputs';
import { colors } from '../../theme';
import { Btn, money } from './account-ui';
import { CustomerAccountSummary } from './customer-account-types';

/** Lists only the account customers (Sədərək shops and anyone who still owes money). */
export default function AccountCustomerPicker({
  visible,
  token,
  excludeIds = [],
  onClose,
  onSelect,
}: {
  visible: boolean;
  token: string;
  excludeIds?: string[];
  onClose: () => void;
  onSelect: (customer: CustomerAccountSummary) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Mounted only while open, so the list is fetched fresh every time. */}
      {visible ? <PickerBody token={token} excludeIds={excludeIds} onClose={onClose} onSelect={onSelect} /> : null}
    </Modal>
  );
}

function PickerBody({
  token,
  excludeIds,
  onClose,
  onSelect,
}: {
  token: string;
  excludeIds: string[];
  onClose: () => void;
  onSelect: (customer: CustomerAccountSummary) => void;
}) {
  const [items, setItems] = useState<CustomerAccountSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getAllCustomerAccounts(token)
      .then((result) => active && setItems(result.filter((customer) => customer.isActive)))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Müştərilər alınmadı.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('az-AZ');
    return items.filter(
      (customer) =>
        !excludeIds.includes(customer.customerId) &&
        (!query || customer.customerName.toLocaleLowerCase('az-AZ').includes(query)),
    );
  }, [items, search, excludeIds]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.title}>Müştəri seçin</Text>
        <TextField label="Axtar" value={search} onChangeText={setSearch} placeholder="Ad yazın" autoCorrect={false} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        <FlatList
          data={visibleItems}
          keyExtractor={(customer) => customer.customerId}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={loading ? null : <Text style={styles.empty}>Uyğun müştəri yoxdur.</Text>}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(item)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.name} numberOfLines={2}>
                {item.customerName}
              </Text>
              <Text style={styles.debt}>{money(item.remainingDebt)}</Text>
            </Pressable>
          )}
        />
        <Btn title="Bağla" variant="secondary" onPress={onClose} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, padding: 16, gap: 12, width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  list: { gap: 8, paddingBottom: 12 },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  name: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '600' },
  debt: { color: colors.textSecondary, fontSize: 15 },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: 24 },
  error: { color: colors.danger },
});
