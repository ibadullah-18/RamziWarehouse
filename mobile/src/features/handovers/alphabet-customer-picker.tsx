import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCustomers } from '../../api/customers-api';
import { colors } from '../../theme';
import type { Customer } from '../orders/create-order-types';

/** Azerbaijani alphabet order for the letter bar and the groups. */
const LETTERS = ['A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F', 'G', 'Ğ', 'H', 'X', 'I', 'İ', 'J', 'K', 'Q', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z', '#'];
const HEADER_HEIGHT = 30;
const ROW_HEIGHT = 58;

type Row =
  | { kind: 'header'; key: string; letter: string; offset: number }
  | { kind: 'customer'; key: string; customer: Customer; offset: number };

const letterOf = (name: string) => {
  const first = name.trim().charAt(0).toLocaleUpperCase('az-AZ');
  return LETTERS.includes(first) ? first : '#';
};

const normalize = (value: string) => value.toLocaleLowerCase('az-AZ').trim();

/**
 * Full-screen customer picker for the handover: search at the top and, on the left, the
 * alphabet like the phone's contacts — slide a finger over the letters and the list jumps to
 * the names starting with that letter.
 */
export function AlphabetCustomerPicker({
  visible,
  token,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  token: string;
  selectedId?: string | null;
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}) {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<Row>>(null);
  const barHeight = useRef(1);
  const barTop = useRef(0);

  const load = useCallback(async () => {
    try {
      const list = await getCustomers(token, { isActive: true });
      setError('');
      setCustomers([...list].sort((a, b) => a.name.localeCompare(b.name, 'az-AZ', { sensitivity: 'base' })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Müştərilər alınmadı.');
    }
  }, [token]);


  const rows = useMemo<Row[]>(() => {
    const query = normalize(search);
    const digits = query.replace(/\D/g, '');
    const filtered = (customers ?? []).filter(
      (c) =>
        !query ||
        normalize(c.name).includes(query) ||
        (digits.length >= 2 && (c.phoneNumber ?? '').replace(/\D/g, '').includes(digits)),
    );
    const groups = new Map<string, Customer[]>();
    for (const customer of filtered) {
      const letter = letterOf(customer.name);
      groups.set(letter, [...(groups.get(letter) ?? []), customer]);
    }
    const result: Row[] = [];
    let offset = 0;
    for (const letter of LETTERS) {
      const group = groups.get(letter);
      if (!group) continue;
      result.push({ kind: 'header', key: `h-${letter}`, letter, offset });
      offset += HEADER_HEIGHT;
      for (const customer of group) {
        result.push({ kind: 'customer', key: customer.id, customer, offset });
        offset += ROW_HEIGHT;
      }
    }
    return result;
  }, [customers, search]);

  const available = useMemo(() => new Set(rows.filter((r) => r.kind === 'header').map((r) => (r as { letter: string }).letter)), [rows]);

  const jumpTo = useCallback(
    (letter: string) => {
      // Jump to this letter, or the next one that has names.
      const start = LETTERS.indexOf(letter);
      const target = LETTERS.slice(start).find((l) => available.has(l)) ?? [...LETTERS].reverse().find((l) => available.has(l));
      if (!target) return;
      const header = rows.find((r) => r.kind === 'header' && r.letter === target);
      if (header) listRef.current?.scrollToOffset({ offset: header.offset, animated: false });
    },
    [available, rows],
  );

  const letterAt = useCallback((pageY: number) => {
    const ratio = Math.min(Math.max((pageY - barTop.current) / barHeight.current, 0), 0.999);
    return LETTERS[Math.floor(ratio * LETTERS.length)];
  }, []);

  // Finger on the letter bar: jump while it slides (like the phone's contacts).
  const touchLetter = (pageY: number) => {
    const letter = letterAt(pageY);
    if (activeRef.current === letter) return;
    activeRef.current = letter;
    setActiveLetter(letter);
    jumpTo(letter);
  };
  const releaseLetter = () => {
    activeRef.current = null;
    setActiveLetter(null);
  };

  const barRef = useRef<View>(null);
  const measureBar = (event: LayoutChangeEvent) => {
    barHeight.current = Math.max(event.nativeEvent.layout.height, 1);
    barRef.current?.measureInWindow((_x, y) => {
      barTop.current = y;
    });
  };

  const close = () => {
    setSearch('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={close}
      presentationStyle="fullScreen"
      onShow={() => {
        if (!customers) void load();
      }}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Bağla" onPress={close} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Müştəri seçin</Text>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textLight} />
          <TextInput
            value={search}
            keyboardType="default"
            inputMode="text"
            onChangeText={setSearch}
            placeholder="Ad və ya telefon"
            placeholderTextColor={colors.textLight}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={styles.searchInput}
          />
          {search ? (
            <Pressable accessibilityLabel="Axtarışı təmizlə" onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <Pressable onPress={() => void load()} style={styles.center}>
            <Text style={{ color: colors.danger, textAlign: 'center' }}>{error}{'\n'}Yenidən sınamaq üçün toxunun</Text>
          </Pressable>
        ) : !customers ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={styles.body}>
            <View
              ref={barRef}
              style={styles.bar}
              onLayout={measureBar}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={(event) => touchLetter(event.nativeEvent.pageY)}
              onResponderMove={(event) => touchLetter(event.nativeEvent.pageY)}
              onResponderRelease={releaseLetter}
              onResponderTerminate={releaseLetter}
            >
              {LETTERS.map((letter) => (
                <Text
                  key={letter}
                  style={[
                    styles.barLetter,
                    !available.has(letter) && styles.barLetterOff,
                    activeLetter === letter && styles.barLetterOn,
                  ]}
                >
                  {letter}
                </Text>
              ))}
            </View>
            <FlatList
              ref={listRef}
              data={rows}
              keyExtractor={(row) => row.key}
              keyboardShouldPersistTaps="handled"
              getItemLayout={(_data, index) => {
                const row = rows[index];
                return { index, offset: row.offset, length: row.kind === 'header' ? HEADER_HEIGHT : ROW_HEIGHT };
              }}
              initialNumToRender={30}
              ListEmptyComponent={<Text style={styles.empty}>Müştəri tapılmadı.</Text>}
              renderItem={({ item }) =>
                item.kind === 'header' ? (
                  <View style={styles.header}>
                    <Text style={styles.headerText}>{item.letter}</Text>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setSearch('');
                      onSelect(item.customer);
                    }}
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primarySoft }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{item.customer.name}</Text>
                      {item.customer.phoneNumber ? <Text style={styles.phone}>{item.customer.phoneNumber}</Text> : null}
                    </View>
                    {item.customer.id === selectedId ? <Ionicons name="checkmark-circle" size={24} color={colors.success} /> : null}
                  </Pressable>
                )
              }
            />
            {activeLetter ? (
              <View pointerEvents="none" style={styles.bubble}>
                <Text style={styles.bubbleText}>{activeLetter}</Text>
              </View>
            ) : null}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  body: { flex: 1, flexDirection: 'row' },
  bar: { width: 30, paddingVertical: 4, justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' },
  barLetter: { color: colors.primary, fontSize: 11, fontWeight: '700', lineHeight: 13, userSelect: 'none' },
  barLetterOff: { color: colors.border },
  barLetterOn: { color: colors.white, backgroundColor: colors.primary, borderRadius: 6, overflow: 'hidden', paddingHorizontal: 3 },
  header: { height: HEADER_HEIGHT, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colors.surfaceSecondary },
  headerText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  phone: { color: colors.textLight, fontSize: 13, marginTop: 2 },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: 24 },
  bubble: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    top: '40%',
    marginLeft: -40,
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(29, 78, 216, 0.9)',
  },
  bubbleText: { color: colors.white, fontSize: 40, fontWeight: '800' },
});
