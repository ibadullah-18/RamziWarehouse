import { useCallback, useRef, useState } from 'react';
import { Href, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { closeAccountDay, correctDailyDebt, correctPreviousDebt, createCustomerAccount, getAccountReport, getAccountReportHistory, getCustomerAccountDetails, getCustomerAccounts, recordCustomerPayment } from '../../api/customer-account-api';
import { useAuth } from '../../auth/auth-context';
import { UserRole } from '../../auth/auth-types';
import { AccountDayReport, AccountReportHistory, CustomerAccountDetails, CustomerAccountSummary } from './customer-account-types';
import { colors } from '../../theme';
export const todayKey = () => new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 10);
const money = (n: number) => `${n.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;
const dateLabel = (s: string) => s.split('-').reverse().join('.');
type Mode = 'home' | 'daily' | 'customers' | 'detail' | 'history' | 'reports' | 'report' | 'debt' | 'old' | 'correct' | 'payment';
function Button({ title, onPress, disabled = false, secondary = false }: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    secondary?: boolean;
}) {
    return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && { opacity: .45 }]}><Text style={[styles.buttonText, secondary && { color: colors.text }]}>{title}</Text></Pressable>;
}
function Amount({ label, value }: {
    label: string;
    value: number;
}) { return <View style={styles.amount}><Text style={styles.muted}>{label}</Text><Text style={styles.value}>{money(value)}</Text></View>; }
export default function AccountScreen({ mode }: {
    mode: Mode;
}) {
    const router = useRouter();
    const params = useLocalSearchParams<{
        id?: string;
        date?: string;
    }>();
    const { session } = useAuth();
    const token = session?.accessToken ?? '';
    const driver = session?.role === UserRole.Driver;
    const editor = [UserRole.Admin, UserRole.Manager, UserRole.Accountant].includes(session?.role ?? UserRole.WarehouseWorker);
    const [list, setList] = useState<CustomerAccountSummary[]>([]), [details, setDetails] = useState<CustomerAccountDetails | null>(null), [report, setReport] = useState<AccountDayReport | null>(null);
    const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [search, setSearch] = useState('');
    const [amount, setAmount] = useState(''), [initial, setInitial] = useState(''), [reason, setReason] = useState(''), [method, setMethod] = useState<'cash' | 'card'>('cash');
    const [date, setDate] = useState(todayKey);
    const [history, setHistory] = useState<AccountReportHistory[]>([]);
    const focused = useRef(false);
    const lock = useRef(false);
    const request = useRef(0);
    const go = (target: Mode, id?: string, day?: string) => router.push(('/account/' + target + '?' + new URLSearchParams({ ...(id ? { id } : {}), ...(day ? { date: day } : {}) }).toString()) as Href);
    const load = useCallback(async () => {
        const serial = ++request.current;
        setLoading(true);
        setError('');
        try {
            if (['daily', 'customers'].includes(mode)) {
                let page = 1, items: CustomerAccountSummary[] = [];
                let total = 0;
                do {
                    const result = await getCustomerAccounts(token, { pageNumber: page++, pageSize: 100 });
                    items = items.concat(result.items);
                    total = result.totalCount;
                } while (items.length < total);
                if (serial === request.current)
                    setList(items);
            }
            else if (params.id) {
                const result = await getCustomerAccountDetails(token, params.id);
                if (serial === request.current)
                    setDetails(result);
            }
            else if (mode === 'reports') {
                const result = await getAccountReportHistory(token);
                if (serial === request.current)
                    setHistory(result);
            }
            else if (mode === 'report') {
                const result = await getAccountReport(token, params.date ?? todayKey());
                if (serial === request.current)
                    setReport(result);
            }
        }
        catch (e) {
            if (serial === request.current)
                setError(e instanceof Error ? e.message : 'Məlumat alınmadı.');
        }
        finally {
            if (serial === request.current)
                setLoading(false);
        }
    }, [mode, params.id, params.date, token]);
    useFocusEffect(useCallback(() => { focused.current = true; void load(); return () => { focused.current = false; request.current++; }; }, [load]));
    const submit = async () => {
        if (lock.current || !params.id)
            return;
        const raw = amount.trim().replace(',', '.');
        const value = Number(raw);
        if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(value) || value < 0) {
            setError('Düzgün məbləğ yazın (məsələn, 150,50).');
            return;
        }
        if (['old', 'correct'].includes(mode) && reason.trim().length < 3) {
            setError('Düzəlişin səbəbini yazın.');
            return;
        }
        lock.current = true;
        setBusy(true);
        setError('');
        try {
            if (mode === 'payment')
                await recordCustomerPayment(token, { customerId: params.id, amount: value, paymentMethod: method, note: null });
            else if (mode === 'old')
                await correctPreviousDebt(token, { customerId: params.id, correctedPreviousDebt: value, reason });
            else if (mode === 'correct')
                await correctDailyDebt(token, { customerId: params.id, amount: value, reason });
            else {
                const initialRaw = initial.trim().replace(',', '.');
                if (initialRaw && !/^\d+(\.\d{1,2})?$/.test(initialRaw))
                    throw new Error('İlkin borcu düzgün yazın.');
                await createCustomerAccount(token, { customerId: params.id, todayDebt: value, initialPreviousDebt: details?.days.length ? null : Number(initialRaw || 0), note: reason.trim() || null });
            }
            if (focused.current)
                router.back();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Əməliyyat alınmadı.');
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    };
    const titles: Record<Mode, string> = { home: 'Açot', daily: driver ? 'Günlük açot' : 'Günlük açot yarat', customers: 'Bütün müştərilər', detail: details?.customerName ?? 'Müştəri açotu', history: 'Ödəniş və açot tarixçəsi', reports: 'Günün yekun açotu', report: dateLabel(params.date ?? todayKey()), debt: 'Günlük borc yarat', old: 'Köhnə borcu düzəlt', correct: 'Bugünkü borcu düzəlt', payment: 'Ödəniş qeyd et' };
    const isForm = ['debt', 'old', 'correct', 'payment'].includes(mode);
    const visible = list.filter(c => c.customerName.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (mode !== 'daily' || !driver || c.todayDebt > 0 || c.carriedDailyDebt > 0));
    const pay = Number(amount.replace(',', '.')) || 0;
    const paidToday = Math.min(pay, details?.todayDebtRemaining ?? 0);
    const paidCarry = Math.min(Math.max(0, pay - paidToday), details?.carriedDailyDebt ?? 0);
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.primary}/>}>
    <View style={styles.header}>{mode !== 'home' && <Pressable accessibilityLabel="Geri" onPress={() => { if (!busy)
        router.back(); }} style={styles.back}><Text style={styles.value}>‹</Text></Pressable>}<Text style={styles.title}>{titles[mode]}</Text></View>
    {error !== '' && <View style={styles.error}><Text style={{ color: colors.danger }}>{error}</Text><Button secondary title="Yenidən yoxla" onPress={() => void load()}/></View>}
    {loading && <ActivityIndicator color={colors.primary}/>}
    {mode === 'home' && <><Text style={styles.muted}>{dateLabel(todayKey())} · {driver ? 'Sürücü' : 'Açot operatoru'}</Text><Button title={driver ? 'Günlük açot' : 'Günlük açot yarat'} onPress={() => go('daily')}/><Button secondary title="Günün yekun açotunu gör" onPress={() => go('reports')}/>{driver && <Button secondary title="Bütün müştərilərin borcları" onPress={() => go('customers')}/>}</>}
    {['daily', 'customers'].includes(mode) && <><TextInput placeholder="Müştərinin adını axtar" placeholderTextColor={colors.textLight} value={search} onChangeText={setSearch} style={styles.input}/>{visible.map(c => <Pressable key={c.customerId} onPress={() => go('detail', c.customerId)} style={styles.card}><View style={styles.row}><Text style={styles.name}>{c.customerName}</Text>{c.hasUnpaidDailyDebt && <Text accessibilityLabel="Ödənilməmiş günlük borc" style={styles.badge}>●</Text>}<Text style={styles.muted}>›</Text></View>{driver && <Text style={styles.muted}>Günlük: {money(c.todayDebtRemaining + c.carriedDailyDebt)}</Text>}</Pressable>)}{!loading && !visible.length && <Text style={styles.muted}>Bu siyahıda müştəri yoxdur.</Text>}</>}
    {mode === 'detail' && details && <><View style={styles.card}><Amount label="Köhnə borc" value={details.oldDebtRemaining}/><Amount label="Əvvəlki günlərdən qalan günlük borc" value={details.carriedDailyDebt}/><Amount label="Bugünkü qalıq borc" value={details.todayDebtRemaining}/><Amount label="Bu gün yazılmış borc" value={details.days.find(d=>d.businessDate===todayKey())?.addedDebt??0}/><Amount label="Bu gün ödənilib" value={details.days.find(d=>d.businessDate===todayKey())?.paidAmount??0}/><Amount label="Ümumi qalıq" value={details.remainingDebt}/></View>{editor && <><Button title="Günlük borc yarat" onPress={() => go('debt', params.id)}/><Button secondary title="Bugünkü borcu düzəlt" onPress={() => go('correct', params.id)}/><Button secondary title="Köhnə borcu düzəlt" onPress={() => go('old', params.id)}/></>}{(driver || session?.role === UserRole.Admin || session?.role === UserRole.Manager) && <Button title="Ödəniş qeyd et" disabled={details.remainingDebt <= 0} onPress={() => go('payment', params.id)}/>}<Button secondary title="Müştərinin ödəniş tarixçəsi" onPress={() => go('history', params.id)}/></>}
    {isForm && details && <><Text style={styles.name}>{details.customerName}</Text><View style={styles.card}><Amount label="Köhnə borc" value={details.oldDebtRemaining}/><Amount label="Əvvəlki günlük qalıq" value={details.carriedDailyDebt}/><Amount label="Bugünkü qalıq" value={details.todayDebtRemaining}/></View>{(!editor && mode !== 'payment') || (mode === 'payment' && !(driver || session?.role === UserRole.Admin || session?.role === UserRole.Manager)) ? <Text style={styles.muted}>Bu əməliyyat üçün icazəniz yoxdur.</Text> : <><Text style={styles.muted}>{mode === 'debt' ? 'Bugünkü yeni borc' : mode === 'payment' ? 'Alınan ödəniş' : 'Yeni düzgün məbləğ'} (AZN)</Text><TextInput autoFocus keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0,00" placeholderTextColor={colors.textLight} style={styles.input} editable={!busy}/>{mode === 'debt' && !details.days.length && <><Text style={styles.muted}>İlkin köhnə borc — varsa</Text><TextInput keyboardType="decimal-pad" value={initial} onChangeText={setInitial} placeholder="0,00" placeholderTextColor={colors.textLight} style={styles.input} editable={!busy}/></>}{mode === 'payment' ? <><View style={styles.row}><View style={{ flex: 1 }}><Button secondary={method !== 'cash'} title="Nağd" onPress={() => setMethod('cash')} disabled={busy}/></View><View style={{ flex: 1 }}><Button secondary={method !== 'card'} title="Kart" onPress={() => setMethod('card')} disabled={busy}/></View></View><View style={styles.card}><Text style={styles.muted}>Ödəniş avtomatik bölünür</Text><Amount label="Bugünkü borca" value={paidToday}/><Amount label="Əvvəlki günlük borca" value={paidCarry}/><Amount label="Köhnə borca" value={Math.max(0, pay - paidToday - paidCarry)}/></View></> : <TextInput multiline value={reason} onChangeText={setReason} maxLength={400} placeholder={mode === 'debt' ? 'Qeyd (istəyə görə)' : 'Düzəliş səbəbi'} placeholderTextColor={colors.textLight} style={styles.input} editable={!busy}/>}<Button title={busy ? 'Saxlanılır…' : 'Təsdiqlə və saxla'} disabled={busy || loading || (mode === 'payment' && (pay <= 0 || pay > details.remainingDebt))} onPress={() => void submit()}/></>}</>}
    {mode === 'history' && details && <>{details.days.map(day => <View style={styles.card} key={day.businessDate}><Text style={styles.name}>{dateLabel(day.businessDate)}</Text><Amount label="Əvvəlki ümumi borc" value={day.openingDebt}/><Amount label="Yazılmış günlük borc" value={day.addedDebt}/><Amount label="Ödənilib" value={day.paidAmount}/><Amount label="Günün sonu köhnə borc" value={day.oldDebtRemaining}/><Amount label="Əvvəlki günlük qalıq" value={day.carriedDailyDebt}/><Amount label="Həmin günün günlük qalığı" value={day.todayDebtRemaining}/><Amount label="Günün sonu ümumi qalıq" value={day.closingDebt}/>{day.entries.map(e => <View key={e.id} style={styles.entry}><Text style={styles.name}>{({ 1: 'İlkin borc', 2: 'Günlük borc', 3: 'Ödəniş', 4: 'Köhnə borc artımı', 5: 'Köhnə borc azalması', 6: 'Günlük borc artımı', 7: 'Günlük borc azalması' } as Record<number, string>)[e.entryType]} · {money(e.amount)}</Text><Text style={styles.muted}>{e.recordedByFullName} · {new Date(e.createdAtUtc).toLocaleTimeString('az-AZ', { timeZone: 'Asia/Baku', hour: '2-digit', minute: '2-digit' })}{e.entryType === 3 ? ` · ${e.paymentMethod === 'cash' ? 'Nağd' : e.paymentMethod === 'card' ? 'Kart' : 'Ödəniş üsulu qeyd edilməyib'}` : ''}</Text>{e.note && <Text style={styles.muted}>{e.note}</Text>}</View>)}</View>)}{!details.days.length && <Text style={styles.muted}>Açot tarixçəsi yoxdur.</Text>}</>}
    {mode === 'reports' && <><Text style={styles.muted}>Tarixi seçin (İİİİ-AA-GG)</Text><TextInput value={date} onChangeText={setDate} style={styles.input} placeholderTextColor={colors.textLight} placeholder="2026-09-30"/><Button title="Seçilmiş günün yekunu" onPress={() => { if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date)
        go('report', undefined, date);
    else
        setError('Düzgün tarix seçin.'); }}/>{history.map(day => <Button secondary key={day.businessDate} title={`${dateLabel(day.businessDate)} · ${money(day.paidAmount)} · ${day.closed ? 'Bitirilib' : 'Açıq'}`} onPress={() => go('report', undefined, day.businessDate)}/>)}</>}
    {mode === 'report' && report && <><View style={styles.card}><Amount label="Nağd alınıb" value={report.cash}/><Amount label="Kartla alınıb" value={report.card}/>{report.unspecified > 0 && <Amount label="Köhnə qeydlər — üsul göstərilməyib" value={report.unspecified}/>}<Amount label="Yekun ödəniş" value={report.total}/><Amount label="Yazılmış günlük borc" value={report.customers.reduce((sum, c) => sum + c.todayDebt, 0)}/><Amount label="Günlük qalıq" value={report.customers.reduce((sum, c) => sum + c.todayDebtRemaining + c.carriedDailyDebt, 0)}/><Amount label="Köhnə borc üzrə qalıq" value={report.customers.reduce((sum,c)=>sum+c.previousDebtRemaining,0)}/><Amount label="Siyahı üzrə ümumi qalıq" value={report.customers.reduce((sum,c)=>sum+c.remainingDebt,0)}/><Text style={styles.muted}>{report.closure ? `Açot bitirilib · ${report.closure.recordedByFullName}` : 'Açot açıqdır'}</Text></View>{report.customers.map(c => <Pressable style={styles.card} key={c.customerId} onPress={() => go('detail', c.customerId)}><Text style={styles.name}>{c.customerName}</Text><Amount label="Ödənilib" value={c.todayPayment}/><Amount label="Köhnə borc qalıq" value={c.previousDebtRemaining}/><Amount label="Əvvəlki günlük qalıq" value={c.carriedDailyDebt}/><Amount label="Bugünkü günlük qalıq" value={c.todayDebtRemaining}/><Amount label="Ümumi qalıq" value={c.remainingDebt}/></Pressable>)}{!report.closure && report.businessDate === todayKey() && (driver || session?.role === UserRole.Admin || session?.role === UserRole.Manager) && <Button title={busy ? 'Bitirilir…' : 'Açot gününü bitir'} disabled={busy} onPress={() => Alert.alert('Açot gününü bitir', 'Bu gün üçün yeni borc və ödəniş yazılması bağlanacaq.', [{ text: 'Geri', style: 'cancel' }, { text: 'Günü bitir', onPress: () => { if (lock.current)
                return; lock.current = true; setBusy(true); void closeAccountDay(token).then(setReport).catch(e => setError(e.message)).finally(() => { lock.current = false; setBusy(false); }); } }])}/>}</>}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, page: { padding: 20, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' }, header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, title: { fontSize: 26, fontWeight: '700', color: colors.text, flex: 1 }, back: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 12 }, card: { backgroundColor: colors.surface, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { color: colors.text, fontSize: 18, fontWeight: '600', flexShrink: 1 }, muted: { color: colors.textSecondary, fontSize: 15, lineHeight: 23, flexShrink: 1 }, badge: { color: colors.warning, fontSize: 20, marginLeft: 'auto' }, input: { backgroundColor: colors.surface, borderColor: colors.inputBorder, borderWidth: 1, borderRadius: 12, minHeight: 56, padding: 16, color: colors.text, fontSize: 18 }, button: { backgroundColor: colors.primary, minHeight: 56, padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, buttonText: { color: colors.background, fontWeight: '700', fontSize: 17, textAlign: 'center' }, amount: { gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 }, value: { color: colors.text, fontSize: 24, fontWeight: '700', flexShrink: 1 }, entry: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 6 }, error: { backgroundColor: colors.dangerSoft, padding: 16, borderRadius: 12, gap: 10 } });
