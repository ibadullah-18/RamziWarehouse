import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    completeOrderPreparation,
    startOrderPreparation,
    uploadPreparationPhoto,
} from '../api/order-detail-api';
import { useAuth } from '../auth/auth-context';
import { OrderDetail } from '../features/orders/order-detail-types';
import { OrderStatus } from '../features/orders/order-types';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../theme';

type WorkingAction =
  | 'start'
  | 'photo'
  | 'complete'
  | null;

type OrderWorkflowActionsProps = {
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

export function OrderWorkflowActions({
  order,
  accessToken,
  onOrderChanged,
}: OrderWorkflowActionsProps) {
  const { session } = useAuth();

  const [workingAction, setWorkingAction] =
    useState<WorkingAction>(null);

  const isWorking =
    workingAction !== null;

  const isCurrentWorker =
    order.preparedByUserId === session?.userId;

  async function handleStartPreparation() {
    if (isWorking) {
      return;
    }

    setWorkingAction('start');

    try {
      const updatedOrder =
        await startOrderPreparation(
          accessToken,
          order.id,
        );

      onOrderChanged(updatedOrder);

      Alert.alert(
        'Hazırlama başladı',
        'Bu qaimə sizin adınıza bağlandı.',
      );
    } catch (error) {
      Alert.alert(
        'Əməliyyat alınmadı',
        getErrorMessage(
          error,
          'Sifarişin hazırlanması başladılmadı.',
        ),
      );
    } finally {
      setWorkingAction(null);
    }
  }

  async function handleTakePhoto() {
    if (isWorking) {
      return;
    }

    const permission =
      await ImagePicker
        .requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Kamera icazəsi lazımdır',
        'Sübut şəklini çəkmək üçün Ram Collection tətbiqinə kamera icazəsi verin.',
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
      asset.fileSize > 10 * 1024 * 1024
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
    await uploadPreparationPhoto(
      accessToken,
      order.id,
      {
        uri: asset.uri,

        fileName:
          asset.fileName ??
          `order-${order.orderNumber}-${Date.now()}.jpg`,

        contentType:
          asset.mimeType ??
          'image/jpeg',
      },
    );

  const updatedOrder: OrderDetail = {
    ...order,

    preparationPhotos: [
      ...order.preparationPhotos,
      uploadedPhoto,
    ],
  };

  onOrderChanged(updatedOrder);

  Alert.alert(
    'Şəkil əlavə edildi',
    'Sübut şəkli uğurla yadda saxlanıldı.',
  );
} catch (error) {
      Alert.alert(
        'Şəkil göndərilmədi',
        getErrorMessage(
          error,
          'Sübut şəklini göndərmək mümkün olmadı.',
        ),
      );
    } finally {
      setWorkingAction(null);
    }
  }

  async function completePreparation() {
    if (isWorking) {
      return;
    }

    setWorkingAction('complete');

    try {
      const updatedOrder =
        await completeOrderPreparation(
          accessToken,
          order.id,
        );

      onOrderChanged(updatedOrder);

      Alert.alert(
        'Sifariş hazırdır',
        'Sifariş uğurla təhvil mərhələsinə keçirildi.',
      );
    } catch (error) {
      Alert.alert(
        'Tamamlamaq mümkün olmadı',
        getErrorMessage(
          error,
          'Sifarişin hazırlanması tamamlanmadı.',
        ),
      );
    } finally {
      setWorkingAction(null);
    }
  }

  function handleCompletePress() {
    if (
      order.preparationPhotos.length === 0
    ) {
      Alert.alert(
        'Sübut şəkli yoxdur',
        'Sifarişi tamamlamaq üçün əvvəlcə ən azı bir şəkil çəkin.',
      );

      return;
    }

    Alert.alert(
      'Hazırlama tamamlansın?',
      'Yoxlayın ki, bütün məhsullar düzgün kod, partiya və say ilə yığılıb.',
      [
        {
          text: 'Xeyr',
          style: 'cancel',
        },
        {
          text: 'Bəli, tamamla',
          onPress: () => {
            void completePreparation();
          },
        },
      ],
    );
  }

  if (order.status === OrderStatus.Created) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons
              name="cube-outline"
              size={21}
              color={colors.primary}
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Sifariş gözləyir
            </Text>

            <Text style={styles.description}>
              Məhsulları yığmağa başlayanda
              aşağıdakı düyməni basın.
            </Text>
          </View>
        </View>

        <Pressable
          disabled={isWorking}
          onPress={() => {
            void handleStartPreparation();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            isWorking && styles.disabled,
          ]}
        >
          {workingAction === 'start' ? (
            <ActivityIndicator
              size="small"
              color={colors.white}
            />
          ) : (
            <Ionicons
              name="play"
              size={19}
              color={colors.white}
            />
          )}

          <Text style={styles.primaryButtonText}>
            Hazırlamağa başla
          </Text>
        </Pressable>
      </View>
    );
  }

  if (
    order.status !==
    OrderStatus.InPreparation
  ) {
    return null;
  }

  if (!isCurrentWorker) {
    return (
      <View style={styles.informationCard}>
        <Ionicons
          name="person-circle-outline"
          size={25}
          color={colors.warning}
        />

        <View style={styles.informationText}>
          <Text style={styles.informationTitle}>
            Sifariş hazırlanır
          </Text>

          <Text
            style={styles.informationDescription}
          >
            Bu sifarişi{' '}
            {order.preparedByFullName ??
              'başqa bir işçi'}{' '}
            hazırlayır.
          </Text>
        </View>
      </View>
    );
  }

  const photoLimitReached =
    order.preparationPhotos.length >= 10;

  const hasPhoto =
    order.preparationPhotos.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons
            name="construct-outline"
            size={21}
            color={colors.primary}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Hazırlama sizdədir
          </Text>

          <Text style={styles.description}>
            Məhsulları yoxlayın, sübut
            şəklini çəkin və tamamlayın.
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
          {order.preparationPhotos.length}/10
          sübut şəkli
        </Text>
      </View>

      <Pressable
        disabled={
          isWorking ||
          photoLimitReached
        }
        onPress={() => {
          void handleTakePhoto();
        }}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
          (isWorking ||
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
            : 'Kamera ilə sübut şəkli çək'}
        </Text>
      </Pressable>

      <Pressable
        disabled={
          isWorking || !hasPhoto
        }
        onPress={handleCompletePress}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
          (isWorking || !hasPhoto) &&
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
            name="checkmark-circle"
            size={20}
            color={colors.white}
          />
        )}

        <Text style={styles.primaryButtonText}>
          Hazırlamanı tamamla
        </Text>
      </Pressable>

      {!hasPhoto ? (
        <Text style={styles.hint}>
          Tamamlamaq üçün ən azı bir
          sübut şəkli lazımdır.
        </Text>
      ) : null}
    </View>
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

  iconBox: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  headerText: {
    flex: 1,
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
    marginTop: spacing.lg,
  },

  secondaryButtonText: {
    color: colors.primary,
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

  informationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },

  informationText: {
    flex: 1,
  },

  informationTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  informationDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
});