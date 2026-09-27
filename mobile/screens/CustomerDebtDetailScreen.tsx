// ==========================================================================
// GrandWall Mobile - MÃ¼ÅŸtÉ™ri detalÄ± ekranÄ± ("AÃ§ot qÉ™bul edÉ™n" rolu)
// MÃ¼ÅŸtÉ™ri adÄ±na basandan sonra aÃ§Ä±lÄ±r: bugÃ¼nkÃ¼ qalÄ±q borc, kÃ¶hnÉ™ borc,
// Ã¶dÉ™niÅŸ qÉ™bulu dÃ¼ymÉ™si vÉ™ "gÃ¼ndÉ™lik borc bu qÉ™dÉ™r olub, bu qÉ™dÉ™r Ã¶dÉ™nilib"
// formatÄ±nda tarixÃ§É™.
// ==========================================================================

import React, { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { apiClient } from "../api/authClient";

type HistoryItem = {
  date: string;
  debtAmount: number;
  paidAmount: number;
  status: "Pending" | "PartiallyPaid" | "Paid" | "RolledOver";
  createdByUserId: string;
  lastEditedByUserId?: string | null;
};

const STATUS_LABEL: Record<HistoryItem["status"], string> = {
  Pending: "Ã–dÉ™nilmÉ™yib",
  PartiallyPaid: "QismÉ™n Ã¶dÉ™nilib",
  Paid: "Tam Ã¶dÉ™nilib",
  RolledOver: "KÃ¶hnÉ™ borca keÃ§ib",
};

export default function CustomerDebtDetailScreen() {
  const route = useRoute<any>();
  const { customerId, customerName } = route.params;

  const [todayDebt, setTodayDebt] = useState(0);
  const [oldDebt, setOldDebt] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [pendingRes, historyRes] = await Promise.all([
      apiClient.get("/debts/pending"),
      apiClient.get(`/debts/customers/${customerId}/history`),
    ]);
    const row = pendingRes.data.find((r: any) => r.customerId === customerId);
    setTodayDebt(row?.todayDebtRemaining ?? 0);
    setOldDebt(row?.oldDebtBalance ?? 0);
    setHistory(historyRes.data);
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const submitPayment = async () => {
    const value = Number(paymentAmount.replace(",", "."));
    if (!value || value <= 0) {
      Alert.alert("XÉ™ta", "Ã–dÉ™niÅŸ mÉ™blÉ™ÄŸini dÃ¼zgÃ¼n daxil edin.");
      return;
    }
    setSubmitting(true);
    try {
      // BÃ¶lÃ¼ÅŸdÃ¼rmÉ™ (É™vvÉ™l bugÃ¼nkÃ¼, sonra kÃ¶hnÉ™) SERVER TÆRÆFDÆ avtomatik olur.
      await apiClient.post(`/debts/customers/${customerId}/payments`, { amount: value });
      setPaymentAmount("");
      await load();
      Alert.alert("UÄŸurlu", "Ã–dÉ™niÅŸ qeydÉ™ alÄ±ndÄ±.");
    } catch {
      Alert.alert("XÉ™ta", "Ã–dÉ™niÅŸ qeydÉ™ alÄ±na bilmÉ™di.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{customerName}</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>BugÃ¼nkÃ¼ borc</Text>
          <Text style={styles.summaryValue}>{todayDebt.toFixed(2)} â‚¼</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>KÃ¶hnÉ™ borc</Text>
          <Text style={styles.summaryValue}>{oldDebt.toFixed(2)} â‚¼</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Ã–dÉ™niÅŸ qÉ™bul et</Text>
      <View style={styles.paymentRow}>
        <TextInput
          style={styles.paymentInput}
          keyboardType="decimal-pad"
          placeholder="MÉ™blÉ™ÄŸ (â‚¼)"
          value={paymentAmount}
          onChangeText={setPaymentAmount}
        />
        <Pressable style={styles.payButton} onPress={submitPayment} disabled={submitting}>
          <Text style={styles.payButtonText}>{submitting ? "..." : "QÉ™bul et"}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>TarixÃ§É™</Text>
      {history.map((h, idx) => (
        <View key={idx} style={styles.historyRow}>
          <Text style={styles.historyDate}>{h.date}</Text>
          <Text style={styles.historyText}>
            GÃ¼ndÉ™lik borc {h.debtAmount.toFixed(2)} â‚¼ olub, {h.paidAmount.toFixed(2)} â‚¼ Ã¶dÉ™nilib.
          </Text>
          <Text style={styles.historyStatus}>{STATUS_LABEL[h.status]}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  summaryBox: { flex: 1, backgroundColor: "#f4f5f7", borderRadius: 12, padding: 14 },
  summaryLabel: { fontSize: 12, color: "#666" },
  summaryValue: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginTop: 8, marginBottom: 10 },
  paymentRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  paymentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  payButton: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  payButtonText: { color: "#fff", fontWeight: "700" },
  historyRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e2e2",
    paddingVertical: 10,
  },
  historyDate: { fontSize: 12, color: "#999" },
  historyText: { fontSize: 14, color: "#1a1a1a", marginTop: 2 },
  historyStatus: { fontSize: 12, color: "#2563eb", marginTop: 2, fontWeight: "600" },
});
