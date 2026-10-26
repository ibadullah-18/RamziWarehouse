import { useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import {
  adjustDebt,
  correctAccountPayment,
  correctDailyDebt,
  getCustomerAccountDetails,
  getCustomerMonth,
} from '../../api/customer-account-api';
import { MoneyInput, TextField } from '../../components/form-inputs';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { colors } from '../../theme';
import { dateLabel, monthKey, monthLabel, shiftMonth, todayKey } from './account-dates';
import {
  AccountPageShell,
  Btn,
  Card,
  Chip,
  Grid,
  Line,
  Loading,
  Notice,
  SectionTitle,
  Tile,
  TileRow,
  money,
  moneyShort,
  shortDate,
} from './account-ui';
import {
  CustomerAccountDay,
  CustomerAccountDetails,
  CustomerAccountEntry,
  CustomerAccountEntryType,
  CustomerMonth,
} from './customer-account-types';
import { parseMoney } from './settlement-math';
import { errorText, useAccountSession } from './use-account-session';

type Adjustment = { target: 'old' | 'daily'; mode: 'add' | 'set' };

type Correction =
  | { kind: 'daily'; date: string; current: number }
  | { kind: 'payment'; entry: CustomerAccountEntry };

const entryLabels: Partial<Record<CustomerAccountEntryType, string>> = {
  [CustomerAccountEntryType.OpeningBalance]: 'İlkin köhnə borc',
  [CustomerAccountEntryType.Debt]: 'Günlük borc',
  [CustomerAccountEntryType.Payment]: 'Ödəniş',
  [CustomerAccountEntryType.AdjustmentIncrease]: 'Köhnə borc artırıldı',
  [CustomerAccountEntryType.AdjustmentDecrease]: 'Köhnə borc azaldıldı',
  [CustomerAccountEntryType.DailyIncrease]: 'Günlük borc artırıldı',
  [CustomerAccountEntryType.DailyDecrease]: 'Günlük borc azaldıldı',
  [CustomerAccountEntryType.ReturnCredit]: 'Vazvrat',
  [CustomerAccountEntryType.Bonus]: 'Bonus',
  [CustomerAccountEntryType.CreditReversal]: 'Vazvrat geri alındı',
  [CustomerAccountEntryType.DailyToOld]: 'Günlük qalıq köhnə borca keçdi',
};

/** One customer: balances, the month's payments and the history with corrections. */
export default function CustomerDetailScreen({ customerId }: { customerId: string }) {
  const { token, canUse, isAdmin, canWriteOldDebt } = useAccountSession();
  const [details, setDetails] = useState<CustomerAccountDetails | null>(null);
  const [month, setMonth] = useState(monthKey(todayKey()));
  const [monthData, setMonthData] = useState<CustomerMonth | null>(null);
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const today = todayKey();
  const currentMonth = monthKey(today);

  const load = useCallback(async () => {
    if (!token || !customerId || !canUse) return;
    const serial = ++request.current;
    setError('');
    try {
      const [account, monthly] = await Promise.all([
        getCustomerAccountDetails(token, customerId),
        getCustomerMonth(token, customerId, month),
      ]);
      if (serial !== request.current) return;
      setDetails(account);
      setMonthData(monthly);
    } catch (e) {
      if (serial === request.current) setError(errorText(e, 'Müştəri açotu alınmadı.'));
    } finally {
      if (serial === request.current) setLoading(false);
    }
  }, [token, customerId, canUse, month]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        request.current++;
      };
    }, [load]),
  );

  const canCorrect = (day: CustomerAccountDay) => isAdmin || !day.isLocked;

  return (
    <AccountPageShell
      title={details?.customerName ?? 'Müştəri açotu'}
      subtitle={details?.phoneNumber ?? undefined}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
      {loading && !details ? (
        <Loading />
      ) : details ? (
        <>
          <TileRow>
            <Tile label="Köhnə borc" value={money(details.oldDebt)} tone={details.oldDebt > 0 ? 'warn' : undefined} />
            {details.carriedDebt > 0 ? <Tile label="Dünənki (saxlanılan)" value={money(details.carriedDebt)} tone="warn" /> : null}
            <Tile label="Bu günkü günlük" value={money(details.todayDebt)} tone={details.todayDebt > 0 ? 'warn' : undefined} />
            <Tile label="Cəmi borc" value={money(details.remainingDebt)} tone={details.remainingDebt > 0 ? 'warn' : 'good'} />
            {details.advance > 0 ? <Tile label="Avans" value={money(details.advance)} tone="good" /> : null}
          </TileRow>

          <Card>
            <SectionTitle>Borc əməliyyatları</SectionTitle>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              Kritik anda borcu dəqiq düzəldin. Hər dəyişiklik səbəbi və adınızla tarixçədə saxlanılır.
            </Text>
            <Grid columns={2}>
              {canWriteOldDebt ? (
                <Btn icon="add-circle-outline" variant="secondary" compact title="Köhnə borca əlavə et" onPress={() => setAdjustment({ target: 'old', mode: 'add' })} />
              ) : null}
              {canWriteOldDebt ? (
                <Btn icon="create-outline" variant="secondary" compact title="Köhnə borcu düzəlt" onPress={() => setAdjustment({ target: 'old', mode: 'set' })} />
              ) : null}
              <Btn icon="add-circle-outline" variant="secondary" compact title="Günlük borca əlavə et" onPress={() => setAdjustment({ target: 'daily', mode: 'add' })} />
              <Btn icon="create-outline" variant="secondary" compact title="Günlük borcu düzəlt" onPress={() => setAdjustment({ target: 'daily', mode: 'set' })} />
            </Grid>
          </Card>

          <SectionTitle>{monthLabel(month)} ödənişləri</SectionTitle>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Chip label="‹ Əvvəlki ay" onPress={() => setMonth(shiftMonth(month, -1))} />
            <View style={{ flex: 1 }} />
            <Chip label="Sonrakı ay ›" onPress={() => month < currentMonth && setMonth(shiftMonth(month, 1))} />
          </View>
          {monthData ? (
            <>
              <TileRow>
                <Tile label="Ödədi" value={money(monthData.collected)} tone="good" />
                <Tile label="Nağd" value={money(monthData.cash)} />
                <Tile label="Kart" value={money(monthData.card)} />
              </TileRow>
              {monthData.days.length === 0 ? (
                <Notice>Bu ayda qeyd yoxdur.</Notice>
              ) : (
                <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
                  {monthData.days.map((day, index) => {
                    const paid = day.cash + day.card;
                    return (
                      <View
                        key={day.businessDate}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          gap: 2,
                          borderTopWidth: index === 0 ? 0 : 1,
                          borderTopColor: colors.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', width: 46 }}>{shortDate(day.businessDate)}</Text>
                          <Text style={{ flex: 1, color: paid > 0 ? colors.success : colors.textLight, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                            {paid > 0
                              ? `Ödədi ${moneyShort(paid)}${day.cash > 0 && day.card > 0 ? ' (nağd+kart)' : day.card > 0 ? ' (kart)' : ''}`
                              : 'Ödəməyib'}
                          </Text>
                          <Text style={{ color: day.remaining > 0 ? colors.warning : colors.success, fontSize: 14, fontWeight: '800' }}>
                            Qalan {moneyShort(day.remaining)}
                          </Text>
                        </View>
                        {day.returnCredit > 0 || day.bonus > 0 ? (
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 56 }}>
                            {day.returnCredit > 0 ? `Vazvrat ${moneyShort(day.returnCredit)}` : ''}
                            {day.returnCredit > 0 && day.bonus > 0 ? ' · ' : ''}
                            {day.bonus > 0 ? `Bonus ${moneyShort(day.bonus)}` : ''}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </Card>
              )}
            </>
          ) : null}

          <SectionTitle>Əməliyyatlar</SectionTitle>
          <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
            {details.days.map((day, index) => {
              const open = expanded === day.businessDate;
              const dailyEntries = day.entries.filter((e) =>
                [CustomerAccountEntryType.Debt, CustomerAccountEntryType.DailyIncrease, CustomerAccountEntryType.DailyDecrease].includes(e.entryType),
              );
              const dailyCurrent = dailyEntries.reduce(
                (sum, e) => sum + (e.entryType === CustomerAccountEntryType.DailyDecrease ? -e.amount : e.amount),
                0,
              );
              const hasDebt = day.entries.some((e) => e.entryType === CustomerAccountEntryType.Debt);
              return (
                <View key={day.businessDate} style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border }}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setExpanded(open ? null : day.businessDate)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                  >
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', width: 46 }}>{shortDate(day.businessDate)}</Text>
                    <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                      {day.entries.length} qeyd{day.isLocked ? ' · bitib' : ''}
                    </Text>
                    <Text style={{ color: day.remainingDebt > 0 ? colors.warning : colors.success, fontSize: 14, fontWeight: '800' }}>
                      {moneyShort(day.remainingDebt)}
                    </Text>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textLight} />
                  </Pressable>
                  {open ? (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 10, gap: 6 }}>
                      {day.entries.map((entry) => (
                        <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                            {entryLabels[entry.entryType] ?? 'Qeyd'}
                            {entry.paymentMethod ? ` (${entry.paymentMethod === 'card' ? 'kart' : 'nağd'})` : ''}
                          </Text>
                          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{moneyShort(entry.amount)}</Text>
                          {entry.entryType === CustomerAccountEntryType.Payment && canCorrect(day) ? (
                            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setCorrection({ kind: 'payment', entry })}>
                              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Düzəlt</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ))}
                      {hasDebt && canCorrect(day) ? (
                        <Pressable
                          accessibilityRole="button"
                          hitSlop={8}
                          onPress={() => setCorrection({ kind: 'daily', date: day.businessDate, current: dailyCurrent })}
                        >
                          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Günlük borcu düzəlt</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>

          {details.audit.length > 0 ? (
            <>
              <SectionTitle>Düzəliş tarixçəsi</SectionTitle>
              {details.audit.slice(0, 10).map((audit, index) => (
                <Notice key={`${audit.entryId}-${index}`}>
                  {audit.userName}: {audit.description}
                </Notice>
              ))}
            </>
          ) : null}
        </>
      ) : null}

      {adjustment && details ? (
        <AdjustSheet
          adjustment={adjustment}
          customerId={details.customerId}
          token={token}
          current={adjustment.target === 'old' ? details.oldDebt : details.todayDebt}
          onClose={() => setAdjustment(null)}
          onSaved={(updated) => {
            setDetails(updated);
            setAdjustment(null);
            void load();
          }}
        />
      ) : null}

      {correction && details ? (
        <CorrectionSheet
          correction={correction}
          customerId={details.customerId}
          token={token}
          onClose={() => setCorrection(null)}
          onSaved={(updated) => {
            setDetails(updated);
            setCorrection(null);
            void load();
          }}
        />
      ) : null}
    </AccountPageShell>
  );
}

function CorrectionSheet({
  correction,
  customerId,
  token,
  onClose,
  onSaved,
}: {
  correction: Correction;
  customerId: string;
  token: string;
  onClose: () => void;
  onSaved: (details: CustomerAccountDetails) => void;
}) {
  const start = correction.kind === 'daily' ? correction.current : correction.entry.amount;
  const [amount, setAmount] = useState(String(start));
  const [method, setMethod] = useState<'cash' | 'card'>(
    correction.kind === 'payment' && correction.entry.paymentMethod === 'card' ? 'card' : 'cash',
  );
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const title = correction.kind === 'daily' ? `${dateLabel(correction.date)} günlük borcu düzəlt` : 'Ödənişi düzəlt';

  async function save() {
    const value = parseMoney(amount);
    if (value === null || (correction.kind === 'payment' && value <= 0)) {
      setError('Məbləği düzgün yazın.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Düzəlişin səbəbini yazın.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result =
        correction.kind === 'daily'
          ? await correctDailyDebt(token, { customerId, amount: value, reason: reason.trim(), date: correction.date })
          : await correctAccountPayment(token, {
              customerId,
              entryId: correction.entry.id,
              expectedAmount: correction.entry.amount,
              expectedPaymentMethod: correction.entry.paymentMethod,
              amount: value,
              paymentMethod: method,
              reason: reason.trim(),
            });
      onSaved(result);
    } catch (e) {
      setError(errorText(e, 'Düzəliş saxlanmadı.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <KeyboardAwareScrollView
          bottomOffset={62}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' }}
        >
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{title}</Text>
          <MoneyInput label="Düzgün məbləğ" value={amount} onChangeText={setAmount} />
          {correction.kind === 'payment' ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Chip label="Nağd" selected={method === 'cash'} onPress={() => setMethod('cash')} />
              <Chip label="Kart" selected={method === 'card'} onPress={() => setMethod('card')} />
            </View>
          ) : null}
          <TextField label="Düzəlişin səbəbi" value={reason} onChangeText={setReason} maxLength={400} />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Btn title="Düzəlişi saxla" onPress={() => void save()} busy={busy} />
          <Btn title="Ləğv et" variant="secondary" onPress={onClose} disabled={busy} />
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const adjustTitles: Record<string, string> = {
  'old-add': 'Köhnə borca əlavə et',
  'old-set': 'Köhnə borcu düzəlt',
  'daily-add': 'Bu günkü günlük borca əlavə et',
  'daily-set': 'Bu günkü günlük borcu düzəlt',
};

/** Add to or set the old debt or the daily debt of today; shows the result before saving. */
function AdjustSheet({
  adjustment,
  customerId,
  token,
  current,
  onClose,
  onSaved,
}: {
  adjustment: Adjustment;
  customerId: string;
  token: string;
  current: number;
  onClose: () => void;
  onSaved: (details: CustomerAccountDetails) => void;
}) {
  const [amount, setAmount] = useState(adjustment.mode === 'set' ? String(current) : '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const value = parseMoney(amount);
  const result = value === null ? null : adjustment.mode === 'add' ? current + value : value;
  const label = adjustment.target === 'old' ? 'köhnə borc' : 'bu günkü günlük borc';

  async function save() {
    if (value === null || (adjustment.mode === 'add' && value <= 0)) {
      setError('Məbləği düzgün yazın.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Səbəbi yazın (ən azı 3 hərf).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onSaved(
        await adjustDebt(token, {
          customerId,
          target: adjustment.target,
          mode: adjustment.mode,
          amount: value,
          reason: reason.trim(),
        }),
      );
    } catch (e) {
      setError(errorText(e, 'Dəyişiklik saxlanmadı.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <KeyboardAwareScrollView
          bottomOffset={62}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' }}
        >
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>
            {adjustTitles[`${adjustment.target}-${adjustment.mode}`]}
          </Text>
          <Card>
            <Line label={`Hazırkı ${label}`} value={money(current)} />
            {result !== null ? <Line label={`Yeni ${label}`} value={money(result)} strong tone="warn" /> : null}
          </Card>
          <MoneyInput
            label={adjustment.mode === 'add' ? 'Əlavə ediləcək məbləğ' : `Düzgün ${label}`}
            value={amount}
            onChangeText={setAmount}
          />
          <TextField label="Səbəb (məcburi)" value={reason} onChangeText={setReason} maxLength={400} placeholder="Məsələn: axşam sifarişi" />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Btn title="Saxla" onPress={() => void save()} busy={busy} />
          <Btn title="Ləğv et" variant="secondary" onPress={onClose} disabled={busy} />
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </Modal>
  );
}
