import { fetch } from 'expo/fetch';

import type {
    OrderReceipt,
} from '../features/orders/order-receipt-types';

type ApiProblemDetails = {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

function getApiBaseUrl(): string {
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
    // Standart xəta mesajı aşağıda veriləcək.
  }

  return new Error(
    `Server sorğunu icra etmədi. Kod: ${response.status}`,
  );
}

export async function getOrderReceipt(
  accessToken: string,
  orderId: string,
): Promise<OrderReceipt> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    const response = await fetch(
      `${getApiBaseUrl()}` +
        `/api/orders/${orderId}/receipt-data`,
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

    if (!response.ok) {
      throw await getApiError(response);
    }

    return (await response.json()) as OrderReceipt;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'Qaimə məlumatının alınması çox vaxt apardı.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}