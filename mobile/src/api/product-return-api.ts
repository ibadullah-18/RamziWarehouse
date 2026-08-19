import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';

import {
  CreateProductReturnRequest,
  ProductReturn,
  ProductReturnList,
  ProductReturnPhoto,
  ProductReturnQuery,
} from '../features/product-returns/product-return-types';

type ApiProblemDetails = {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: string;
  timeoutMilliseconds?: number;
};

export type ProductReturnPhotoUpload = {
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
    // JSON olmayan cavab üçün standart xəta işləyəcək.
  }

  return new Error(
    `Server sorğunu icra etmədi. Kod: ${response.status}`,
  );
}

async function authorizedRequest<T>(
  accessToken: string,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, options.timeoutMilliseconds ?? 20000);

  try {
    const response = await fetch(
      `${getApiBaseUrl()}${path}`,
      {
        method: options.method ?? 'GET',

        headers: {
          Accept: 'application/json',

          Authorization:
            `Bearer ${accessToken}`,

          ...(options.body
            ? {
                'Content-Type':
                  'application/json',
              }
            : {}),
        },

        body: options.body,
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw await getApiError(response);
    }

    if (response.status === 204) {
      return undefined as T;
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

export async function getProductReturns(
  accessToken: string,
  query: ProductReturnQuery = {},
): Promise<ProductReturnList> {
  const parameters = new URLSearchParams();

  if (query.search?.trim()) {
    parameters.set(
      'search',
      query.search.trim(),
    );
  }

  if (query.status) {
    parameters.set(
      'status',
      String(query.status),
    );
  }

  if (query.productType) {
    parameters.set(
      'productType',
      String(query.productType),
    );
  }

  parameters.set(
    'pageNumber',
    String(query.pageNumber ?? 1),
  );

  parameters.set(
    'pageSize',
    String(query.pageSize ?? 100),
  );

  return authorizedRequest<ProductReturnList>(
    accessToken,
    `/api/product-returns?${parameters.toString()}`,
  );
}

export async function getProductReturnById(
  accessToken: string,
  productReturnId: string,
): Promise<ProductReturn> {
  return authorizedRequest<ProductReturn>(
    accessToken,
    `/api/product-returns/${productReturnId}`,
  );
}

export async function createProductReturn(
  accessToken: string,
  request: CreateProductReturnRequest,
): Promise<ProductReturn> {
  return authorizedRequest<ProductReturn>(
    accessToken,
    '/api/product-returns',
    {
      method: 'POST',
      body: JSON.stringify(request),
      timeoutMilliseconds: 30000,
    },
  );
}

export async function uploadProductReturnPhoto(
  accessToken: string,
  productReturnId: string,
  photo: ProductReturnPhotoUpload,
): Promise<ProductReturnPhoto> {
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
        `/api/product-returns/${productReturnId}/photos`,
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
    ) as ProductReturnPhoto;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'Şəklin göndərilməsi çox vaxt apardı.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function downloadProductReturnPhoto(
  accessToken: string,
  productReturnId: string,
  photoId: string,
): Promise<Uint8Array> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 60000);

  try {
    const response = await fetch(
      `${getApiBaseUrl()}` +
        `/api/product-returns/${productReturnId}` +
        `/photos/${photoId}/file`,
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
        'Şəklin açılması çox vaxt apardı.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function deleteProductReturnPhoto(
  accessToken: string,
  productReturnId: string,
  photoId: string,
): Promise<void> {
  return authorizedRequest<void>(
    accessToken,
    `/api/product-returns/${productReturnId}` +
      `/photos/${photoId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function submitProductReturn(
  accessToken: string,
  productReturnId: string,
): Promise<ProductReturn> {
  return authorizedRequest<ProductReturn>(
    accessToken,
    `/api/product-returns/${productReturnId}/submit`,
    {
      method: 'POST',
    },
  );
}

export async function completeProductReturn(
  accessToken: string,
  productReturnId: string,
  note?: string,
): Promise<ProductReturn> {
  return authorizedRequest<ProductReturn>(
    accessToken,
    `/api/product-returns/${productReturnId}/complete`,
    {
      method: 'POST',

      body: JSON.stringify({
        note: note?.trim() || null,
      }),
    },
  );
}

export async function cancelProductReturn(
  accessToken: string,
  productReturnId: string,
  note?: string,
): Promise<ProductReturn> {
  return authorizedRequest<ProductReturn>(
    accessToken,
    `/api/product-returns/${productReturnId}/cancel`,
    {
      method: 'POST',

      body: JSON.stringify({
        note: note?.trim() || null,
      }),
    },
  );
}