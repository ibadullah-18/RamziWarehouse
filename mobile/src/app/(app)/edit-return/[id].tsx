import { dismissKeyboard } from "../../../components/keyboard-form";
import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  correctProductReturn,
  deleteProductReturn,
  getProductReturnById,
} from "../../../api/product-return-api";
import { useAuth } from "../../../auth/auth-context";
import { UserRole } from "../../../auth/auth-types";
import {
  ProductReturn,
  ReturnStatus,
} from "../../../features/product-returns/product-return-types";
import { colors } from "../../../theme";
export default function EditReturnScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ id?: string; action?: string }>();
  const deleting = params.action === "delete";
  const [record, setRecord] = useState<ProductReturn | null>(null),
    [items, setItems] = useState<
      { id: string; productCode: string; batchNumber: string }[]
    >([]),
    [reason, setReason] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      if (!params.id || !session?.accessToken)
        return () => {
          active = false;
        };
      void getProductReturnById(session.accessToken, params.id)
        .then((r) => {
          if (active) {
            setRecord(r);
            setItems(
              r.items.map((i) => ({
                id: i.id,
                productCode: i.productCode,
                batchNumber: i.batchNumber,
              })),
            );
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [params.id, session]),
  );
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/(tabs)/search");
  };
  const save = async () => {
    if (lock.current || !record || !session?.accessToken) return;
    if (reason.trim().length < 3) {
      setError("Əməliyyatın səbəbini yazın (ən azı 3 simvol).");
      return;
    }
    if (
      !deleting &&
      items.some((i) => !i.productCode.trim() || !i.batchNumber.trim())
    ) {
      setError("Kod və partiya boş ola bilməz.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (deleting) {
        await deleteProductReturn(session.accessToken, record.id, {
          expectedRevision: record.revision,
          reason,
        });
        if (router.canDismiss()) router.dismiss(2);
        else router.replace("/(app)/(tabs)/search");
      } else {
        await correctProductReturn(session.accessToken, record.id, {
          expectedRevision: record.revision,
          reason,
          items,
        });
        back();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Əməliyyat alınmadı.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const allowed =
    session?.role === UserRole.Admin &&
    record &&
    !record.isDeleted &&
    (deleting || record.status === ReturnStatus.Completed);
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAwareScrollView
        bottomOffset={62}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.page}
      >
        <View style={styles.row}>
          <Pressable
            disabled={busy}
            onPress={back}
            accessibilityLabel="Geri"
            style={styles.back}
          >
            <Text style={styles.name}>‹</Text>
          </Pressable>
          <Text style={styles.title}>
            {deleting ? "Vazvradı / vitrini sil" : "Kod və partiyanı düzəlt"}
          </Text>
        </View>
        {loading && <ActivityIndicator color={colors.primary} />}
        <Text style={styles.name}>{record?.customerName}</Text>
        {error !== "" && <Text style={{ color: colors.danger }}>{error}</Text>}
        {!loading && !allowed && (
          <Text style={styles.muted}>
            Bu əməliyyat mümkün deyil. Geri qayıdıb qeydi yeniləyin.
          </Text>
        )}
        {allowed && (
          <>
            {!deleting &&
              items.map((item, index) => (
                <View style={styles.card} key={item.id}>
                  <Text style={styles.name}>
                    {index + 1}. məhsul · {record.items[index]?.quantity} ədəd
                  </Text>
                  <Text style={styles.muted}>Məhsul kodu</Text>
                  <TextInput
                    returnKeyType="done"
                    submitBehavior="blurAndSubmit"
                    onSubmitEditing={dismissKeyboard}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    value={item.productCode}
                    maxLength={50}
                    editable={!busy}
                    onChangeText={(v) =>
                      setItems((all) =>
                        all.map((i) =>
                          i.id === item.id
                            ? { ...i, productCode: v.replace(/\D/g, "") }
                            : i,
                        ),
                      )
                    }
                    style={styles.input}
                  />
                  <Text style={styles.muted}>Partiya</Text>
                  <TextInput
                    returnKeyType="done"
                    submitBehavior="blurAndSubmit"
                    onSubmitEditing={dismissKeyboard}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    value={item.batchNumber}
                    maxLength={50}
                    editable={!busy}
                    onChangeText={(v) =>
                      setItems((all) =>
                        all.map((i) =>
                          i.id === item.id
                            ? { ...i, batchNumber: v.replace(/\D/g, "") }
                            : i,
                        ),
                      )
                    }
                    style={styles.input}
                  />
                </View>
              ))}
            <Text style={styles.muted}>Səbəb — mütləqdir</Text>
            <TextInput
              returnKeyType="done"
              keyboardType="default"
              inputMode="text"
              multiline
              value={reason}
              onChangeText={setReason}
              maxLength={400}
              editable={!busy}
              placeholder="Səbəbi yazın"
              placeholderTextColor={colors.textLight}
              style={styles.input}
            />
            <Text style={styles.muted}>
              {deleting
                ? "Qeyd siyahıdan silinəcək. Səbəb və əvvəlki məlumatlar tarixçədə saxlanacaq."
                : "Əvvəlki və yeni kod/partiya, səbəb və adınız tarixçədə saxlanacaq."}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              style={[
                styles.button,
                deleting && { backgroundColor: colors.danger },
              ]}
              onPress={() =>
                deleting
                  ? Alert.alert(
                      "Qeydi sil",
                      "Bu vazvrad/vitrin siyahıdan silinsin?",
                      [
                        { text: "Geri", style: "cancel" },
                        {
                          text: "Sil",
                          style: "destructive",
                          onPress: () => void save(),
                        },
                      ],
                    )
                  : void save()
              }
            >
              <Text style={styles.buttonText}>
                {busy
                  ? "Saxlanılır…"
                  : deleting
                    ? "Səbəblə sil"
                    : "Düzəlişi saxla"}
              </Text>
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: {
    padding: 20,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    gap: 16,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: {
    padding: 15,
    backgroundColor: colors.surface,
    borderRadius: 12,
    minWidth: 48,
  },
  title: { fontSize: 25, fontWeight: "700", color: colors.text, flex: 1 },
  name: { color: colors.text, fontSize: 18, fontWeight: "600" },
  muted: { color: colors.textSecondary, fontSize: 15, lineHeight: 23 },
  card: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    minHeight: 56,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    minHeight: 56,
    alignItems: "center",
  },
  buttonText: { fontSize: 17, color: colors.background, fontWeight: "700" },
});
