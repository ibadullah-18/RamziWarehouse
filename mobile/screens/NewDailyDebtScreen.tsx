// ==========================================================================
// GrandWall Mobile - GÃ¼ndÉ™lik borc yazma ekranÄ± ("AÃ§ot yazan" rolu)
// - Yaradan iÅŸÃ§inin adÄ± MANUAL yazÄ±lmÄ±r, auth-dan avtomatik gedir (backend
//   CreatedByUserId-i token-dÉ™n gÃ¶tÃ¼rÃ¼r).
// - RedaktÉ™ zamanÄ± SÆBÆB SAHÆSÄ° YOXDUR - sadÉ™cÉ™ yeni mÉ™blÉ™ÄŸ yazÄ±lÄ±r,
//   kim/nÉ™ vaxt dÉ™yiÅŸdiyi avtomatik tarixÃ§É™yÉ™ dÃ¼ÅŸÃ¼r.
// ==========================================================================

import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { apiClient } from "../api/authClient";

type Props = {
  customerId: string;
  customerName: string;
  existingDailyDebtId?: string; // varsa - redaktÉ™ rejimi
  existingAmount?: number;
  onDone: () => void;
};

export default function NewDailyDebtScreen({
  customerId,
  customerName,
  existingDailyDebtId,
  existingAmount,
  onDone,
}: Props) {
  const [amount, setAmount] = useState(existingAmount ? String(existingAmount) : "");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(existingDailyDebtId);

  const submit = async () => {
    const value = Number(amount.replace(",", "."));
    if (!value || value <= 0) {
      Alert.alert("XÉ™ta", "MÉ™blÉ™ÄŸi dÃ¼zgÃ¼n daxil edin.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await apiClient.patch(`/debts/${existingDailyDebtId}`, { newAmount: value });
      } else {
        await apiClient.post(`/debts/customers/${customerId}`, { amount: value });
      }
      onDone();
    } catch (e) {
      Alert.alert("XÉ™ta", "Yadda saxlanÄ±lmadÄ±, yenidÉ™n yoxlayÄ±n.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{customerName}</Text>
      <Text style={styles.subtitle}>
        {isEdit ? "GÃ¼ndÉ™lik borcu dÃ¼zÉ™lt" : "BugÃ¼nkÃ¼ borcu yaz"}
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="MÉ™blÉ™ÄŸ (â‚¼)"
        value={amount}
        onChangeText={setAmount}
        autoFocus
      />

      <Pressable style={styles.button} onPress={submit} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Yadda saxlanÄ±lÄ±r..." : "Yadda saxla"}</Text>
      </Pressable>

      {isEdit && (
        <Text style={styles.hint}>
          DÉ™yiÅŸiklik avtomatik tarixÃ§É™yÉ™ yazÄ±lacaq (kim, nÉ™ vaxt). SÉ™bÉ™b yazmaÄŸa ehtiyac yoxdur.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  subtitle: { fontSize: 14, color: "#666", marginTop: 4, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  hint: { marginTop: 12, fontSize: 12, color: "#888" },
});
