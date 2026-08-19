import { fetch } from 'expo/fetch';

import {
  CreateOrderRequest,
  CreateOrderResult,
  Customer,
  ProductSuggestion,
  Warehouse,
} from '../features/orders/create-order-types';

type ApiProblemDetails = {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

type ApiRequestOptions = {
  method?: 'GET' | 'POST';
  body?: string;
  timeoutMilliseconds?: number;
};

export type CreateCustomerRequest = {
  name: string;
  phoneNumber: string | null;
  note: string | null;
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

export async function getActiveCustomers(
  accessToken: string,
  search?: string,
): Promise<Customer[]> {
  const parameters = new URLSearchParams();

  parameters.set('isActive', 'true');

  const normalizedSearch = search?.trim();

  if (normalizedSearch) {
    parameters.set(
      'search',
      normalizedSearch,
    );
  }

  return authorizedRequest<Customer[]>(
    accessToken,
    `/api/Customers?${parameters.toString()}`,
  );
}

export async function createCustomer(
  accessToken: string,
  request: CreateCustomerRequest,
): Promise<Customer> {
  return authorizedRequest<Customer>(
    accessToken,
    '/api/Customers',
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  );
}

export async function getActiveWarehouses(
  accessToken: string,
): Promise<Warehouse[]> {
  const warehouses =
    await authorizedRequest<Warehouse[]>(
      accessToken,
      '/api/Warehouses',
    );

  return warehouses.filter(
    warehouse => warehouse.isActive,
  );
}

export async function getProductSuggestions(
  accessToken: string,
  search?: string,
  take = 10,
): Promise<ProductSuggestion[]> {
  const parameters = new URLSearchParams();

  parameters.set(
    'take',
    String(Math.min(Math.max(take, 1), 20)),
  );

  const normalizedSearch = search?.trim();

  if (normalizedSearch) {
    parameters.set(
      'search',
      normalizedSearch,
    );
  }

  return authorizedRequest<ProductSuggestion[]>(
    accessToken,
    '/api/Orders/product-suggestions' +
      `?${parameters.toString()}`,
  );
}

export async function createOrder(
  accessToken: string,
  request: CreateOrderRequest,
): Promise<CreateOrderResult> {
  return authorizedRequest<CreateOrderResult>(
    accessToken,
    '/api/Orders',
    {
      method: 'POST',
      body: JSON.stringify(request),
      timeoutMilliseconds: 30000,
    },
  );
}