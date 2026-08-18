import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
    useEffect,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import {
    completeOrderDelivery,
    getOrderDelivery,
    uploadDeliveryPhoto,
} from '../api/order-delivery-api';
import { useAuth } from '../auth/auth-context';
import { OrderDelivery } from '../features/orders/order-delivery-types';
import { OrderDetail } from '../features/orders/order-detail-types';
import { OrderStatus } from '../features/orders/order-types';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../theme';
import {
    AuthenticatedOrderPhoto,
} from './authenticated-order-photo';

type WorkingAction =
  | 'photo'
  | 'complete'
  | null;

type OrderDeliveryActionsProps = {
  order: OrderDetail;
  accessToken: string;
  onOrderChanged: (
    updatedOrder: OrderDetail,
  ) => void;
};

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderDeliveryActions({
  order,
  accessToken,
  onOrderChanged,
}: OrderDeliveryActionsProps) {
  const { session } = useAuth();

  const [delivery, setDelivery] =
    useState<OrderDelivery | null>(null);

  const [note, setNote] =
    useState('');

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [workingAction, setWorkingAction] =
    useState<WorkingAction>(null);

  const shouldShow =
    order.status ===
      OrderStatus.ReadyForDelivery ||
    order.status ===
      OrderStatus.Delivered;

  useEffect(() => {
    if (!shouldShow) {
      return;
    }

    let isActive = true;

    const currentOrderId = order.id;
    const currentAccessToken = accessToken;

    async function loadDelivery() {
      try {
        const result =
          await getOrderDelivery(
            currentAccessToken,
            currentOrderId,
          );

        if (isActive) {
          setDelivery(result);
          setNote(result?.note ?? '');
          setLoadError(null);
        }
      } catch (error) {
        if (isActive) {
          setLoadError(
            getErrorMessage(
              error,
              'Təhvil məlumatları alınmadı.',
            ),
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadDelivery();

    return () => {
      isActive = false;
    };
  }, [
    accessToken,
    order.id,
    order.status,
    shouldShow,
  ]);

  async function reloadDelivery() {
    setIsLoading(true);

    try {
      const result =
        await getOrderDelivery(
          accessToken,
          order.id,
        );

      setDelivery(result);
      setNote(result?.note ?? '');
      setLoadError(null);
    } catch (error) {
      setLoadError(
        getErrorMessage(
          error,
          'Təhvil məlumatları alınmadı.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function takeDeliveryPhoto() {
    if (workingAction) {
      return;
    }

    const permission =
      await ImagePicker
        .requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Kamera icazəsi lazımdır',
        'Təhvil sübut şəklini çəkmək üçün kamera icazəsi verin.',
      );

      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType:
          ImagePicker.CameraType.back,
        allowsEditing: false,
        quality: 0.75,
      });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      Alert.alert(
        'Şəkil tapılmadı',
        'Kamera nəticəsində şəkil alınmadı.',
      );

      return;
    }

    if (
      asset.fileSize &&
      asset.fileSize >
        10 * 1024 * 1024
    ) {
      Alert.alert(
        'Şəkil çox böyükdür',
        'Şəklin ölçüsü maksimum 10 MB ola bilər.',
      );

      return;
    }

    setWorkingAction('photo');

    try {
      const uploadedPhoto =
        await uploadDeliveryPhoto(
          accessToken,
          order.id,
          {
            uri: asset.uri,

            fileName:
              asset.fileName ??
              `delivery-${order.orderNumber}` +
                `-${Date.now()}.jpg`,

            contentType:
              asset.mimeType ??
              'image/jpeg',
          },
        );

      setDelivery(currentDelivery => {
        if (currentDelivery) {
          return {
            ...currentDelivery,

            photos: [
              ...currentDelivery.photos,
              uploadedPhoto,
            ],
          };
        }

        return {
          id: '',
          orderId: order.id,

          deliveredByUserId:
            session?.userId ?? '',

          deliveredByFullName:
            session?.fullName ??
            'İstifadəçi',

          startedAtUtc:
            new Date().toISOString(),

          deliveredAtUtc: null,
          note: null,
          photos: [uploadedPhoto],
        };
      });

      setLoadError(null);

      Alert.alert(
        'Şəkil əlavə edildi',
        'Təhvil sübut şəkli uğurla yadda saxlanıldı.',
      );
    } catch (error) {
      Alert.alert(
        'Şəkil göndərilmədi',
        getErrorMessage(
          error,
          'Təhvil şəklini göndərmək mümkün olmadı.',
        ),
      );
    } finally {
      setWorkingAction(null);
    }
  }

  async function completeDelivery() {
    if (
      workingAction ||
      !delivery ||
      delivery.photos.length === 0
    ) {
      return;
    }

    setWorkingAction('complete');

    try {
      const updatedOrder =
        await completeOrderDelivery(
          accessToken,
          order.id,
          note,
        );

      onOrderChanged(updatedOrder);

      const updatedDelivery =
        await getOrderDelivery(
          accessToken,
          order.id,
        );

      setDelivery(updatedDelivery);

      if (updatedDelivery) {
        setNote(
          updatedDelivery.note ?? '',
        );
      }

      Alert.alert(
        'Təhvil tamamlandı',
        'Sifariş uğurla müştəriyə təhvil verildi.',
      );
    } catch (error) {
      Alert.alert(
        'Təhvil tamamlanmadı',
        getErrorMessage(
          error,
          'Təhvili tamamlamaq mümkün olmadı.',
        ),
      );
    } finally {
      setWorkingAction(null);
    }
  }

  function confirmCompleteDelivery() {
    if (!delivery?.photos.length) {
      Alert.alert(
        'Sübut şəkli yoxdur',
        'Təhvili tamamlamaq üçün ən azı bir mağaza şəkli çəkin.',
      );

      return;
    }

    Alert.alert(
      'Təhvil tamamlansın?',
      'Məhsulların düzgün mağazaya verildiyini və şəklin aydın olduğunu yoxlayın.',
      [
        {
          text: 'Xeyr',
          style: 'cancel',
        },
        {
          text: 'Bəli, təhvil verildi',
          onPress: () => {
            void completeDelivery();
          },
        },
      ],
    );
  }

  if (!shouldShow) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingRow}>
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            Təhvil məlumatları yoxlanılır...
          </Text>
        </View>
      </View>
    );
  }

  if (loadError && !delivery) {
    return (
      <View style={styles.errorCard}>
        <Ionicons
          name="cloud-offline-outline"
          size={25}
          color={colors.danger}
        />

        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>
            Təhvil məlumatları açılmadı
          </Text>

          <Text style={styles.errorDescription}>
            {loadError}
          </Text>

          <Pressable
            onPress={() => {
              void reloadDelivery();
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>
              Yenidən yoxla
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isDelivered =
    order.status ===
      OrderStatus.Delivered ||
    delivery?.deliveredAtUtc != null;

  const isDeliveryOwner =
    !delivery ||
    delivery.deliveredByUserId ===
      session?.userId;

  const photoCount =
    delivery?.photos.length ?? 0;

  if (isDelivered) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.successIconBox}>
            <Ionicons
              name="checkmark-circle"
              size={23}
              color={colors.success}
            />
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.title}>
              Sifariş təhvil verilib
            </Text>

            <Text style={styles.description}>
              Təhvil prosesi uğurla
              tamamlanıb.
            </Text>
          </View>
        </View>

        {delivery ? (
          <>
            <View style={styles.informationBox}>
              <View style={styles.informationRow}>
                <Text style={styles.informationLabel}>
                  Təhvil verən
                </Text>

                <Text style={styles.informationValue}>
                  {delivery.deliveredByFullName}
                </Text>
              </View>

              <View style={styles.informationRow}>
                <Text style={styles.informationLabel}>
                  Təhvil vaxtı
                </Text>

                <Text style={styles.informationValue}>
                  {formatDateTime(
                    delivery.deliveredAtUtc,
                  )}
                </Text>
              </View>

              <View
                style={[
                  styles.informationRow,
                  styles.informationRowLast,
                ]}
              >
                <Text style={styles.informationLabel}>
                  Sübut şəkli
                </Text>

                <Text style={styles.informationValue}>
                  {photoCount} ədəd
                </Text>
              </View>
            </View>

            {delivery.note ? (
              <View style={styles.savedNote}>
                <Text style={styles.savedNoteLabel}>
                  Təhvil qeydi
                </Text>

                <Text style={styles.savedNoteText}>
                  {delivery.note}
                </Text>
              </View>
            ) : null}

            {photoCount > 0 ? (
              <DeliveryPhotoList
                orderId={order.id}
                accessToken={accessToken}
                delivery={delivery}
              />
            ) : null}
          </>
        ) : null}
      </View>
    );
  }

  if (!isDeliveryOwner) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.warningIconBox}>
            <Ionicons
              name="car-outline"
              size={22}
              color={colors.warning}
            />
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.title}>
              Təhvil prosesi başlayıb
            </Text>

            <Text style={styles.description}>
              Bu sifarişi{' '}
              {delivery?.deliveredByFullName ??
                'başqa istifadəçi'}{' '}
              təhvil verir.
            </Text>
          </View>
        </View>

        {delivery && photoCount > 0 ? (
          <DeliveryPhotoList
            orderId={order.id}
            accessToken={accessToken}
            delivery={delivery}
          />
        ) : null}
      </View>
    );
  }

  const photoLimitReached =
    photoCount >= 10;

  const hasPhoto =
    photoCount > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.deliveryIconBox}>
          <Ionicons
            name="car-sport-outline"
            size={22}
            color={colors.primary}
          />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title}>
            Mağazaya təhvil
          </Text>

          <Text style={styles.description}>
            Məhsulu mağazaya verdikdən
            sonra şəklini çəkin.
          </Text>
        </View>
      </View>

      <View style={styles.photoCounter}>
        <Ionicons
          name="images-outline"
          size={18}
          color={colors.primary}
        />

        <Text style={styles.photoCounterText}>
          {photoCount}/10 təhvil şəkli
        </Text>
      </View>

      {delivery && photoCount > 0 ? (
        <DeliveryPhotoList
          orderId={order.id}
          accessToken={accessToken}
          delivery={delivery}
        />
      ) : null}

      <Pressable
        disabled={
          workingAction !== null ||
          photoLimitReached
        }
        onPress={() => {
          void takeDeliveryPhoto();
        }}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
          (workingAction !== null ||
            photoLimitReached) &&
            styles.disabled,
        ]}
      >
        {workingAction === 'photo' ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />
        ) : (
          <Ionicons
            name="camera"
            size={20}
            color={colors.primary}
          />
        )}

        <Text style={styles.secondaryButtonText}>
          {photoLimitReached
            ? 'Şəkil limiti dolub'
            : 'Mağazada sübut şəkli çək'}
        </Text>
      </Pressable>

      <View style={styles.noteContainer}>
        <Text style={styles.noteLabel}>
          Əlavə qeyd
        </Text>

        <TextInput
          value={note}
          onChangeText={setNote}
          editable={workingAction === null}
          maxLength={1000}
          multiline
          textAlignVertical="top"
          placeholder="Məsələn: məhsullar mağaza sahibinə təhvil verildi..."
          placeholderTextColor={
            colors.textLight
          }
          style={styles.noteInput}
        />

        <Text style={styles.characterCount}>
          {note.length}/1000
        </Text>
      </View>

      <Pressable
        disabled={
          workingAction !== null ||
          !hasPhoto
        }
        onPress={confirmCompleteDelivery}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
          (workingAction !== null ||
            !hasPhoto) &&
            styles.disabled,
        ]}
      >
        {workingAction === 'complete' ? (
          <ActivityIndicator
            size="small"
            color={colors.white}
          />
        ) : (
          <Ionicons
            name="checkmark-done"
            size={20}
            color={colors.white}
          />
        )}

        <Text style={styles.primaryButtonText}>
          Təhvil verildi
        </Text>
      </Pressable>

      {!hasPhoto ? (
        <Text style={styles.hint}>
          Təhvili tamamlamaq üçün ən
          azı bir mağaza şəkli lazımdır.
        </Text>
      ) : null}
    </View>
  );
}

