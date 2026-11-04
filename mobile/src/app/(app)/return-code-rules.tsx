import { useEffect, useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';

import { getReturnCodeRule, saveReturnCodeRule } from '../../api/product-return-api';
import { useAuth } from '../../auth/auth-context';
import { dismissKeyboard } from '../../components/keyboard-form';
import { AccountPageShell, Btn, Card, Loading, Notice } from '../../features/customer-accounts/account-ui';
import { codeRuleProblem } from '../../features/product-returns/code-rule';
import { colors } from '../../theme';

/** Admin: the wallpaper code rule for every return (digits and "second digit 0"). */
export default function ReturnCodeRulesScreen() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [length, setLength] = useState('');
  const [secondZero, setSecondZero] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    if (!token) return;
    getReturnCodeRule(token)
      .then((rule) => {
        setLength(rule.requiredLength ? String(rule.requiredLength) : '');
        setSecondZero(rule.secondDigitMustBeZero);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Qayda alınmadı.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function save() {
    if (!token) return;
    const value = length.trim() === '' ? null : Number(length);
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > 10)) {
      setError('Rəqəm sayı 1–10 arasında olmalıdır və ya boş qalsın.');
      return;
    }
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const rule = await saveReturnCodeRule(token, { requiredLength: value, secondDigitMustBeZero: secondZero });
      setLength(rule.requiredLength ? String(rule.requiredLength) : '');
      setSecondZero(rule.secondDigitMustBeZero);
      setSaved('Qayda saxlanıldı. Bütün yeni vazvradlara tətbiq olunur.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Qayda saxlanmadı.');
    } finally {
      setBusy(false);
    }
  }

  const preview = { requiredLength: length.trim() === '' ? null : Number(length), secondDigitMustBeZero: secondZero };
  const examples = ['1019', '5012', '101', '10191', '1519'];

  return (
    <AccountPageShell title="Vazvrad kod qaydası" subtitle="Bütün müştərilərin vazvradlarına aiddir">
      {loading ? (
        <Loading />
      ) : (
        <>
          <Card>
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Məhsul kodu neçə rəqəmli olsun?</Text>
            <TextInput
              value={length}
              onChangeText={(text) => setLength(text.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad"
              inputMode="numeric"
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={dismissKeyboard}
              placeholder="Boş: istənilən uzunluq"
              placeholderTextColor={colors.textLight}
              style={{
                minHeight: 54,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                backgroundColor: colors.surface,
                color: colors.text,
                paddingHorizontal: 14,
                fontSize: 18,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>İkinci rəqəm 0 olsun</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>10.., 30.., 50.., 60.., 70.. kimi kodlar</Text>
              </View>
              <Switch value={secondZero} onValueChange={setSecondZero} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>
          </Card>

          <Card>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Yoxlama</Text>
            {examples.map((code) => {
              const problem = codeRuleProblem(code, preview);
              return (
                <Text key={code} style={{ color: problem ? colors.danger : colors.success, fontSize: 14 }}>
                  {code}: {problem ?? 'qəbul olunur'}
                </Text>
              );
            })}
          </Card>

          {error ? <Notice tone="error">{error}</Notice> : null}
          {saved ? <Notice tone="success">{saved}</Notice> : null}
          <Btn title="Saxla" icon="save-outline" onPress={() => void save()} busy={busy} />
        </>
      )}
    </AccountPageShell>
  );
}
