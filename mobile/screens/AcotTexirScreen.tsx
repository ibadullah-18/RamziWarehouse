// ==========================================================================
// GrandWall Mobile - "AÃ§ot TÉ™xir" ekranÄ±
// - Æn Ã§ox gecikÉ™n mÃ¼ÅŸtÉ™ri ÆN ÃœSTDÆ
// - Rollover-É™ (default: son gÃ¼n) yaxÄ±nlaÅŸanlar qÄ±rmÄ±zÄ± vurÄŸu + xÉ™ttlÉ™ ayrÄ±lÄ±r
// - SiyahÄ±da sadÉ™cÉ™ AD gÃ¶rÃ¼nÃ¼r (borc rÉ™qÉ™mi yox) - basanda detal aÃ§Ä±lÄ±r
// - Tam Ã¶dÉ™yÉ™n hÉ™min gecÉ™ (server-side rollover zamanÄ±) siyahÄ±dan itir
// ==========================================================================

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { apiClient } from "../api/authClient";

type PendingDebtRow = {
  customerId: string;
  customerName: string;
  todayDebtRemaining: number;
  oldDebtBalance: number;
  daysOverdue: number;
  isNearRollover: boolean;
};

export default function AcotTexirScreen() {
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<PendingDebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PendingDebtRow[]>("/debts/pending");
      // Backend artÄ±q DaysOverdue DESC sÄ±ralayÄ±r, amma frontend-dÉ™ dÉ™ tÉ™min edÉ™k:
      const sorted = [...data].sort((a, b) => b.daysOverdue - a.daysOverdue);
      setRows(sorted);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.customerId}
      contentContainerStyle={{ paddingVertical: 8 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>AÃ§ot tÉ™xirdÉ™ heÃ§ kim yoxdur ðŸŽ‰</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        // Bu sÉ™tirdÉ™n É™vvÉ™l xÉ™tt Ã§É™k: É™vvÉ™lki sÉ™tir "yaxÄ±n" deyil, bu sÉ™tir "yaxÄ±n"dÄ±r
        const prev = rows[index - 1];
        const showDivider = item.isNearRollover && (!prev || !prev.isNearRollover);

        return (
          <>
            {showDivider && (
              <View style={styles.dividerWrap}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>KÃ¶hnÉ™ borca keÃ§mÉ™yÉ™ yaxÄ±ndÄ±r</Text>
                <View style={styles.dividerLine} />
              </View>
            )}
            <Pressable
              style={[styles.row, item.isNearRollover && styles.rowUrgent]}
              onPress={() =>
                navigation.navigate("CustomerDebtDetail", { customerId: item.customerId })
              }
            >
              <Text style={styles.name}>{item.customerName}</Text>
              <Text
                style={[
                  styles.daysBadge,
                  { color: item.isNearRollover ? "#c0392b" : "#888" },
                ]}
              >
                {item.daysOverdue} gÃ¼n
              </Text>
            </Pressable>
          </>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 16, color: "#666" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e2e2",
    backgroundColor: "#fff",
  },
  rowUrgent: { backgroundColor: "#fff5f5" },
  name: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  daysBadge: { fontSize: 13, fontWeight: "700" },
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  dividerLine: { flex: 1, height: 1.5, backgroundColor: "#c0392b" },
  dividerLabel: { fontSize: 11, color: "#c0392b", fontWeight: "700" },
});
