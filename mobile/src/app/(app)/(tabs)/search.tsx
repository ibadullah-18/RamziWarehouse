import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect, type Href } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getProductReturns } from "../../../api/product-return-api";
import { useAuth } from "../../../auth/auth-context";
import { CustomerPickerModal } from "../../../components/customer-picker-modal";
import type { Customer } from "../../../features/customers/customer-types";
import {
  ProductReturn,
  ProductType,
} from "../../../features/product-returns/product-return-types";
import {
  getReturnStatusLabel,
  getReturnTypeSummary,
} from "../../../features/product-returns/product-return-status";
import { colors } from "../../../theme";
import AccountDateInput from "../../../features/customer-accounts/account-date-input";
import { isBusinessDate } from "../../../features/customer-accounts/account-navigation";
import { todayKey } from "../../../features/customer-accounts/account-screen";
type Kind = "both" | "return" | "showcase";
export default function SearchScreen() {
  const { session } = useAuth();
  const token = session?.accessToken ?? "";
  const [searchMode, setSearchMode] = useState<"customer" | "accepted">(
    "customer",
  );
  const [acceptedDate, setAcceptedDate] = useState(todayKey);
  const [customer, setCustomer] = useState<Customer | null>(null),
    [picker, setPicker] = useState(false),
    [kind, setKind] = useState<Kind>("both"),
    [items, setItems] = useState<ProductReturn[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const request = useRef(0),
    navigation = useRef(false);
  const load = useCallback(async () => {
    const serial = ++request.current;
    if ((searchMode === "customer" && !customer) || !token) {
      setItems([]);
      return;
    }
    if (searchMode === "accepted" && !isBusinessDate(acceptedDate)) {
      setItems([]);
      setError("Düzgün tarix seçin.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      let page = 1,
        all: ProductReturn[] = [];
      while (true) {
        const result = await getProductReturns(token, {
          customerId: searchMode === "customer" ? customer?.id : undefined,
          acceptedDate: searchMode === "accepted" ? acceptedDate : undefined,
          productType:
            kind === "both"
              ? undefined
              : kind === "return"
                ? ProductType.Product
                : ProductType.Showcase,
          pageNumber: page++,
          pageSize: 100,
        });
        if (serial !== request.current) return;
        all = all.concat(result.items);
        if (!result.items.length || all.length >= result.totalCount) break;
      }
      setItems(all);
    } catch (e) {
      if (serial === request.current)
        setError(e instanceof Error ? e.message : "Məlumat alınmadı.");
    } finally {
      if (serial === request.current) setLoading(false);
    }
  }, [customer, kind, token, searchMode, acceptedDate]);
  useFocusEffect(
    useCallback(() => {
      navigation.current = false;
      void load();
      return () => {
        request.current++;
      };
    }, [load]),
  );
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.page}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void load()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Vazvrad və vitrin axtarışı</Text>
            <View style={styles.filters}>
              {[
                ["customer", "Müştəri üzrə"],
                ["accepted", "Anbara qəbul tarixi"],
              ].map(([value, label]) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: searchMode === value }}
                  key={value}
                  style={[styles.chip, searchMode === value && styles.selected]}
                  onPress={() => {
                    if (searchMode === value) return;
                    request.current++;
                    setItems([]);
                    setSearchMode(value as "customer" | "accepted");
                  }}
                >
                  <Text
                    style={[
                      styles.label,
                      searchMode === value && styles.selectedLabel,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {searchMode === "accepted" && (
              <>
                <Text style={styles.muted}>
                  Seçilmiş tarixdə menecerin təsdiqlədiyi və anbara qəbul edilən
                  qeydlər
                </Text>
                <AccountDateInput
                  value={acceptedDate}
                  onChange={setAcceptedDate}
                />
              </>
            )}
            {searchMode === "customer" && (
              <>
                <Text style={styles.muted}>
                  Müştərini və məhsul növünü seçin. Bütün tarixlər üzrə qeydlər
                  göstərilir.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  style={styles.card}
                  onPress={() => setPicker(true)}
                >
                  <Text style={styles.name}>
                    {customer?.name ?? "Müştəri seçin"} ›
                  </Text>
                </Pressable>
              </>
            )}
            <View style={styles.filters}>
              {(
                [
                  ["return", "Vazvrad"],
                  ["showcase", "Vitrin"],
                  ["both", "Hər ikisi"],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: kind === value }}
                  key={value}
                  style={[styles.chip, kind === value && styles.selected]}
                  onPress={() => {
                    if (kind === value) return;
                    request.current++;
                    setItems([]);
                    setKind(value);
                  }}
                >
                  <Text
                    style={[
                      styles.label,
                      kind === value && styles.selectedLabel,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {(customer || searchMode === "accepted") && (
              <Text style={styles.muted}>
                {items.length} qeyd ·{" "}
                {items.reduce(
                  (sum, r) =>
                    sum +
                    r.items
                      .filter(
                        (i) =>
                          kind === "both" ||
                          i.productType ===
                            (kind === "return"
                              ? ProductType.Product
                              : ProductType.Showcase),
                      )
                      .reduce((n, i) => n + i.quantity, 0),
                  0,
                )}{" "}
                ədəd
              </Text>
            )}
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
              {!customer && searchMode === "customer"
                ? "Axtarış üçün müştəri seçin."
                : error
                  ? ""
                  : "Seçiminizə uyğun qeyd yoxdur."}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            style={styles.card}
            onPress={() => {
              if (navigation.current) return;
              navigation.current = true;
              router.push(`/return-detail/${item.id}` as Href);
            }}
          >
            <Text style={styles.name}>
              {new Date(
                searchMode === "accepted"
                  ? (item.completedAtUtc ?? item.returnDateUtc)
                  : item.returnDateUtc,
              ).toLocaleDateString("az-AZ", {
                timeZone: "Asia/Baku",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}{" "}
              · {getReturnTypeSummary(item.items.map((i) => i.productType))}
            </Text>
            {searchMode === "accepted" && (
              <Text style={styles.name}>
                {item.customerName} · {item.warehouseName}
              </Text>
            )}
            <Text style={styles.muted}>
              {getReturnStatusLabel(item.status)}
            </Text>
            {item.items.slice(0, 2).map((i) => (
              <Text style={styles.code} key={i.id}>
                Kod {i.productCode} · Partiya {i.batchNumber}
              </Text>
            ))}
            {item.items.length > 2 && (
              <Text style={styles.muted}>
                + {item.items.length - 2} digər məhsul · Detalları aç ›
              </Text>
            )}
          </Pressable>
        )}
      />
      <CustomerPickerModal
        visible={picker}
        accessToken={token}
        includeInactive
        selectedCustomerId={customer?.id}
        onClose={() => setPicker(false)}
        onSelect={(value) => {
          request.current++;
          setItems([]);
          setCustomer(value);
          setPicker(false);
        }}
      />
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
    gap: 14,
  },
  header: { gap: 16, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: "700", color: colors.text },
  muted: { fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 18,
    gap: 10,
  },
  name: { fontSize: 18, fontWeight: "600", color: colors.text },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { color: colors.text, fontWeight: "600", fontSize: 16 },
  selectedLabel: { color: colors.background },
  code: { fontSize: 16, color: colors.text, lineHeight: 23 },
});
