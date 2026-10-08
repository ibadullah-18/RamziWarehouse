import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { randomUUID } from "expo-crypto";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAuth } from "../../auth/auth-context";
import {
  completeSettlement,
  getCustomerAccountDetails,
} from "../../api/customer-account-api";
import { getProductReturns } from "../../api/product-return-api";
import {
  ProductReturn,
  ReturnStatus,
} from "../product-returns/product-return-types";
import { CustomerAccountDetails } from "./customer-account-types";
import { dismissKeyboard } from "../../components/keyboard-form";
import { colors } from "../../theme";

const money = (value: number) => `${value.toFixed(2)} ₼`;
function parse(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw new Error("Məbləği qəpiyə qədər düzgün yazın.");
  return Number(normalized);
}
export default function SettlementScreen({
  customerId,
}: {
  customerId: string;
}) {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [details, setDetails] = useState<CustomerAccountDetails | null>(null);
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [cash, setCash] = useState(""),
    [card, setCard] = useState(""),
    [bonus, setBonus] = useState("");
  const [extra, setExtra] = useState<"none" | "bonus" | "return">("none"),
    [returnId, setReturnId] = useState<string | null>(null);
  const [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  const operation = useRef<string | null>(null),
    payload = useRef<Parameters<typeof completeSettlement>[1] | null>(null),
    lock = useRef(false);
  const [receipt, setReceipt] = useState<
    Parameters<typeof completeSettlement>[1] | null
  >(null);
  const [before, setBefore] = useState<CustomerAccountDetails | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (token && customerId) {
        void Promise.all([
          getCustomerAccountDetails(token, customerId),
          getProductReturns(token, { customerId, pageSize: 100 }),
        ])
          .then(([d, r]) => {
            if (active) {
              setDetails(d);
              setReturns(
                r.items.filter(
                  (x) =>
                    x.status === ReturnStatus.Pending ||
                    x.status === ReturnStatus.Submitted,
                ),
              );
            }
          })
          .catch((e) => {
            if (active) setError(e.message);
          });
      }
      return () => {
        active = false;
      };
    }, [token, customerId]),
  );
  const back = () =>
    router.canGoBack()
      ? router.back()
      : router.replace("/(app)/(tabs)/accounts");
  async function save() {
    if (lock.current || !token) return;
    lock.current = true;
    setBusy(true);
    setError("");
    dismissKeyboard();
    try {
      if (!payload.current) {
        const c = parse(cash),
          k = parse(card),
          b = extra === "bonus" ? parse(bonus) : 0;
        if (c + k + b <= 0 && !(extra === "return" && returnId))
          throw new Error("Ödəniş, bonus və ya vazvrat seçin.");
        operation.current ??= randomUUID();
        payload.current = {
          operationId: operation.current,
          customerId,
          cash: c,
          card: k,
          bonus: b,
          productReturnId: extra === "return" ? returnId : null,
          note: note.trim() || null,
        };
        setReceipt(payload.current);
        setBefore(details);
      }
      const result = await completeSettlement(token, payload.current);
      setDetails(result);
      setDone(true);
    } catch (e) {
      if (
        e instanceof Error &&
        "statusCode" in e &&
        typeof e.statusCode === "number" &&
        e.statusCode >= 400 &&
        e.statusCode < 500 &&
        e.statusCode !== 408
      ) {
        payload.current = null;
        operation.current = null;
        setReceipt(null);
      }
      setError(e instanceof Error ? e.message : "Açot tamamlanmadı.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function edit() {
    setError("");
  }
  const field = (label: string, value: string, set: (s: string) => void) => (
    <View style={styles.gap}>
      <Text style={styles.text}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(v) => {
          edit();
          set(v);
        }}
        keyboardType="decimal-pad"
        inputMode="decimal"
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={dismissKeyboard}
        placeholder="0,00"
        placeholderTextColor={colors.textLight}
        style={styles.input}
        editable={!busy && !receipt}
      />
    </View>
  );
  const row = (label: string, value: number) => (
    <View style={styles.row}>
      <Text style={styles.text}>{label}</Text>
      <Text style={styles.text}>{money(value)}</Text>
    </View>
  );
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAwareScrollView
        bottomOffset={62}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.page}
      >
        {<ActionButton title={"‹ Geri"} onPress={back} disabled={busy} />}
        <Text style={styles.title}>
          {done ? "Açot tamamlandı" : "Günlük açot"}
        </Text>
        {!details ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text style={styles.title}>{details.customerName}</Text>
            <Text style={styles.muted}>
              {new Date().toLocaleDateString("az-AZ")}
            </Text>
            {row(
              "Köhnə borc",
              (done && before ? before : details).oldDebtRemaining +
                (done && before ? before : details).carriedDailyDebt,
            )}
            {row(
              "Günlük borc",
              (done && before ? before : details).todayDebtRemaining,
            )}
            {details.advance > 0 && row("Avans", details.advance)}
            {done && receipt ? (
              <>
                {row("Nağd", receipt.cash)}
                {row("Kart", receipt.card)}
                {row("Real alınan məbləğ", receipt.cash + receipt.card)}
                {receipt.bonus > 0 && row("Bonus", receipt.bonus)}
                {receipt.productReturnId && (
                  <Text style={styles.muted}>
                    Vazvrat menecer təsdiqini gözləyir. Təsdiqdən sonra borcdan
                    çıxılacaq.
                  </Text>
                )}
                {row("Qalan ümumi borc", details.remainingDebt)}
                {
                  <ActionButton
                    title={"Siyahıya qayıt"}
                    onPress={back}
                    disabled={busy}
                  />
                }
              </>
            ) : (
              <>
                {field("Nağd ödəniş", cash, setCash)}
                {field("Kartla ödəniş", card, setCard)}
                {
                  <ActionButton
                    title={
                      extra === "none"
                        ? "Vazvrat / Bonus əlavə et"
                        : "Əlavə düzəlişi bağla"
                    }
                    onPress={() => {
                      edit();
                      setExtra(extra === "none" ? "bonus" : "none");
                    }}
                    disabled={busy || (!!receipt && !done)}
                  />
                }
                {extra !== "none" && (
                  <>
                    <View style={styles.row}>
                      {
                        <ActionButton
                          title={"Bonus"}
                          onPress={() => {
                            edit();
                            setExtra("bonus");
                          }}
                          disabled={busy || (!!receipt && !done)}
                        />
                      }
                      {
                        <ActionButton
                          title={"Vazvrat"}
                          onPress={() => {
                            edit();
                            setExtra("return");
                          }}
                          disabled={busy || (!!receipt && !done)}
                        />
                      }
                    </View>
                    {extra === "bonus" ? (
                      field("Bonus məbləği", bonus, setBonus)
                    ) : (
                      <>
                        {returns.length === 0 && (
                          <Text style={styles.muted}>
                            Bu müştəri üçün vazvrat yaradıb təsdiqə göndərin.
                          </Text>
                        )}
                        {
                          <ActionButton
                            title={"Yeni vazvrat yarat"}
                            onPress={() => router.push("/create-return")}
                            disabled={busy || (!!receipt && !done)}
                          />
                        }
                        {returns.map((r) => (
                          <View key={r.id}>
                            {
                              <ActionButton
                                title={`${returnId === r.id ? "✓ " : ""}${new Date(r.returnDateUtc).toLocaleDateString("az-AZ")} · ${money(r.amount ?? 0)}`}
                                onPress={() => {
                                  edit();
                                  setReturnId(r.id);
                                }}
                                disabled={busy || (!!receipt && !done)}
                              />
                            }
                          </View>
                        ))}
                        <Text style={styles.muted}>
                          Vazvrat yalnız menecer təsdiqlədikdən sonra borcu
                          azaldır.
                        </Text>
                      </>
                    )}
                    <TextInput
                      value={note}
                      onChangeText={(v) => {
                        edit();
                        setNote(v);
                      }}
                      keyboardType="default"
                      inputMode="text"
                      returnKeyType="done"
                      onSubmitEditing={dismissKeyboard}
                      maxLength={400}
                      placeholder="Qeyd (istəyə görə)"
                      placeholderTextColor={colors.textLight}
                      style={styles.input}
                      editable={!busy && !receipt}
                    />
                  </>
                )}
                {
                  <ActionButton
                    title={busy ? "Saxlanılır…" : "Açotu tamamla"}
                    onPress={() => void save()}
                    disabled={busy}
                  />
                }
                {!!receipt && !!error && (
                  <Text style={styles.muted}>
                    Cavab alınmayıbsa, eyni məlumatlarla yenidən sınayın.
                    Əməliyyat ikinci dəfə yazılmayacaq.
                  </Text>
                )}
              </>
            )}
          </>
        )}
        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: {
    padding: 20,
    gap: 16,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  gap: { gap: 8 },
  title: { color: colors.text, fontSize: 22, fontWeight: "700" },
  text: { color: colors.text, fontSize: 16 },
  muted: { color: colors.textSecondary },
  input: {
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    backgroundColor: colors.surface,
  },
  button: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
});

function ActionButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && { opacity: 0.5 }]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}