type DeliveryPhotoListProps = {
  orderId: string;
  accessToken: string;
  delivery: OrderDelivery;
};

function DeliveryPhotoList({
  orderId,
  accessToken,
  delivery,
}: DeliveryPhotoListProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={
        styles.photoList
      }
    >
      {delivery.photos.map(photo => (
        <View
          key={photo.id}
          style={styles.photoCard}
        >
          <AuthenticatedOrderPhoto
            accessToken={accessToken}
            orderId={orderId}
            photoId={photo.id}
            contentType={photo.contentType}
            photoType="delivery"
          />

          <View style={styles.photoInformation}>
            <Text
              style={styles.photoUser}
              numberOfLines={1}
            >
              {photo.uploadedByFullName}
            </Text>

            <Text style={styles.photoDate}>
              {formatDateTime(
                photo.uploadedAtUtc,
              )}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  headerContent: {
    flex: 1,
  },

  deliveryIconBox: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  successIconBox: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },

  warningIconBox: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },

  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  description: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  errorDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },

  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
  },

  retryButtonText: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  photoCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.lg,
  },

  photoCounterText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  photoList: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },

  photoCard: {
    width: 210,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor:
      colors.surfaceSecondary,
  },

  photoInformation: {
    padding: spacing.md,
  },

  photoUser: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  photoDate: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },

  informationBox: {
    marginTop: spacing.lg,
    borderRadius: radius.md,
    backgroundColor:
      colors.surfaceSecondary,
  },

  informationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  informationRowLast: {
    borderBottomWidth: 0,
  },

  informationLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  informationValue: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'right',
  },

  savedNote: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor:
      colors.primarySoft,
    marginTop: spacing.lg,
  },

  savedNoteLabel: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },

  savedNoteText: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },

  secondaryButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
  },

  secondaryButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  noteContainer: {
    marginTop: spacing.lg,
  },

  noteLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  noteInput: {
    minHeight: 96,
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor:
      colors.surfaceSecondary,
  },

  characterCount: {
    color: colors.textLight,
    fontSize: fontSize.xs,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  primaryButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
  },

  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  pressed: {
    opacity: 0.7,
  },

  disabled: {
    opacity: 0.45,
  },
});