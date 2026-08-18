import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';

import {
    DeliveryPhoto,
    DeliveryPhotoUpload,
    OrderDelivery,
} from '../features/orders/order-delivery-types';
import { OrderDetail } from '../features/orders/order-detail-types';

type ApiProblemDetails = {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

function getApiBaseUrl() {
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!apiBaseUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_URL təyin edilməyib.',
    );
  }

  return apiBaseUrl.replace(/\/+$/, '');
}

async function getApiError(
  response: Response,
): Promise<Error> {
  try {
    const problem =
      (await response.json()) as ApiProblemDetails;

    if (problem.detail) {
      return new Error(problem.detail);
    }

    if (problem.errors) {
      const firstMessage =
        Object.values(problem.errors)
          .flat()
          .find(Boolean);

      if (firstMessage) {
        return new Error(firstMessage);
      }
    }

    if (problem.title) {
      return new Error(problem.title);
    }
  } catch {
    // JSON olmayan xəta cavabı aşağıdakı
    // standart xəta ilə göstəriləcək.
  }

  return new Error(
    `Server sorğunu icra etmədi. Kod: ${response.status}`,
  );
}

export async function getOrderDelivery(
  accessToken: string,
  orderId: string,
): Promise<OrderDelivery | null> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 20000);

  try {
    const response = await fetch(
      `${getApiBaseUrl()}` +
        `/api/orders/${orderId}/delivery`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization:
            `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw await getApiError(response);
    }

    return (
      await response.json()
    ) as OrderDelivery;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'Təhvil məlumatları gecikdi. Yenidən yoxlayın.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function uploadDeliveryPhoto(
  accessToken: string,
  orderId: string,
  photo: DeliveryPhotoUpload,
): Promise<DeliveryPhoto> {
  const localFile = new File(photo.uri);

  if (!localFile.exists) {
    throw new Error(
      'Çəkilmiş şəkil telefonun yaddaşında tapılmadı.',
    );
  }

  if (localFile.size <= 0) {
    throw new Error(
      'Çəkilmiş şəkil boş fayldır.',
    );
  }

  if (localFile.size > 10 * 1024 * 1024) {
    throw new Error(
      'Şəklin ölçüsü maksimum 10 MB ola bilər.',
    );
  }

  const formData = new FormData();

  formData.append(
    'file',
    localFile,
    photo.fileName,
  );

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 60000);

  try {
    const response = await fetch(
      `${getApiBaseUrl()}` +
        `/api/orders/${orderId}` +
        '/delivery/photos',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization:
            `Bearer ${accessToken}`,
        },
        body: formData,
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw await getApiError(response);
    }

    return (
      await response.json()
    ) as DeliveryPhoto;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'Təhvil şəklinin göndərilməsi çox vaxt apardı.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function completeOrderDelivery(
  accessToken: string,
  orderId: string,
  note: string,
): Promise<OrderDetail> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    const normalizedNote = note.trim();

    const response = await fetch(
      `${getApiBaseUrl()}` +
        `/api/orders/${orderId}` +
        '/delivery/complete',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization:
            `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          note:
            normalizedNote.length > 0
              ? normalizedNote
              : null,
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw await getApiError(response);
    }

    return (
      await response.json()
    ) as OrderDetail;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'Təhvilin tamamlanması çox vaxt apardı.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function downloadDeliveryPhoto(
  accessToken: string,
  orderId: string,
  photoId: string,
): Promise<Uint8Array> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 60000);

  try {
    const response = await fetch(
      `${getApiBaseUrl()}` +
        `/api/orders/${orderId}` +
        `/delivery/photos/${photoId}/file`,
      {
        method: 'GET',
        headers: {
          Accept: 'image/*',
          Authorization:
            `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw await getApiError(response);
    }

    return await response.bytes();
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'Təhvil şəklinin açılması çox vaxt apardı.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}