import { Ionicons } from '@expo/vector-icons';
import { type Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import {
  cancelProductReturn,
  completeProductReturn,
  deleteProductReturnPhoto,
  getProductReturnById,
  submitProductReturn,
} from '../../../api/product-return-api';
import { canManageOperations } from '../../../auth/permissions';
import { confirmAction, showMessage } from '../../../components/dialogs';
import { useAuth } from '../../../auth/auth-context';
import { UserRole } from '../../../auth/auth-types';
import { AuthenticatedProductReturnPhoto } from '../../../components/authenticated-product-return-photo';
import { ReturnPhotoGallery } from '../../../components/return-photo-gallery';
import {
  AccountPageShell,
  Btn,
  Card,
  Grid,
  Line,
  Loading,
  Notice,
  SectionTitle,
  money,
} from '../../../features/customer-accounts/account-ui';
import { getProductTypeLabel, getReturnStatusLabel, getReturnTypeSummary } from '../../../features/product-returns/product-return-status';
import { CameraPermissionError, captureReturnPhoto } from '../../../features/product-returns/photo-capture';
import {
  discardPhoto,
  enqueuePhoto,
  onPhotoUploaded,
  retryPhoto,
  usePhotoJobs,
} from '../../../features/product-returns/photo-upload-queue';
import { ProductReturn, ReturnStatus } from '../../../features/product-returns/product-return-types';
import { colors } from '../../../theme';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Əməliyyat yerinə yetirilmədi.';

/**
 * Employee steps (create, photos, send to the manager) show the employee name chosen on the
 * form, not the account that was logged in; approval and cancellation show the real user.
 */
const actorName = (record: ProductReturn, entry: ProductReturn['statusHistory'][number]) =>
  record.returnPersonName &&
  entry.changedByUserId === record.createdByUserId &&
  (entry.newStatus === ReturnStatus.Pending || entry.newStatus === ReturnStatus.Submitted)
    ? record.returnPersonName
    : entry.changedByFullName;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('az-AZ', {
    timeZone: 'Asia/Baku',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * A return is effective as soon as it exists: there is no approval step. The screen shows
 * the codes, the amount, the proof photos (uploaded in the background) and lets the
 * creator or an admin correct or delete it until it has been credited to a debt.
 */
export default function ReturnDetailScreen() {
  const { session } = useAuth();
  const parameters = useLocalSearchParams<{ id?: string | string[] }>();
  const returnId = Array.isArray(parameters.id) ? parameters.id[0] : parameters.id;
  const token = session?.accessToken;
  const isAdmin = session?.role === UserRole.Admin;
  const isManager = canManageOperations(session?.role);

  const [record, setRecord] = useState<ProductReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [working, setWorking] = useState<'submit' | 'complete' | 'cancel' | null>(null);
  const jobs = usePhotoJobs(returnId);
  const navigating = useRef(false);
  const request = useRef(0);

  const load = useCallback(async () => {
    if (!token || !returnId) return;
    const serial = ++request.current;
    try {
      const result = await getProductReturnById(token, returnId);
      if (serial !== request.current) return;
      setRecord(result);
      setError(null);
    } catch (e) {
      if (serial === request.current) setError(errorMessage(e));
    } finally {
      if (serial === request.current) setLoading(false);
    }
  }, [token, returnId]);

  useFocusEffect(
    useCallback(() => {
      navigating.current = false;
      void load();
      return () => {
        request.current++;
      };
    }, [load]),
  );

  // A finished background upload refreshes the gallery without the user doing anything.
  useEffect(() => onPhotoUploaded((id) => id === returnId && void load()), [returnId, load]);

  async function takePhoto() {
    if (!record || capturing) return;
    setCapturing(true);
    try {
      const photo = await captureReturnPhoto();
      if (photo) enqueuePhoto(record.id, photo);
    } catch (e) {
      showMessage(e instanceof CameraPermissionError ? 'Kamera icazəsi lazımdır' : 'Şəkil çəkilmədi', errorMessage(e));
    } finally {
      setCapturing(false);
    }
  }

  function confirmDeletePhoto(photoId: string) {
    confirmAction({
      title: 'Şəkil silinsin?',
      message: 'Bu sübut şəkli silinəcək.',
      confirmText: 'Bəli, sil',
      destructive: true,
      onConfirm: () => void deletePhoto(photoId),
    });
  }

  async function deletePhoto(photoId: string) {
    if (!token || !record || deletingPhoto) return;
    setDeletingPhoto(photoId);
    try {
      await deleteProductReturnPhoto(token, record.id, photoId);
      setRecord((current) =>
        current ? { ...current, photos: current.photos.filter((photo) => photo.id !== photoId) } : current,
      );
    } catch (e) {
      showMessage('Şəkil silinmədi', errorMessage(e));
    } finally {
      setDeletingPhoto(null);
    }
  }

  async function runWorkflow(action: 'submit' | 'complete' | 'cancel') {
    if (!token || !record || working) return;
    setWorking(action);
    try {
      const updated =
        action === 'submit'
          ? await submitProductReturn(token, record.id)
          : action === 'complete'
            ? await completeProductReturn(token, record.id)
            : await cancelProductReturn(token, record.id);
      setRecord(updated);
    } catch (e) {
      showMessage('Əməliyyat alınmadı', errorMessage(e));
    } finally {
      setWorking(null);
    }
  }

  function confirmWorkflow(action: 'submit' | 'complete' | 'cancel') {
    const text = {
      submit: ['Menecerə göndərilsin?', 'Vazvrad menecerin təsdiqinə təqdim ediləcək.', 'Göndər'],
      complete: ['Sistemə işlənsin?', 'Vazvrad təsdiqlənəcək və məbləği borcdan çıxılacaq.', 'Təsdiqlə'],
      cancel: ['Vazvrad ləğv edilsin?', 'Bu qeyd ləğv ediləcək. Borcdan çıxılıbsa, borc geri qaytarılacaq.', 'Ləğv et'],
    }[action];
    confirmAction({
      title: text[0],
      message: text[1],
      confirmText: text[2],
      destructive: action === 'cancel',
      onConfirm: () => void runWorkflow(action),
    });
  }

  const openEditor = (deleting = false) => {
    if (navigating.current || !record) return;
    navigating.current = true;
    router.push(`/edit-return/${record.id}${deleting ? '?action=delete' : ''}` as Href);
  };

  if (loading || !token) {
    return (
      <AccountPageShell title="Vazvrad">
        <Loading />
      </AccountPageShell>
    );
  }

  if (error || !record) {
    return (
      <AccountPageShell title="Vazvrad">
        <Notice tone="error">{error ?? 'Vazvrad tapılmadı.'}</Notice>
        <Btn title="Yenidən yoxla" onPress={() => void load()} />
      </AccountPageShell>
    );
  }

  const applied = record.appliedAmount > 0;
  const open = record.status === ReturnStatus.Pending || record.status === ReturnStatus.Submitted;
  const canChange = !record.isDeleted && (isAdmin || open);
  // Only photos that are still on their way block sending; a failed one can be retried or skipped.
  const uploading = jobs.some((job) => job.status !== 'failed');
  const failedPhotos = jobs.filter((job) => job.status === 'failed').length;
  const totalQuantity = record.items.reduce((sum, item) => sum + item.quantity, 0);
  const type = getReturnTypeSummary(record.items.map((item) => item.productType));

  return (
    <AccountPageShell
      title={record.customerName}
      subtitle={`${type} · ${formatDateTime(record.returnDateUtc)} · ${getReturnStatusLabel(record.status)}`}
      refreshing={false}
      onRefresh={() => void load()}
    >
      {record.isDeleted ? <Notice tone="error">Bu qeyd silinib.</Notice> : null}

      <Card>
        <Line label="Anbar" value={record.warehouseName} />
        <Line label="Vazvratı yaradan" value={record.returnPersonName ?? '—'} />
        <Line label="Status" value={getReturnStatusLabel(record.status)} strong />
        {record.processedByFullName ? (
          <Line label="Təsdiqləyən / işləyən" value={record.processedByFullName} />
        ) : null}
        <Line label="Məhsul sətri / ədəd" value={`${record.items.length} / ${totalQuantity}`} />
        <Line label="Məbləğ" value={money(record.amount ?? 0)} strong />
        {applied ? (
          <Notice tone="success">Borcdan çıxılıb: {money(record.appliedAmount)}</Notice>
        ) : (
          <Notice>Açotda müştəri ilə hesablaşanda borcdan çıxarılacaq.</Notice>
        )}
        {record.additionalNote ? <Text style={{ color: colors.textSecondary }}>{record.additionalNote}</Text> : null}
      </Card>

      <SectionTitle>Məhsullar</SectionTitle>
      <Grid>
        {record.items.map((item) => (
          <Card key={item.id}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
              Kod {item.productCode} · Partiya {item.batchNumber}
            </Text>
            <Line label={getProductTypeLabel(item.productType)} value={`${item.quantity} ədəd`} />
          </Card>
        ))}
      </Grid>

      <SectionTitle>Sübut şəkilləri</SectionTitle>
      {canChange ? (
        <Btn
          icon="camera"
          title={capturing ? 'Kamera açılır…' : 'Kamera ilə şəkil çək'}
          onPress={() => void takePhoto()}
          disabled={capturing}
        />
      ) : null}

      {jobs.length > 0 ? (
        <View style={{ gap: 10 }}>
          {jobs.map((job) => (
            <Card key={job.id} tone={job.status === 'failed' ? 'warning' : 'default'}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Image source={{ uri: job.uri }} style={{ width: 72, height: 72, borderRadius: 10 }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>
                    {job.status === 'failed' ? 'Göndərilmədi' : 'Göndərilir…'}
                  </Text>
                  {job.error && job.status === 'failed' ? (
                    <Text style={{ color: colors.danger, fontSize: 13 }}>{job.error}</Text>
                  ) : (
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      Arxa planda göndərilir, gözləmək lazım deyil.
                    </Text>
                  )}
                </View>
              </View>
              {job.status === 'failed' ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Btn title="Yenidən göndər" onPress={() => retryPhoto(job.id)} style={{ flex: 1 }} />
                  <Btn title="Sil" variant="secondary" onPress={() => discardPhoto(job.id)} style={{ flex: 1 }} />
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      ) : null}

      {record.photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {record.photos.map((photo, index) => (
            <View key={photo.id} style={{ gap: 6 }}>
              <AuthenticatedProductReturnPhoto
                accessToken={token}
                productReturnId={record.id}
                photoId={photo.id}
                contentType={photo.contentType}
                onPress={() => setGalleryIndex(index)}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 220 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                  {photo.uploadedByFullName}
                </Text>
                {canChange ? (
                  <Pressable
                    accessibilityLabel="Şəkli sil"
                    disabled={Boolean(deletingPhoto)}
                    onPress={() => confirmDeletePhoto(photo.id)}
                    hitSlop={10}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : jobs.length === 0 ? (
        <Notice>Şəkil əlavə edilməyib.</Notice>
      ) : null}

      {galleryIndex !== null ? (
        <ReturnPhotoGallery
          photos={record.photos}
          returnId={record.id}
          index={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      ) : null}

      {!record.isDeleted && record.status === ReturnStatus.Pending ? (
        <>
          {uploading ? <Notice>Şəkillər göndərilir. Bitəndən sonra menecerə göndərmək olar.</Notice> : null}
          {failedPhotos > 0 ? (
            <Notice tone="error">{failedPhotos} şəkil göndərilməyib. Yenidən göndərin və ya silin; istəsəniz şəkilsiz də göndərə bilərsiniz.</Notice>
          ) : null}
          <Btn
            icon="paper-plane-outline"
            title="Menecerə göndər"
            onPress={() => confirmWorkflow('submit')}
            busy={working === 'submit'}
            disabled={uploading || Boolean(working)}
          />
        </>
      ) : null}
      {!record.isDeleted && record.status === ReturnStatus.Submitted ? (
        isManager ? (
          <Grid>
            <Btn
              icon="checkmark-done"
              variant="success"
              title="Sistemə işlənildi"
              onPress={() => confirmWorkflow('complete')}
              busy={working === 'complete'}
              disabled={Boolean(working)}
            />
            <Btn
              icon="close-circle-outline"
              variant="danger"
              title="Vazvradı ləğv et"
              onPress={() => confirmWorkflow('cancel')}
              busy={working === 'cancel'}
              disabled={Boolean(working)}
            />
          </Grid>
        ) : (
          <Notice>Menecer təsdiqini gözləyir.</Notice>
        )
      ) : null}

      {canChange ? (
        <Grid>
          <Btn icon="create-outline" variant="secondary" title="Düzəliş et" onPress={() => openEditor(false)} />
          <Btn icon="trash-outline" variant="danger" title="Qeydi sil" onPress={() => openEditor(true)} />
        </Grid>
      ) : null}

      {record.statusHistory.length > 0 ? (
        <>
          <SectionTitle>Tarixçə</SectionTitle>
          {record.statusHistory.map((entry) => (
            <Notice key={entry.id}>
              {formatDateTime(entry.changedAtUtc)} · {actorName(record, entry)}
              {entry.note ? `\n${entry.note}` : ''}
            </Notice>
          ))}
        </>
      ) : null}
    </AccountPageShell>
  );
}
