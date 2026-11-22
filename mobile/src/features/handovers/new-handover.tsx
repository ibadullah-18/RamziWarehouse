import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { createHandover } from '../../api/handover-api';
import { useAuth } from '../../auth/auth-context';
import { showMessage } from '../../components/dialogs';
import { colors } from '../../theme';
import { CameraPermissionError } from '../product-returns/photo-capture';
import { AlphabetCustomerPicker } from './alphabet-customer-picker';
import { handoverDraft, MAX_HANDOVER_PHOTOS, useHandoverDraft } from './handover-draft';

/** Opens the camera for the draft; shows a message if the camera is not allowed. */
export async function captureForDraft(replaceIndex?: number) {
  try {
    await handoverDraft.capture(replaceIndex);
  } catch (error) {
    showMessage(
      'Kamera açılmadı',
      error instanceof CameraPermissionError ? error.message : error instanceof Error ? error.message : 'Yenidən yoxlayın.',
    );
  }
}

/**
 * New "Mal təhvil": photos first (each with "Yenidən çək", up to 10), then the customer
 * (search + A–Z), an optional note, and "Tamam" sends everything to the manager at once.
 */
export function NewHandover({ onSent }: { onSent: () => void }) {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  const draft = useHandoverDraft();
  const { width } = useWindowDimensions();
  const [picker, setPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const tile = Math.floor((Math.min(width - 32, 560) - 24 - 10) / 2);
  const canAdd = draft.photos.length < MAX_HANDOVER_PHOTOS;
  const ready = draft.photos.length > 0 && !!draft.customer;

  async function send() {
    if (!ready || sending || !draft.customer) return;
    setSending(true);
    setError('');
    try {
      await createHandover(token, {
        operationId: draft.operationId,
        customerId: draft.customer.id,
        note: draft.note,
        photos: draft.photos.map((p) => ({ uri: p.uri, fileName: p.fileName })),
      });
      handoverDraft.reset();
      onSent();
    } catch (e) {
      // The draft stays as it is (same operation id), so pressing again cannot send it twice.
      setError(e instanceof Error ? e.message : 'Göndərilmədi. Yenidən basın.');
    } finally {
      setSending(false);
    }
  }

  if (draft.photos.length === 0) {
    return (
      <Pressable accessibilityRole="button" onPress={() => void captureForDraft()} style={styles.start}>
        <View style={styles.startIcon}>
          <Ionicons name="camera" size={44} color={colors.white} />
        </View>
        <Text style={styles.startTitle}>Şəkil çək</Text>
        <Text style={styles.startText}>Malın təhvil şəklini çəkin. Bir təhvildə {MAX_HANDOVER_PHOTOS} şəklə qədər göndərmək olar.</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.section}>1. Şəkillər · {draft.photos.length}/{MAX_HANDOVER_PHOTOS}</Text>
        <View style={styles.grid}>
          {draft.photos.map((photo, index) => (
            <View key={photo.operationId} style={{ width: tile, gap: 6 }}>
              <View>
                <Image source={{ uri: photo.uri }} style={{ width: tile, height: tile * 1.25, borderRadius: 12 }} contentFit="cover" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Şəkli çıxar"
                  onPress={() => handoverDraft.remove(index)}
                  hitSlop={8}
                  style={styles.remove}
                >
                  <Ionicons name="close" size={18} color={colors.white} />
                </Pressable>
              </View>
              <Pressable accessibilityRole="button" onPress={() => void captureForDraft(index)} style={styles.retake}>
                <Ionicons name="camera-reverse-outline" size={18} color={colors.primary} />
                <Text style={styles.retakeText}>Yenidən çək</Text>
              </Pressable>
            </View>
          ))}
          {canAdd ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void captureForDraft()}
              style={[styles.add, { width: tile, height: tile * 1.25 }]}
            >
              <Ionicons name="add-circle" size={40} color={colors.primary} />
              <Text style={styles.addText}>Şəkil əlavə et</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>2. Müştəri</Text>
        <Pressable accessibilityRole="button" onPress={() => setPicker(true)} style={[styles.customer, draft.customer && styles.customerOn]}>
          <Ionicons name={draft.customer ? 'checkmark-circle' : 'person-circle-outline'} size={26} color={draft.customer ? colors.success : colors.primary} />
          <Text style={[styles.customerText, !draft.customer && { color: colors.primary }]} numberOfLines={1}>
            {draft.customer ? draft.customer.name : 'Müştəri seç'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>3. Qeyd (istəyə görə)</Text>
        <TextInput
          value={draft.note}
          keyboardType="default"
          inputMode="text"
          onChangeText={handoverDraft.setNote}
          multiline
          maxLength={1000}
          placeholder="Məsələn: qapıda təhvil verildi"
          placeholderTextColor={colors.textLight}
          style={styles.note}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={!ready || sending}
        onPress={() => void send()}
        style={[styles.send, (!ready || sending) && { opacity: 0.5 }]}
      >
        {sending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="checkmark-done" size={22} color={colors.white} />}
        <Text style={styles.sendText}>{sending ? 'Göndərilir…' : 'Tamam — menecerə göndər'}</Text>
      </Pressable>
      {!draft.customer ? <Text style={styles.hint}>Göndərmək üçün müştəri seçin.</Text> : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => handoverDraft.reset()}
        style={styles.discard}
      >
        <Text style={styles.discardText}>Hamısını sil, yenidən başla</Text>
      </Pressable>

      <AlphabetCustomerPicker
        visible={picker}
        token={token}
        selectedId={draft.customer?.id}
        onClose={() => setPicker(false)}
        onSelect={(customer) => {
          handoverDraft.setCustomer({ id: customer.id, name: customer.name });
          setPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  start: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  startIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  startTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  startText: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  card: { padding: 12, gap: 10, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  section: { color: colors.text, fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  retake: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  retakeText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  add: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  addText: { color: colors.primary, fontWeight: '700' },
  customer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  customerOn: { borderColor: colors.success, backgroundColor: colors.successSoft },
  customerText: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
  note: {
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 12,
    color: colors.text,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  error: { color: colors.danger, fontSize: 15 },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: colors.success,
  },
  sendText: { color: colors.white, fontSize: 17, fontWeight: '800' },
  hint: { color: colors.textSecondary, textAlign: 'center' },
  discard: { alignSelf: 'center', paddingVertical: 8 },
  discardText: { color: colors.danger, fontWeight: '600' },
});
