import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect, type Href } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getProductReturns } from "../../../api/product-return-api";
import { useAuth } from "../../../auth/auth-context";
import {
  ProductReturn,
  ReturnStatus,
} from "../../../features/product-returns/product-return-types";
import { colors } from "../../../theme";
export default function ReturnsScreen() {
  const { session } = useAuth();
  const [items, setItems] = useState<ProductReturn[]>([]),
    [search, setSearch] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const request = useRef(0),
    navigation = useRef(false);
  const load = useCallback(async () => {
    const serial = ++request.current;
    if (!session?.accessToken) return;
    setLoading(true);
    setError("");
    try {
      let page = 1,
        all: ProductReturn[] = [];
      while (true) {
        const r = await getProductReturns(session.accessToken, {
          status: ReturnStatus.Submitted,
          pageNumber: page++,
          pageSize: 100,
        });
        if (serial !== request.current) return;
        all = all.concat(r.items);
        if (!r.items.length || all.length >= r.totalCount) break;
      }
      setItems(all);
    } catch (e) {
      if (serial === request.current)
        setError(e instanceof Error ? e.message : "Siyahı alınmadı.");
    } finally {
      if (serial === request.current) setLoading(false);
    }
  }, [session]);
  useFocusEffect(
    useCallback(() => {
      navigation.current = false;
      void load();
      return () => {
        request.current++;
      };
    }, [load]),
  );
  const open = (url: Href) => {
    if (navigation.current) return;
    navigation.current = true;
    router.push(url);
  };
  const query = search.trim().toLocaleLowerCase("az-AZ");
  const visible = items.filter((r) =>
    [
      r.customerName,
      ...r.items.map((i) => i.productCode + " " + i.batchNumber),
    ].some((v) => v.toLocaleLowerCase("az-AZ").includes(query)),
  );
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <FlatList
        data={visible}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void load()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Vazvrad</Text>
            <Text style={styles.muted}>
              Menecer təsdiqi gözləyənlər · {items.length}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.button}
              onPress={() => open("/create-return")}
            >
              <Text style={styles.buttonText}>＋ Yeni vazvrad yarat</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.card}
              onPress={() => open("/(app)/(tabs)/search")}
            >
              <Text style={styles.name}>Tarixçə və axtarış ›</Text>
            </Pressable>
            <TextInput
              keyboardType="default"
              inputMode="text"
              value={search}
              onChangeText={setSearch}
              placeholder="Müştəri, kod və ya partiya axtar"
              placeholderTextColor={colors.textLight}
              style={styles.input}
            />
            {error !== "" && (
              <Pressable onPress={() => void load()}>
                <Text style={{ color: colors.danger }}>
                  {error} · Yenidən yoxla
                </Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.muted}>
              {error ? "" : "Təsdiq gözləyən vazvrad yoxdur."}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            style={styles.card}
            onPress={() =>
              open(`/return-detail/${item.id}?returnTo=returns` as Href)
            }
          >
            <Text style={styles.name}>{item.customerName}</Text>
            <Text style={styles.badge}>Təsdiq gözləyir</Text>
            <Text style={styles.muted}>
              {new Date(item.returnDateUtc).toLocaleDateString("az-AZ", {
                timeZone: "Asia/Baku",
              })}{" "}
              · {item.warehouseName}
            </Text>
            <Text style={styles.muted}>
              {item.items.length} məhsul ·{" "}
              {item.items.reduce((sum, i) => sum + i.quantity, 0)} ədəd
            </Text>
            {item.items.map((i) => (
              <Text key={i.id} style={styles.product}>
                Kod {i.productCode} · Partiya {i.batchNumber} · {i.quantity}{" "}
                ədəd
              </Text>
            ))}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: {
    padding: 20,
    paddingBottom: 35,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    gap: 14,
  },
  header: { gap: 16, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: colors.text },
  muted: { fontSize: 15, lineHeight: 23, color: colors.textSecondary },
  button: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 56,
  },
  buttonText: { fontSize: 17, fontWeight: "700", color: colors.background },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    color: colors.text,
    minHeight: 56,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  name: { fontSize: 18, fontWeight: "600", color: colors.text, flexShrink: 1 },
  badge: { fontSize: 13, color: colors.warning },
  product: { fontSize: 15, lineHeight: 22, color: colors.text },
});
