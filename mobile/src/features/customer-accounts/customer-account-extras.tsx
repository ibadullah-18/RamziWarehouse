import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';

import { getPriceRules, payOut, resetToday, savePriceRules, wipeAccount } from '../../api/customer-account-api';
import { confirmAction } from '../../components/dialogs';
import { MoneyInput, TextField } from '../../components/form-inputs';
import { dismissKeyboard } from '../../components/keyboard-form';
import { colors } from '../../theme';
import { Btn, Card, Line, Notice, SectionTitle, money, moneyShort } from './account-ui';
import { CustomerAccountDetails, PriceRule } from './customer-account-types';
import { parseMoney } from './settlement-math';
import { errorText } from './use-account-session';

/**
 * The customer's return prices by wallpaper code start: "10" -> 26 ₼ covers 1001-1047,
 * "50" -> 23 ₼ covers 5001-5058. New wallpapers get a new row. A return for this customer is
 * priced from this list automatically (showcase items are free).
 */
export function PriceListCard({ customerId, token, canEdit }: { customerId: string; token: string; canEdit: boolean }) {
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [draft, setDraft] = useState<{ prefix: string; price: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPriceRules(token, customerId)
      .then((result) => active && setRules(result))
      .catch((e) => active && setError(errorText(e, 'Qiymətlər alınmadı.')));
    return () => {
      active = false;
    };
  }, [token, customerId]);

  async function save() {
    if (!draft) return;
    const cleaned = draft.filter((row) => row.prefix.trim() || row.price.trim());
    const parsed: PriceRule[] = [];
    for (const row of cleaned) {
      const price = parseMoney(row.price);
      if (!/^\d{1,10}$/.test(row.prefix.trim()) || price === null || price <= 0) {
        setError('Hər sətirdə kodun başlanğıcını (məsələn 10) və qiyməti yazın.');
        return;
      }
      parsed.push({ codePrefix: row.prefix.trim(), price });
    }
    setBusy(true);
    setError('');
    try {
      setRules(await savePriceRules(token, customerId, parsed));
      setDraft(null);
    } catch (e) {
      setError(errorText(e, 'Qiymətlər saxlanmadı.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Vazvrad qiymətləri</SectionTitle>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
        Kodun başlanğıcına görə 1 ədədin qiyməti. Vazvrad yaradılanda məbləğ bu siyahıdan avtomatik hesablanır; vitrin
        hesablanmır.
      </Text>
      {draft === null ? (
        <>
          {rules.length === 0 ? (
            <Text style={{ color: colors.textLight }}>Qiymət yazılmayıb.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {rules.map((rule) => (
                <View
                  key={rule.codePrefix}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: colors.primarySoft,
                  }}
                >
                  <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>
                    {rule.codePrefix}… → {moneyShort(rule.price)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {canEdit ? (
            <Btn
              compact
              variant="secondary"
              icon="pricetags-outline"
              title={rules.length ? 'Qiymətləri dəyiş' : 'Qiymət əlavə et'}
              onPress={() => setDraft(rules.map((rule) => ({ prefix: rule.codePrefix, price: String(rule.price) })))}
            />
          ) : null}
        </>
      ) : (
        <>
          {draft.map((row, index) => (
            <View key={index} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Kod başlanğıcı</Text>
                <TextInput
                  value={row.prefix}
                  onChangeText={(text) =>
                    setDraft((rows) => rows!.map((r, i) => (i === index ? { ...r, prefix: text.replace(/\D/g, '').slice(0, 10) } : r)))
                  }
                  keyboardType="number-pad"
                  inputMode="numeric"
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={dismissKeyboard}
                  placeholder="10"
                  placeholderTextColor={colors.textLight}
                  style={{
                    minHeight: 50,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    backgroundColor: colors.surface,
                    color: colors.text,
                    paddingHorizontal: 12,
                    fontSize: 17,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <MoneyInput
                  label="Qiymət (1 ədəd)"
                  value={row.price}
                  onChangeText={(text) => setDraft((rows) => rows!.map((r, i) => (i === index ? { ...r, price: text } : r)))}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sətri sil"
                onPress={() => setDraft((rows) => rows!.filter((_, i) => i !== index))}
                style={{ minHeight: 50, justifyContent: 'center', paddingHorizontal: 6 }}
              >
                <Text style={{ color: colors.danger, fontSize: 22, fontWeight: '700' }}>×</Text>
              </Pressable>
            </View>
          ))}
          <Btn compact variant="secondary" icon="add" title="Sətir əlavə et" onPress={() => setDraft((rows) => [...rows!, { prefix: '', price: '' }])} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn compact title="Saxla" onPress={() => void save()} busy={busy} style={{ flex: 1 }} />
            <Btn compact variant="secondary" title="Ləğv et" onPress={() => setDraft(null)} disabled={busy} style={{ flex: 1 }} />
          </View>
        </>
      )}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Card>
  );
}

/**
 * When the customer's returns are worth more than the debt, we owe them money. Giving it back
 * in cash or by card clears our debt and is taken out of the day's collected money.
 */
export function PayoutCard({
  details,
  token,
  onSaved,
}: {
  details: CustomerAccountDetails;
  token: string;
  onSaved: (details: CustomerAccountDetails) => void;
}) {
  const [cash, setCash] = useState('');
  const [card, setCard] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef<string | null>(null);
  const owed = details.advance;

  async function save() {
    const cashValue = parseMoney(cash);
    const cardValue = parseMoney(card);
    if (cashValue === null || cardValue === null || cashValue + cardValue <= 0) {
      setError('Verilən məbləği yazın.');
      return;
    }
    if (cashValue + cardValue > owed) {
      setError(`Borcumuz ${money(owed)}; ondan çox vermək olmaz.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      operation.current ??= randomUUID();
      onSaved(
        await payOut(token, {
          operationId: operation.current,
          customerId: details.customerId,
          cash: cashValue,
          card: cardValue,
          note: null,
        }),
      );
      operation.current = null;
      setCash('');
      setCard('');
    } catch (e) {
      setError(errorText(e, 'Ödəniş saxlanmadı.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card tone="warning">
      <SectionTitle>Müştəriyə verilən məbləğ</SectionTitle>
      <Line label="Bizim müştəriyə borcumuz" value={money(owed)} strong tone="bad" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <MoneyInput label="Nağd verdim" value={cash} onChangeText={setCash} />
        </View>
        <View style={{ flex: 1 }}>
          <MoneyInput label="Kartla verdim" value={card} onChangeText={setCard} />
        </View>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Verilən pul günün yığılan pulundan çıxılır.</Text>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Btn title="Müştəriyə ver" icon="cash-outline" onPress={() => void save()} busy={busy} />
    </Card>
  );
}

type ResetKind = 'today' | 'all';

/** "Bu günkü əməliyyatları sıfırla" and "Bütün hesabı sıfırla", each with a reason and a confirmation. */
export function ResetCard({
  customerId,
  customerName,
  token,
  canResetToday,
  canWipe,
  onSaved,
}: {
  customerId: string;
  customerName: string;
  token: string;
  canResetToday: boolean;
  canWipe: boolean;
  onSaved: (details: CustomerAccountDetails) => void;
}) {
  const [kind, setKind] = useState<ResetKind | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!canResetToday && !canWipe) return null;

  const texts = {
    today: {
      title: 'Bu günkü əməliyyatları sıfırla',
      body: `${customerName} üçün bu gün yazılan hər şey (borc, ödəniş, vazvrat, bonus, düzəliş) silinəcək, sanki bu gün heç nə olmayıb.`,
    },
    all: {
      title: 'Bütün hesabı sıfırla',
      body: `${customerName} müştərisinin bütün borcu, ödənişləri və tarixçəsi silinəcək; borc 0 olacaq, yeni müştəri kimi.`,
    },
  } as const;

  function run() {
    if (!kind) return;
    if (reason.trim().length < 3) {
      setError('Səbəbi yazın (ən azı 3 hərf).');
      return;
    }
    confirmAction({
      title: `${texts[kind].title}?`,
      message: `${texts[kind].body} Bu geri qaytarılmır.`,
      confirmText: 'Bəli, sil',
      destructive: true,
      onConfirm: () => void execute(kind),
    });
  }

  async function execute(which: ResetKind) {
    setBusy(true);
    setError('');
    try {
      const result =
        which === 'today' ? await resetToday(token, customerId, reason.trim()) : await wipeAccount(token, customerId, reason.trim());
      onSaved(result);
      setKind(null);
      setReason('');
    } catch (e) {
      setError(errorText(e, 'Sıfırlama alınmadı.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Səhv yazılıbsa</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {canResetToday ? (
          <Btn compact variant="danger" icon="refresh" title="Bu günü sıfırla" onPress={() => setKind('today')} style={{ flex: 1 }} />
        ) : null}
        {canWipe ? (
          <Btn compact variant="danger" icon="trash-outline" title="Bütün hesabı sıfırla" onPress={() => setKind('all')} style={{ flex: 1 }} />
        ) : null}
      </View>
      <Modal visible={kind !== null} animationType="slide" onRequestClose={() => setKind(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAwareScrollView
            bottomOffset={62}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' }}
          >
            {kind ? (
              <>
                <Text style={{ color: colors.danger, fontSize: 22, fontWeight: '700' }}>{texts[kind].title}</Text>
                <Notice tone="error">{texts[kind].body}</Notice>
                <TextField label="Səbəb (məcburi)" value={reason} onChangeText={setReason} maxLength={400} placeholder="Məsələn: səhv məbləğ yazılıb" />
                {error ? <Notice tone="error">{error}</Notice> : null}
                <Btn variant="danger" title="Sıfırla" onPress={run} busy={busy} />
                <Btn variant="secondary" title="Ləğv et" onPress={() => setKind(null)} disabled={busy} />
              </>
            ) : null}
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </Modal>
    </Card>
  );
}
