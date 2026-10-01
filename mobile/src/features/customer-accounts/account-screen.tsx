import { dismissKeyboard } from "../../components/keyboard-form";
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";
import { useCallback, useRef, useState } from "react";
import {
  Href,
  Redirect,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  correctAccountPayment,
  closeAccountDay,
  correctDailyDebt,
  correctPreviousDebt,
  createCustomerAccount,
  getAccountReport,
  getAccountReportHistory,
  getCustomerAccountDetails,
  getCustomerAccounts,
  recordCustomerPayment,
} from "../../api/customer-account-api";
import { useAuth } from "../../auth/auth-context";
import { UserRole } from "../../auth/auth-types";
import {
  CustomerAccountEntry,
  AccountDayReport,
  AccountReportHistory,
  CustomerAccountDetails,
  CustomerAccountSummary,
} from "./customer-account-types";
import { colors } from "../../theme";
import AccountDateInput from "./account-date-input";
import {
  AccountMode,
  AccountPage,
  accountDestination,
  customerAccountPages,
  isBusinessDate,
  singleAccountParam,
} from "./account-navigation";
export const todayKey = () =>
  new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 10);
const money = (n: number) =>
  `${n.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;
const dateLabel = (s: string) => s.split("-").reverse().join(".");
type Mode = AccountMode;
function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: colors.text }]}>
        {title}
      </Text>
    </Pressable>
  );
}
function Amount({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.amount}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.value}>{money(value)}</Text>
    </View>
  );
}
export default function AccountScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{
    id?: string | string[];
    date?: string | string[];
  }>();
  const params = {
    id: singleAccountParam(rawParams.id),
    date: singleAccountParam(rawParams.date),
  };
  const { session } = useAuth();
  const token = session?.accessToken ?? "";
  const driver = session?.role === UserRole.Driver;
  const editor = [
    UserRole.Admin,
    UserRole.Accountant,
    UserRole.Driver,
  ].includes(session?.role ?? UserRole.WarehouseWorker);
  const [list, setList] = useState<CustomerAccountSummary[]>([]),
    [details, setDetails] = useState<CustomerAccountDetails | null>(null),
    [report, setReport] = useState<AccountDayReport | null>(null);
  const admin = session?.role === UserRole.Admin;
  const dailyEntries =
    details?.days.find((d) => d.businessDate === todayKey())?.entries ?? [];
  const canCorrect =
    admin || dailyEntries.some((e) => e.entryType === 2 && !e.isFinalized);
  const [editingPayment, setEditingPayment] =
    useState<CustomerAccountEntry | null>(null);
  const allowed = editor || driver;
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  const [amount, setAmount] = useState(""),
    [initial, setInitial] = useState(""),
    [reason, setReason] = useState(""),
    [method, setMethod] = useState<"cash" | "card">("cash");
  const [date, setDate] = useState(todayKey);
  const [history, setHistory] = useState<AccountReportHistory[]>([]);
  const focused = useRef(false);
  const lock = useRef(false);
  const navigationPending = useRef(false);
  const request = useRef(0);
  const go = (target: AccountPage, id?: string, day?: string) => {
    if (!focused.current || navigationPending.current) return;
    navigationPending.current = true;
    try {
      router.push(accountDestination(target, id, day) as Href);
    } catch (e) {
      navigationPending.current = false;
      setError(e instanceof Error ? e.message : "Səhifə açıla bilmədi.");
    }
  };
  const back = () => {
    if (busy) return;
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/(tabs)/accounts");
  };
  const load = useCallback(async () => {
    if (
      ![UserRole.Admin, UserRole.Accountant, UserRole.Driver].includes(
        session?.role ?? UserRole.WarehouseWorker,
      )
    )
      return;
    const serial = ++request.current;
    setLoading(true);
    setError("");
    try {
      if (["daily", "customers"].includes(mode)) {
        let page = 1,
          items: CustomerAccountSummary[] = [];
        let total = 0;
        do {
          const result = await getCustomerAccounts(token, {
            pageNumber: page++,
            pageSize: 100,
          });
          items = items.concat(result.items);
          total = result.totalCount;
          if (serial !== request.current) return;
          if (result.items.length === 0) break;
        } while (items.length < total);
        const dayReport = await getAccountReport(token, todayKey());
        if (serial === request.current) {
          setList(items);
          setReport(dayReport);
        }
      } else if (customerAccountPages.includes(mode as AccountPage)) {
        if (!params.id)
          throw new Error("Müştəri seçilməyib. Geri qayıdıb müştərini seçin.");
        const result = await getCustomerAccountDetails(token, params.id);
        if (serial === request.current) setDetails(result);
      } else if (mode === "reports") {
        const result = await getAccountReportHistory(token);
        if (serial === request.current) setHistory(result);
      } else if (mode === "report") {
        const reportDate = params.date ?? todayKey();
        if (!isBusinessDate(reportDate)) throw new Error("Düzgün tarix seçin.");
        const result = await getAccountReport(token, reportDate);
        if (serial === request.current) setReport(result);
      }
    } catch (e) {
      if (serial === request.current)
        setError(e instanceof Error ? e.message : "Məlumat alınmadı.");
    } finally {
      if (serial === request.current) setLoading(false);
    }
  }, [mode, params.id, params.date, token, session?.role]);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      navigationPending.current = false;
      void load();
      return () => {
        focused.current = false;
        request.current++;
      };
    }, [load]),
  );
  const submit = async () => {
    if (lock.current || !params.id) return;
    const raw = (amount.trim() || (mode === "debt" ? "0" : "")).replace(
      ",",
      ".",
    );
    const value = Number(raw);
    if (
      !/^\d+(\.\d{1,2})?$/.test(raw) ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      setError("Düzgün məbləğ yazın (məsələn, 150,50).");
      return;
    }
    if (["old", "correct"].includes(mode) && reason.trim().length < 3) {
      setError("Düzəlişin səbəbini yazın.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (mode === "payment")
        await recordCustomerPayment(token, {
          customerId: params.id,
          amount: value,
          paymentMethod: method,
          note: null,
        });
      else if (mode === "old")
        await correctPreviousDebt(token, {
          customerId: params.id,
          correctedPreviousDebt: value,
          reason,
        });
      else if (mode === "correct")
        await correctDailyDebt(token, {
          customerId: params.id,
          amount: value,
          reason,
          date: admin ? date : undefined,
        });
      else {
        const initialRaw = initial.trim().replace(",", ".");
        if (initialRaw && !/^\d+(\.\d{1,2})?$/.test(initialRaw))
          throw new Error("İlkin borcu düzgün yazın.");
        await createCustomerAccount(token, {
          customerId: params.id,
          todayDebt: value,
          initialPreviousDebt: Number(initialRaw || 0),
          note: reason.trim() || null,
        });
      }
      if (focused.current) {
        if (router.canGoBack()) router.back();
        else router.replace(accountDestination("detail", params.id) as Href);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Əməliyyat alınmadı.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const finish = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await closeAccountDay(token);
      setReport(result);
      if (focused.current) go("report", undefined, todayKey());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Açot bitirilmədi.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const savePayment = async () => {
    if (lock.current || !editingPayment || !details) return;
    const raw = amount.trim().replace(",", ".");
    const value = Number(raw);
    if (
      !/^\d+(\.\d{1,2})?$/.test(raw) ||
      value <= 0 ||
      reason.trim().length < 3
    ) {
      setError("Məbləği və düzəliş səbəbini yazın.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await correctAccountPayment(token, {
        customerId: details.customerId,
        entryId: editingPayment.id,
        expectedAmount: editingPayment.amount,
        expectedPaymentMethod: editingPayment.paymentMethod,
        amount: value,
        paymentMethod: method,
        reason,
      });
      setDetails(result);
      setEditingPayment(null);
      setAmount("");
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ödəniş düzəldilmədi.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const titles: Record<Mode, string> = {
    home: "Açot",
    daily: "Günlük açot",
    customers: "Bütün müştərilər",
    detail: details?.customerName ?? "Müştəri açotu",
    history: "Ödəniş və açot tarixçəsi",
    reports: "Günün yekun açotu",
    report: dateLabel(params.date ?? todayKey()),
    debt: "Günlük borc yarat",
    old: "Köhnə borcu düzəlt",
    correct: "Bugünkü borcu düzəlt",
    payment: "Ödəniş qeyd et",
  };
  const isForm = ["debt", "old", "correct", "payment"].includes(mode);
  const visible = list.filter(
    (c) =>
      c.customerName.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
      (mode !== "daily" ||
        c.todayDebt > 0 ||
        c.carriedDailyDebt > 0 ||
        c.todayPayment > 0),
  );
  const pay = Number(amount.replace(",", ".")) || 0;
  const paidToday = Math.min(pay, details?.todayDebtRemaining ?? 0);
  const paidCarry = Math.min(
    Math.max(0, pay - paidToday),
    details?.carriedDailyDebt ?? 0,
  );
  if (!allowed) return <Redirect href="/(app)/(tabs)/returns" />;
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView
          bottomOffset={62}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.page}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void load()}
              tintColor={colors.primary}
            />
          }
        >
          {mode === "daily" && (
            <View style={{ alignSelf: "flex-start" }}>
              <Button
                title={busy ? "Bitirilir…" : "Açotu bitir"}
                disabled={
                  busy ||
                  loading ||
                  (!!report?.closure && !report?.hasOpenEntries)
                }
                onPress={() =>
                  Alert.alert(
                    "Açotu bitir",
                    "Bu vaxta qədərki borc və ödənişlər kilidlənəcək. Sonradan əlavə olunan əməliyyatlar eyni günün yekununa daxil ediləcək.",
                    [
                      { text: "Geri", style: "cancel" },
                      { text: "Bitir", onPress: () => void finish() },
                    ],
                  )
                }
              />
            </View>
          )}
          <View style={styles.header}>
            {mode !== "home" && (
              <Pressable
                accessibilityLabel="Geri"
                onPress={back}
                style={styles.back}
              >
                <Text style={styles.value}>‹</Text>
              </Pressable>
            )}
            <Text style={styles.title}>{titles[mode]}</Text>
          </View>
          {error !== "" && (
            <View style={styles.error}>
              <Text style={{ color: colors.danger }}>{error}</Text>
              <Button
                secondary
                title="Yenidən yoxla"
                onPress={() => void load()}
              />
            </View>
          )}
          {loading && <ActivityIndicator color={colors.primary} />}
          {mode === "home" && (
            <>
              <Text style={styles.muted}>
                {dateLabel(todayKey())} ·{" "}
                {admin ? "Admin" : driver ? "Sürücü" : "Açot operatoru"}
              </Text>
              <Button title="Günlük açot" onPress={() => go("daily")} />
              <Button
                secondary
                title="Günün yekun açotunu gör"
                onPress={() => go("reports")}
              />
              {allowed && (
                <Button
                  secondary
                  title="Borc yarat / bütün müştərilər"
                  onPress={() => go("customers")}
                />
              )}
            </>
          )}
          {["daily", "customers"].includes(mode) && (
            <>
              {mode === "daily" && (
                <>
                  <Button
                    secondary
                    title="Borc yarat / bütün müştərilər"
                    onPress={() => go("customers")}
                  />
                  <Text style={styles.muted}>
                    {report?.closure && !report.hasOpenEntries
                      ? "Bu vaxta qədərki açot bitirilib. Yeni borc və ödəniş əlavə edə bilərsiniz."
                      : "Günlük borclar və bu gün ödəniş edən müştərilər"}
                  </Text>
                </>
              )}
              <TextInput
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={dismissKeyboard}
                keyboardType="default"
                inputMode="text"
                placeholder="Müştərinin adını axtar"
                placeholderTextColor={colors.textLight}
                value={search}
                onChangeText={setSearch}
                style={styles.input}
              />
              {visible.map((c) => (
                <Pressable
                  key={c.customerId}
                  onPress={() => go("detail", c.customerId)}
                  style={styles.card}
                >
                  <View style={styles.row}>
                    <Text style={styles.name}>{c.customerName}</Text>
                    {c.hasUnpaidDailyDebt && (
                      <Text
                        accessibilityLabel="Ödənilməmiş günlük borc"
                        style={styles.badge}
                      >
                        ●
                      </Text>
                    )}
                    <Text style={styles.muted}>›</Text>
                  </View>
                  {allowed && (
                    <Text style={styles.muted}>
                      Günlük: {money(c.todayDebtRemaining + c.carriedDailyDebt)}
                    </Text>
                  )}
                </Pressable>
              ))}
              {!loading && !visible.length && (
                <Text style={styles.muted}>Bu siyahıda müştəri yoxdur.</Text>
              )}
            </>
          )}
          {mode === "detail" && details && (
            <>
              <View style={styles.card}>
                <Amount label="Köhnə borc" value={details.oldDebtRemaining} />
                <Amount
                  label="Əvvəlki günlərdən qalan günlük borc"
                  value={details.carriedDailyDebt}
                />
                <Amount
                  label="Bugünkü qalıq borc"
                  value={details.todayDebtRemaining}
                />
                <Amount
                  label="Bu gün yazılmış borc"
                  value={
                    details.days.find((d) => d.businessDate === todayKey())
                      ?.addedDebt ?? 0
                  }
                />
                <Amount
                  label="Bu gün ödənilib"
                  value={
                    details.days.find((d) => d.businessDate === todayKey())
                      ?.paidAmount ?? 0
                  }
                />
                <Amount label="Ümumi qalıq" value={details.remainingDebt} />
              </View>
              {(editor || driver) && (
                <>
                  <Button
                    disabled={!details.isActive}
                    title="Günlük / köhnə borc əlavə et"
                    onPress={() => go("debt", params.id)}
                  />
                  {canCorrect && (
                    <Button
                      secondary
                      title="Bugünkü borcu düzəlt"
                      onPress={() => go("correct", params.id)}
                    />
                  )}{" "}
                  {admin && (
                    <Button
                      secondary
                      title="Köhnə borcu düzəlt"
                      onPress={() => go("old", params.id)}
                    />
                  )}{" "}
                </>
              )}
              {allowed && (
                <Button
                  title="Ödəniş qeyd et"
                  disabled={details.remainingDebt <= 0}
                  onPress={() => go("payment", params.id)}
                />
              )}
              <Button
                secondary
                title="Müştərinin ödəniş tarixçəsi"
                onPress={() => go("history", params.id)}
              />
            </>
          )}
          {isForm && details && (
            <>
              <Text style={styles.name}>{details.customerName}</Text>
              {mode === "correct" && admin && (
                <>
                  <Text style={styles.muted}>Düzəliş ediləcək tarix</Text>
                  <AccountDateInput value={date} onChange={setDate} />
                </>
              )}
              {mode === "correct" && !admin && (
                <Text style={styles.muted}>
                  Yalnız bitirilməmiş günlük borcun yeni məbləğini yazın. Əvvəl
                  bitirilmiş məbləğ dəyişməyəcək.
                </Text>
              )}
              <View style={styles.card}>
                <Amount label="Köhnə borc" value={details.oldDebtRemaining} />
                <Amount
                  label="Əvvəlki günlük qalıq"
                  value={details.carriedDailyDebt}
                />
                <Amount
                  label="Bugünkü qalıq"
                  value={details.todayDebtRemaining}
                />
              </View>
              {(mode === "old" && !admin) ||
              (mode === "correct" && !canCorrect) ||
              (mode === "debt" && !(editor || driver)) ||
              (mode === "payment" && !allowed) ? (
                <Text style={styles.muted}>
                  Bu əməliyyat üçün icazəniz yoxdur.
                </Text>
              ) : (
                <>
                  <Text style={styles.muted}>
                    {mode === "debt"
                      ? "Əlavə ediləcək günlük borc"
                      : mode === "payment"
                        ? "Alınan ödəniş"
                        : "Yeni düzgün məbləğ"}{" "}
                    (AZN)
                  </Text>
                  <TextInput
                    returnKeyType="done"
                    submitBehavior="blurAndSubmit"
                    onSubmitEditing={dismissKeyboard}
                    inputMode="decimal"
                    autoFocus
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0,00"
                    placeholderTextColor={colors.textLight}
                    style={styles.input}
                    editable={!busy}
                  />
                  {mode === "debt" && (
                    <>
                      <Text style={styles.muted}>
                        Əlavə ediləcək köhnə borc — varsa (günlük borc boş qala
                        bilər)
                      </Text>
                      <TextInput
                        returnKeyType="done"
                        submitBehavior="blurAndSubmit"
                        onSubmitEditing={dismissKeyboard}
                        inputMode="decimal"
                        keyboardType="decimal-pad"
                        value={initial}
                        onChangeText={setInitial}
                        placeholder="0,00"
                        placeholderTextColor={colors.textLight}
                        style={styles.input}
                        editable={!busy}
                      />
                    </>
                  )}
                  {mode === "payment" ? (
                    <>
                      <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Button
                            secondary={method !== "cash"}
                            title="Nağd"
                            onPress={() => setMethod("cash")}
                            disabled={busy}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            secondary={method !== "card"}
                            title="Kart"
                            onPress={() => setMethod("card")}
                            disabled={busy}
                          />
                        </View>
                      </View>
                      <View style={styles.card}>
                        <Text style={styles.muted}>
                          Ödəniş avtomatik bölünür
                        </Text>
                        <Amount label="Bugünkü borca" value={paidToday} />
                        <Amount
                          label="Əvvəlki günlük borca"
                          value={paidCarry}
                        />
                        <Amount
                          label="Köhnə borca"
                          value={Math.max(0, pay - paidToday - paidCarry)}
                        />
                      </View>
                    </>
                  ) : (
                    <TextInput
                      returnKeyType="done"
                      keyboardType="default"
                      inputMode="text"
                      multiline
                      value={reason}
                      onChangeText={setReason}
                      maxLength={400}
                      placeholder={
                        mode === "debt"
                          ? "Qeyd (istəyə görə)"
                          : "Düzəliş səbəbi"
                      }
                      placeholderTextColor={colors.textLight}
                      style={styles.input}
                      editable={!busy}
                    />
                  )}
                  <Button
                    title={busy ? "Saxlanılır…" : "Təsdiqlə və saxla"}
                    disabled={
                      busy ||
                      loading ||
                      (mode === "payment" &&
                        (pay <= 0 || pay > details.remainingDebt))
                    }
                    onPress={() => void submit()}
                  />
                </>
              )}
            </>
          )}
          {mode === "history" && details && (
            <>
              {editingPayment && (
                <Modal
                  visible
                  animationType="slide"
                  onRequestClose={() => {
                    if (!busy) setEditingPayment(null);
                  }}
                >
                  <SafeAreaView style={styles.safe}>
                    <KeyboardAwareScrollView
                      bottomOffset={62}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.page}
                    >
                      <View style={styles.card}>
                        <Text style={styles.name}>
                          Ödənişi düzəlt ·{" "}
                          {dateLabel(editingPayment.businessDate)}
                        </Text>
                        <TextInput
                          returnKeyType="done"
                          submitBehavior="blurAndSubmit"
                          onSubmitEditing={dismissKeyboard}
                          inputMode="decimal"
                          keyboardType="decimal-pad"
                          value={amount}
                          editable={!busy}
                          onChangeText={setAmount}
                          style={styles.input}
                        />
                        <View style={styles.row}>
                          <Button
                            title="Nağd"
                            disabled={busy}
                            secondary={method !== "cash"}
                            onPress={() => setMethod("cash")}
                          />
                          <Button
                            title="Kart"
                            disabled={busy}
                            secondary={method !== "card"}
                            onPress={() => setMethod("card")}
                          />
                        </View>
                        <TextInput
                          returnKeyType="done"
                          submitBehavior="blurAndSubmit"
                          onSubmitEditing={dismissKeyboard}
                          keyboardType="default"
                          inputMode="text"
                          value={reason}
                          editable={!busy}
                          onChangeText={setReason}
                          maxLength={400}
                          placeholder="Düzəliş səbəbi"
                          placeholderTextColor={colors.textLight}
                          style={styles.input}
                        />
                        {error !== "" && (
                          <Text style={{ color: colors.danger }}>{error}</Text>
                        )}
                        <Button
                          title="Düzəlişi saxla"
                          disabled={busy}
                          onPress={() => void savePayment()}
                        />
                        <Button
                          secondary
                          title="Geri"
                          disabled={busy}
                          onPress={() => setEditingPayment(null)}
                        />
                      </View>
                    </KeyboardAwareScrollView>
                    <KeyboardToolbar doneText="Tamam" />
                  </SafeAreaView>
                </Modal>
              )}
              {details.audit?.map((a) => (
                <View style={styles.card} key={a.entryId + a.createdAtUtc}>
                  <Text style={styles.name}>
                    Ödəniş düzəlişi · {a.userName}
                  </Text>
                  <Text style={styles.muted}>{a.description}</Text>
                  <Text style={styles.muted}>
                    {new Date(a.createdAtUtc).toLocaleString("az-AZ", {
                      timeZone: "Asia/Baku",
                    })}
                  </Text>
                </View>
              ))}
              {details.days.map((day) => (
                <View style={styles.card} key={day.businessDate}>
                  <Text style={styles.name}>{dateLabel(day.businessDate)}</Text>
                  <Text style={styles.muted}>Ödənişdən əvvəlki borclar</Text>
                  <Amount
                    label="İlkin ümumi borc"
                    value={
                      day.openingDebt + day.addedDebt + day.adjustmentAmount
                    }
                  />
                  {day.openingOldDebt > 0 && (
                    <Amount label="Köhnə borc" value={day.openingOldDebt} />
                  )}
                  {(day.openingCarriedDailyDebt > 0 ||
                    day.carriedDailyTransferredToOld > 0) && (
                    <View style={styles.entry}>
                      <Text style={styles.name}>
                        Əvvəlki günlərdən günlük borc
                      </Text>
                      <Amount
                        label="Əvvəldən qalan məbləğ"
                        value={
                          day.openingCarriedDailyDebt +
                          day.carriedDailyTransferredToOld
                        }
                      />
                      {day.carriedDailyTransferredToOld > 0 ? (
                        <Text style={styles.muted}>
                          5 gün ərzində ödənilmədiyi üçün{" "}
                          {money(day.carriedDailyTransferredToOld)} köhnə borca
                          əlavə olunub.
                        </Text>
                      ) : (
                        <>
                          {day.paidFromCarriedDailyDebt > 0 && (
                            <Amount
                              label="Bu borcdan ödənilib"
                              value={day.paidFromCarriedDailyDebt}
                            />
                          )}
                          <Text
                            style={{
                              color:
                                day.carriedDailyDebt === 0
                                  ? colors.success
                                  : colors.warning,
                            }}
                          >
                            {day.carriedDailyDebt === 0
                              ? "Tam ödənilib"
                              : day.paidFromCarriedDailyDebt > 0
                                ? "Qismən ödənilib"
                                : "Ödənilməyib"}
                            {day.carriedDailyDebt > 0
                              ? ` · Qalıq: ${money(day.carriedDailyDebt)}`
                              : ""}
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                  <Text style={styles.muted}>Həmin günün əməliyyatları</Text>
                  {day.addedDebt > 0 && (
                    <Amount label="Bu gün yazılan borc" value={day.addedDebt} />
                  )}
                  {day.adjustmentAmount !== 0 && (
                    <Amount
                      label="Köhnə borc üzrə düzəliş"
                      value={day.adjustmentAmount}
                    />
                  )}
                  <Amount label="Ödənilən məbləğ" value={day.paidAmount} />
                  <Text style={styles.muted}>Günün sonunda</Text>
                  {day.openingCarriedDailyDebt>0 && day.addedDebt>0 && (day.todayDebtRemaining>0 ? <Amount label="Bu günün borcundan qalan" value={day.todayDebtRemaining}/> : <Text style={{color:colors.success}}>Bu günün borcu tam ödənilib</Text>)}
                  {(day.openingOldDebt > 0 ||
                    day.oldDebtRemaining > 0 ||
                    day.adjustmentAmount !== 0) && (
                    <>
                      <Amount
                        label="Köhnə borcdan qalan"
                        value={day.oldDebtRemaining}
                      />
                      {day.oldDebtRemaining === 0 && (
                        <Text style={{ color: colors.success }}>
                          Köhnə borc sıfırlanıb
                        </Text>
                      )}
                    </>
                  )}
                  {(day.addedDebt > 0 || day.openingCarriedDailyDebt > 0) && (
                    <>
                      <Amount
                        label="Ümumi günlük borcdan qalan"
                        value={day.todayDebtRemaining + day.carriedDailyDebt}
                      />
                      {day.todayDebtRemaining + day.carriedDailyDebt === 0 && (
                        <Text style={{ color: colors.success }}>
                          Günlük borc tam ödənilib · sıfırlanıb
                        </Text>
                      )}
                    </>
                  )}
                  <Amount label="Ümumi qalıq borc" value={day.closingDebt} />
                  <Text style={styles.muted}>Əməliyyat tarixçəsi</Text>
                  {day.entries.map((e) => (
                    <View key={e.id} style={styles.entry}>
                      <Text style={styles.name}>
                        {
                          (
                            {
                              1: "İlkin borc",
                              2: "Günlük borc",
                              3: "Ödəniş",
                              4: "Köhnə borc artımı",
                              5: "Köhnə borc azalması",
                              6: "Günlük borc artımı",
                              7: "Günlük borc azalması",
                            } as Record<number, string>
                          )[e.entryType]
                        }{" "}
                        · {money(e.amount)}
                      </Text>
                      <Text style={styles.muted}>
                        {e.recordedByFullName} ·{" "}
                        {new Date(e.createdAtUtc).toLocaleTimeString("az-AZ", {
                          timeZone: "Asia/Baku",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {e.entryType === 3
                          ? ` · ${e.paymentMethod === "cash" ? "Nağd" : e.paymentMethod === "card" ? "Kart" : "Ödəniş üsulu qeyd edilməyib"}`
                          : ""}
                      </Text>
                      {e.note && <Text style={styles.muted}>{e.note}</Text>}
                      {e.isFinalized && (
                        <Text style={styles.muted}>
                          Açot bitirilib · dəyişiklik yalnız adminə açıqdır
                        </Text>
                      )}
                      {e.entryType === 3 &&
                        (admin ||
                          (!e.isFinalized &&
                            e.businessDate === todayKey())) && (
                          <Button
                            secondary
                            title="Ödənişi düzəlt"
                            onPress={() => {
                              setError("");
                              setEditingPayment(e);
                              setAmount(String(e.amount));
                              setMethod(
                                e.paymentMethod === "card" ? "card" : "cash",
                              );
                              setReason("");
                            }}
                          />
                        )}
                    </View>
                  ))}
                </View>
              ))}
              {!details.days.length && (
                <Text style={styles.muted}>Açot tarixçəsi yoxdur.</Text>
              )}
            </>
          )}
          {mode === "reports" && (
            <>
              <Text style={styles.muted}>Tarixi seçin</Text>
              <AccountDateInput value={date} onChange={setDate} />
              <Button
                title="Seçilmiş günün yekunu"
                onPress={() => {
                  if (isBusinessDate(date)) go("report", undefined, date);
                  else setError("Düzgün tarix seçin.");
                }}
              />
              {history.map((day) => (
                <Button
                  secondary
                  key={day.businessDate}
                  title={`${dateLabel(day.businessDate)} · ${money(day.paidAmount)} · ${day.closed ? "Bitirilib" : "Açıq"}`}
                  onPress={() => go("report", undefined, day.businessDate)}
                />
              ))}
            </>
          )}
          {mode === "report" && report && (
            <>
              <View style={styles.card}>
                <Amount label="Nağd alınıb" value={report.cash} />
                <Amount label="Kartla alınıb" value={report.card} />
                {report.unspecified > 0 && (
                  <Amount
                    label="Köhnə qeydlər — üsul göstərilməyib"
                    value={report.unspecified}
                  />
                )}
                <Amount label="Yekun ödəniş" value={report.total} />
                <Amount
                  label="Yazılmış günlük borc"
                  value={report.customers.reduce(
                    (sum, c) => sum + c.todayDebt,
                    0,
                  )}
                />
                <Amount
                  label="Günlük qalıq"
                  value={report.customers.reduce(
                    (sum, c) => sum + c.todayDebtRemaining + c.carriedDailyDebt,
                    0,
                  )}
                />
                <Amount
                  label="Köhnə borc üzrə qalıq"
                  value={report.customers.reduce(
                    (sum, c) => sum + c.previousDebtRemaining,
                    0,
                  )}
                />
                <Amount
                  label="Siyahı üzrə ümumi qalıq"
                  value={report.customers.reduce(
                    (sum, c) => sum + c.remainingDebt,
                    0,
                  )}
                />
                <Text style={styles.muted}>
                  {report.closure && !report.hasOpenEntries
                    ? `Açot bitirilib · ${report.closure.recordedByFullName}`
                    : report.closure
                      ? "Əvvəlki açot bitirilib · yeni əməliyyatlar açıqdır"
                      : "Açot açıqdır"}
                </Text>
              </View>
              {report.customers.map((c) => (
                <Pressable
                  style={styles.card}
                  key={c.customerId}
                  onPress={() => go("detail", c.customerId)}
                >
                  <Text style={styles.name}>{c.customerName}</Text>
                  <Amount label="Ödənilib" value={c.todayPayment} />
                  <Amount
                    label="Köhnə borc qalıq"
                    value={c.previousDebtRemaining}
                  />
                  <Amount
                    label="Əvvəlki günlük qalıq"
                    value={c.carriedDailyDebt}
                  />
                  <Amount
                    label="Bugünkü günlük qalıq"
                    value={c.todayDebtRemaining}
                  />
                  <Amount label="Ümumi qalıq" value={c.remainingDebt} />
                </Pressable>
              ))}
            </>
          )}
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 26, fontWeight: "700", color: colors.text, flex: 1 },
  back: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { color: colors.text, fontSize: 18, fontWeight: "600", flexShrink: 1 },
  muted: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    flexShrink: 1,
  },
  badge: { color: colors.warning, fontSize: 20, marginLeft: "auto" },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 56,
    padding: 16,
    color: colors.text,
    fontSize: 18,
  },
  button: {
    backgroundColor: colors.primary,
    minHeight: 56,
    padding: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    color: colors.background,
    fontWeight: "700",
    fontSize: 17,
    textAlign: "center",
  },
  amount: {
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  value: { color: colors.text, fontSize: 24, fontWeight: "700", flexShrink: 1 },
  entry: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 6,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
});
