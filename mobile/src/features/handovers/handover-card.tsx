import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  deleteHandover,
  downloadHandoverPhoto,
  updateHandover,
  type Handover,
} from '../../api/handover-api';
import { confirmAction, showMessage } from '../../components/dialogs';
import { cachedPhoto } from '../../lib/photo-cache';
import { colors } from '../../theme';
import type { Customer } from '../orders/create-order-types';
import { AlphabetCustomerPicker } from './alphabet-customer-picker';
import { PhotoAlbum } from './photo-album';
import { prepareHandoverShare, sharePrepared, ShareNeedsTapError, type PreparedShare } from './share-handover';

const time = (utc: string) =>
  new Date(utc).toLocaleTimeString('az-AZ', { timeZone: 'Asia/Baku', hour: '2-digit', minute: '2-digit' });

/** One handover: album, customer, note, who/when; share (photos + note only), and for the sender edit/delete. */
export function HandoverCard({
  handover,
  token,
  userId,
  width,
  highlighted,
  onChanged,
}: {
  handover: Handover;
  token: string;
  userId: string;
  width: number;
  highlighted?: boolean;
  onChanged: () => void;
}) {
  const [prepared, setPrepared] = useState<PreparedShare | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareHint, setShareHint] = useState('');
  const [editing, setEditing] = useState(false);

  const load = useCallback(
    (index: number, thumbnail: boolean) => {
      const photo = handover.photos[index];
      return cachedPhoto(`tehvil-${userId}-${photo.id}-${thumbnail ? 'thumb' : 'full'}.jpg`, () =>
        downloadHandoverPhoto(token, handover.id, photo.id, thumbnail),
      );
    },
    [handover.id, handover.photos, token, userId],
  );

  async function share() {
    if (sharing) return;
    setShareHint('');
    try {
      // Ready from an earlier tap: open the share sheet straight away (the web app needs this).
      if (prepared) {
        await sharePrepared(prepared);
        return;
      }
      setSharing(true);
      const ready = await prepareHandoverShare(token, userId, handover);
      setPrepared(ready);
      setSharing(false);
      await sharePrepared(ready);
    } catch (error) {
      setSharing(false);
      if (error instanceof ShareNeedsTapError) setShareHint(error.message);
      else showMessage('Paylaşılmadı', error instanceof Error ? error.message : 'Yenidən yoxlayın.');
    }
  }

  return (
    <View style={[styles.card, { width, alignSelf: 'center' }, highlighted && styles.highlighted]}>
      <PhotoAlbum count={handover.photos.length} load={load} width={width - 24} />
      <View style={styles.info}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.customer} numberOfLines={2}>{handover.customerName}</Text>
          <Text style={styles.meta}>
            {time(handover.createdAtUtc)} · {handover.createdByFullName} · {handover.photos.length} şəkil
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Paylaş"
          onPress={() => void share()}
          style={({ pressed }) => [styles.share, pressed && { opacity: 0.7 }]}
        >
          {sharing ? <ActivityIndicator color={colors.white} /> : <Ionicons name="share-social" size={22} color={colors.white} />}
        </Pressable>
      </View>
      {handover.note ? <Text style={styles.note}>{handover.note}</Text> : null}
      {shareHint ? <Text style={styles.hint}>{shareHint}</Text> : null}
      {handover.canEdit ? (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={styles.action}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.actionText}>Düzəlt</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              confirmAction({
                title: 'Təhvili sil',
                message: `${handover.customerName} — ${handover.photos.length} şəkil silinsin?`,
                confirmText: 'Sil',
                destructive: true,
                onConfirm: () =>
                  void deleteHandover(token, handover.id)
                    .then(onChanged)
                    .catch((e) => showMessage('Silinmədi', e instanceof Error ? e.message : 'Yenidən yoxlayın.')),
              })
            }
            style={styles.action}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>Sil</Text>
          </Pressable>
        </View>
      ) : null}
      {editing ? (
        <EditHandover
          handover={handover}
          token={token}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      ) : null}
    </View>
  );
}

/** The sender fixes the customer or the note. */
function EditHandover({ handover, token, onClose, onSaved }: { handover: Handover; token: string; onClose: () => void; onSaved: () => void }) {
  const [customer, setCustomer] = useState<Pick<Customer, 'id' | 'name'>>({ id: handover.customerId, name: handover.customerName });
  const [note, setNote] = useState(handover.note ?? '');
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      await updateHandover(token, handover.id, customer.id, note);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saxlanmadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Təhvili düzəlt</Text>
          <Pressable accessibilityRole="button" onPress={() => setPicker(true)} style={styles.field}>
            <Text style={styles.fieldLabel}>Müştəri</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldValue} numberOfLines={1}>{customer.name}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </Pressable>
          <Text style={styles.fieldLabel}>Qeyd</Text>
          <TextInput
            value={note}
            keyboardType="default"
            inputMode="text"
            onChangeText={setNote}
            multiline
            maxLength={1000}
            placeholder="İstəyə görə"
            placeholderTextColor={colors.textLight}
            style={styles.noteInput}
          />
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          <View style={styles.sheetButtons}>
            <Pressable accessibilityRole="button" onPress={onClose} style={[styles.sheetButton, styles.sheetCancel]}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Geri</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()} style={[styles.sheetButton, styles.sheetSave]}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={{ color: colors.white, fontWeight: '700' }}>Saxla</Text>}
            </Pressable>
          </View>
        </View>
      </View>
      <AlphabetCustomerPicker
        visible={picker}
        token={token}
        selectedId={customer.id}
        onClose={() => setPicker(false)}
        onSelect={(value) => {
          setCustomer({ id: value.id, name: value.name });
          setPicker(false);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 10, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  highlighted: { borderColor: colors.primary, borderWidth: 2 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customer: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.textLight, fontSize: 13 },
  share: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success },
  note: { color: colors.textSecondary, fontSize: 15, lineHeight: 21 },
  hint: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10 },
  actionText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, gap: 10 },
  sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '700' },
  field: { gap: 4 },
  fieldLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.inputBorder },
  fieldValue: { flex: 1, color: colors.text, fontSize: 16 },
  noteInput: { minHeight: 90, borderRadius: 12, borderWidth: 1, borderColor: colors.inputBorder, padding: 12, color: colors.text, fontSize: 16, textAlignVertical: 'top' },
  sheetButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  sheetButton: { flex: 1, minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetCancel: { backgroundColor: colors.surfaceSecondary },
  sheetSave: { backgroundColor: colors.primary },
});
