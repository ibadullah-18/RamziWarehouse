import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { removeLogo, saveAppName, uploadLogo } from '../../api/branding-api';
import { useAuth } from '../../auth/auth-context';
import { BrandLogo } from '../../components/brand-logo';
import { confirmAction } from '../../components/dialogs';
import { TextField } from '../../components/form-inputs';
import { useBranding } from '../../features/branding/branding-provider';
import { AccountPageShell, Btn, Card, Notice } from '../../features/customer-accounts/account-ui';
import { colors } from '../../theme';

/** "settings.manage": the app name and logo shown everywhere (login, headers, web title). */
export default function AppSettingsScreen() {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  const branding = useBranding();
  // null = not edited yet: show the saved name.
  const [draft, setName] = useState<string | null>(null);
  const name = draft ?? branding.appName;
  const [busy, setBusy] = useState<'' | 'name' | 'logo'>('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const run = async (kind: 'name' | 'logo', action: () => Promise<void>, done: string) => {
    setBusy(kind);
    setError('');
    setSaved('');
    try {
      await action();
      setSaved(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yadda saxlanmadı.');
    } finally {
      setBusy('');
    }
  };

  const saveName = () => {
    const value = name.trim();
    if (!value || value.length > 40) {
      setError('Ad 1–40 simvol olmalıdır.');
      return;
    }
    void run('name', async () => { branding.apply(await saveAppName(token, value)); setName(null); }, 'Ad saxlanıldı. Hamıda dərhal dəyişir.');
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    const image = result.canceled ? null : result.assets[0];
    if (!image) return;
    if (image.fileSize && image.fileSize > 1024 * 1024) {
      setError('Loqo 1 MB-dan böyük olmamalıdır. Kiçik PNG və ya JPG seçin.');
      return;
    }
    void run('logo', async () => branding.apply(await uploadLogo(token, image)), 'Loqo saxlanıldı.');
  };

  const deleteLogo = () =>
    confirmAction({
      title: 'Loqonu sil',
      message: 'Loqo əvəzinə tətbiqin adı göstəriləcək.',
      confirmText: 'Sil',
      destructive: true,
      onConfirm: () => void run('logo', async () => branding.apply(await removeLogo(token)), 'Loqo silindi.'),
    });

  return (
    <AccountPageShell title="Tətbiqin adı və loqosu" subtitle="Giriş səhifəsində, başlıqlarda və saytda görünür">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="success">{saved}</Notice> : null}

      <Card>
        <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Hazırda belə görünür</Text>
        <View style={{ paddingVertical: 12 }}>
          <BrandLogo width={240} />
        </View>
      </Card>

      <Card>
        <TextField label="Tətbiqin adı" value={name} onChangeText={setName} maxLength={40} placeholder="Ramzi" autoCorrect={false} />
        <Btn icon="save-outline" title="Adı yadda saxla" busy={busy === 'name'} disabled={!!busy || name.trim() === branding.appName} onPress={saveName} />
      </Card>

      <Card>
        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
          Loqo: PNG, JPG və ya WEBP, ən çox 1 MB. Eni hündürlüyündən təxminən 3 dəfə böyük olan şəkil ən yaxşı görünür.
        </Text>
        <Btn icon="image-outline" title={branding.logoUrl ? 'Loqonu dəyiş' : 'Loqo seç'} busy={busy === 'logo'} disabled={!!busy} onPress={() => void pickLogo()} />
        {branding.logoUrl ? (
          <Btn icon="trash-outline" variant="secondary" title="Loqonu sil" disabled={!!busy} onPress={deleteLogo} />
        ) : null}
      </Card>

      <Notice>
        Telefondakı tətbiq ikonu və ana ekrandakı ad tətbiqin yeni versiyası quraşdırılanda dəyişir; tətbiqin içində ad və loqo dərhal yenilənir.
      </Notice>
    </AccountPageShell>
  );
}
