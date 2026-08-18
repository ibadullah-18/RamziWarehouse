import { Ionicons } from '@expo/vector-icons';
import {
    File,
    Paths,
} from 'expo-file-system';
import {
    useEffect,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    downloadDeliveryPhoto,
} from '../api/order-delivery-api';
import {
    downloadPreparationPhoto,
} from '../api/order-detail-api';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../theme';

type OrderPhotoType =
  | 'preparation'
  | 'delivery';

type AuthenticatedOrderPhotoProps = {
  accessToken: string;
  orderId: string;
  photoId: string;
  contentType: string;
  photoType?: OrderPhotoType;
};

function getFileExtension(
  contentType: string,
) {
  const normalizedType =
    contentType.toLowerCase();

  if (normalizedType.includes('png')) {
    return 'png';
  }

  if (normalizedType.includes('webp')) {
    return 'webp';
  }

  if (
    normalizedType.includes('heic') ||
    normalizedType.includes('heif')
  ) {
    return 'heic';
  }

  return 'jpg';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Şəkli açmaq mümkün olmadı.';
}

export function AuthenticatedOrderPhoto({
  accessToken,
  orderId,
  photoId,
  contentType,
  photoType = 'preparation',
}: AuthenticatedOrderPhotoProps) {
  const [imageUri, setImageUri] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [retryNumber, setRetryNumber] =
    useState(0);

  useEffect(() => {
    let isActive = true;
    let downloadedFile: File | null = null;

    const currentAccessToken =
      accessToken;

    const currentOrderId =
      orderId;

    const currentPhotoId =
      photoId;

    const currentPhotoType =
      photoType;

    const extension =
      getFileExtension(contentType);

    async function loadPhoto() {
      try {
        const photoBytes =
          currentPhotoType === 'delivery'
            ? await downloadDeliveryPhoto(
                currentAccessToken,
                currentOrderId,
                currentPhotoId,
              )
            : await downloadPreparationPhoto(
                currentAccessToken,
                currentOrderId,
                currentPhotoId,
              );

        if (!isActive) {
          return;
        }

        const localFile = new File(
          Paths.cache,
          `ramzi-${currentPhotoType}` +
            `-${currentPhotoId}.${extension}`,
        );

        if (localFile.exists) {
          localFile.delete();
        }

        localFile.write(photoBytes);

        downloadedFile = localFile;

        if (isActive) {
          setImageUri(localFile.uri);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            getErrorMessage(error),
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadPhoto();

    return () => {
      isActive = false;

      try {
        if (
          downloadedFile &&
          downloadedFile.exists
        ) {
          downloadedFile.delete();
        }
      } catch {
        // Müvəqqəti fayl artıq silinibsə
        // əlavə əməliyyat lazım deyil.
      }
    };
  }, [
    accessToken,
    contentType,
    orderId,
    photoId,
    photoType,
    retryNumber,
  ]);

  function retry() {
    setImageUri(null);
    setErrorMessage(null);
    setIsLoading(true);

    setRetryNumber(
      currentValue =>
        currentValue + 1,
    );
  }

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator
          size="small"
          color={colors.primary}
        />

        <Text style={styles.stateText}>
          Şəkil açılır...
        </Text>
      </View>
    );
  }

  if (errorMessage || !imageUri) {
    return (
      <View style={styles.stateContainer}>
        <Ionicons
          name="image-outline"
          size={28}
          color={colors.textLight}
        />

        <Text
          style={styles.errorText}
          numberOfLines={2}
        >
          {errorMessage ??
            'Şəkil açılmadı.'}
        </Text>

        <Pressable
          onPress={retry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="refresh"
            size={15}
            color={colors.primary}
          />

          <Text style={styles.retryText}>
            Yenidən yoxla
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Image
      source={{
        uri: imageUri,
      }}
      style={styles.image}
      resizeMode="cover"
      accessibilityLabel="Sübut şəkli"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: 210,
    height: 155,
    backgroundColor:
      colors.surfaceSecondary,
  },

  stateContainer: {
    width: 210,
    height: 155,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor:
      colors.surfaceSecondary,
  },

  stateText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },

  errorText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.sm,
  },

  retryText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.65,
  },
});