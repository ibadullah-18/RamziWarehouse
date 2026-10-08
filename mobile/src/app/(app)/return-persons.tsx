import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { ReturnPerson, returnPersonRequest } from "../../api/return-person-api";
import { useAuth } from "../../auth/auth-context";
import { colors } from "../../theme";
import { dismissKeyboard } from "../../components/keyboard-form";
export default function ReturnPersonsScreen() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [people, setPeople] = useState<ReturnPerson[]>([]),
    [name, setName] = useState(""),
    [editing, setEditing] = useState<ReturnPerson | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (token) setPeople(await returnPersonRequest<ReturnPerson[]>(token));
  }, [token]);
  useFocusEffect(
    useCallback(() => {
      void load().catch((e) => setError(e.message));
    }, [load]),
  );
  async function save(person?: ReturnPerson) {
    if (busy || !token) return;
    setBusy(true);
    setError("");
    try {
      const value = person ?? {
        name: name.trim(),
        isActive: editing?.isActive ?? true,
      };
      if (!value.name) throw new Error("Adı yazın.");
      await returnPersonRequest(
        token,
        person ? `/${person.id}` : editing ? `/${editing.id}` : "",
        person || editing ? "PUT" : "POST",
        value,
      );
      setName("");
      setEditing(null);
      dismissKeyboard();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saxlanılmadı.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAwareScrollView
        bottomOffset={62}
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()}>
          <Text style={s.text}>‹ Geri</Text>
        </Pressable>
        <Text style={s.title}>Vazvrat yaradanlar</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          keyboardType="default"
          inputMode="text"
          returnKeyType="done"
          onSubmitEditing={dismissKeyboard}
          maxLength={150}
          placeholder="Şəxsin adı"
          placeholderTextColor={colors.textLight}
          style={s.input}
        />
        <Pressable disabled={busy} onPress={() => void save()} style={s.button}>
          <Text style={s.text}>
            {editing ? "Adı saxla" : "Yeni ad əlavə et"}
          </Text>
        </Pressable>
        {!!editing && (
          <Pressable
            onPress={() => {
              setEditing(null);
              setName("");
            }}
          >
            <Text style={s.text}>Redaktəni bağla</Text>
          </Pressable>
        )}
        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
        {people.map((p) => (
          <View key={p.id} style={s.input}>
            <Pressable
              onPress={() => {
                setEditing(p);
                setName(p.name);
              }}
            >
              <Text style={s.text}>
                {p.name} · {p.isActive ? "Aktiv" : "Deaktiv"}
              </Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => void save({ ...p, isActive: !p.isActive })}
            >
              <Text style={s.text}>
                {p.isActive ? "Deaktiv et" : "Aktiv et"}
              </Text>
            </Pressable>
          </View>
        ))}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { padding: 20, gap: 16 },
  title: { color: colors.text, fontSize: 24, fontWeight: "700" },
  text: { color: colors.text, fontSize: 16 },
  input: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    gap: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
});
