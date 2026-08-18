import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';

import {
    OrderDetail,
    OrderPreparationPhoto,
} from '../features/orders/order-detail-types';

type ApiProblemDetails = {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

export type PreparationPhotoUpload = {
  uri: string;
  fileName: string;
  contentType: string;
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
    // JSON olmayan xəta cavabı aşağıda
    // standart xəta kimi göstəriləcək.
  }

  return new Error(
    `Server sorğunu icra etmədi. Kod: ${response.status}`,
  );
}

async function sendJsonRequest<T>(
  path: string,
  accessToken: string,
  method: 'GET' | 'POST',
): Promise<T> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 20000);

  try {
    const response = await fetch(
      `${getApiBaseUrl()}${path}`,
      {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw await getApiError(response);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'Server gec cavab verdi. Yenidən yoxlayın.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getOrderById(
  accessToken: string,
  orderId: string,
): Promise<OrderDetail> {
  return sendJsonRequest<OrderDetail>(
    `/api/Orders/${orderId}`,
    accessToken,
    'GET',
  );
}

export async function startOrderPreparation(
  accessToken: string,
  orderId: string,
): Promise<OrderDetail> {
  return sendJsonRequest<OrderDetail>(
    `/api/Orders/${orderId}/start-preparation`,
    accessToken,
    'POST',
  );
}

export async function completeOrderPreparation(
  accessToken: string,
  orderId: string,
): Promise<OrderDetail> {
  return sendJsonRequest<OrderDetail>(
    `/api/orders/${orderId}/preparation/complete`,
    accessToken,
    'POST',
  );
}

export async function uploadPreparationPhoto(
  accessToken: string,
  orderId: string,
  photo: PreparationPhotoUpload,
): Promise<OrderPreparationPhoto> {
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
        `/api/orders/${orderId}/preparation/photos`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
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
    ) as OrderPreparationPhoto;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'Şəklin göndərilməsi çox vaxt apardı. Yenidən yoxlayın.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function downloadPreparationPhoto(
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
        `/preparation/photos/${photoId}/file`,
      {
        method: 'GET',
        headers: {
          Accept: 'image/*',
          Authorization: `Bearer ${accessToken}`,
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
        'Şəklin açılması çox vaxt apardı.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}