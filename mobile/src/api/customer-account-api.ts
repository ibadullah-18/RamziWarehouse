import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';

import { ApiProblemDetails } from '../auth/auth-types';
import {
  CorrectPreviousDebtRequest,
  CreateCustomerAccountRequest,
  CustomerAccountDetails,
  CustomerAccountList,
  CustomerAccountQuery,
  RecordCustomerPaymentRequest,
} from '../features/customer-accounts/customer-account-types';

type AccountApiProblemDetails =
  ApiProblemDetails & {
    errors?: Record<string, string[]>;
  };

type AccountApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
};

const requestTimeoutMilliseconds = 30000;

function getApiBaseUrl(): string {
  const configuredApiUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!configuredApiUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_URL təyin edilməyib.',
    );
  }

  const normalizedApiUrl =
    configuredApiUrl.replace(/\/+$/, '');

  if (Platform.OS === 'web') {
    return normalizedApiUrl.replace(
      '://10.0.2.2',
      '://localhost',
    );
  }

  return normalizedApiUrl;
}

async function createApiError(
  response: Response,
): Promise<Error> {
  try {
    const problem =
      (await response.json()) as
        AccountApiProblemDetails;

    if (problem.detail?.trim()) {
      return new Error(problem.detail.trim());
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

    if (problem.title?.trim()) {
      return new Error(problem.title.trim());
    }
  } catch {
    // JSON olmayan cavab üçün standart xəta göstərilir.
  }

  if (response.status === 401) {
    return new Error(
      'Sessiyanın vaxtı bitib. Yenidən daxil olun.',
    );
  }

  if (response.status === 403) {
    return new Error(
      'Bu açot əməliyyatı üçün icazəniz yoxdur.',
    );
  }

  return new Error(
    `Server sorğunu icra etmədi. Kod: ${response.status}`,
  );
}

async function sendAccountRequest<T>(
  path: string,
  accessToken: string,
  options: AccountApiRequestOptions = {},
): Promise<T> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, requestTimeoutMilliseconds);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    if (options.body !== undefined) {
      headers['Content-Type'] =
        'application/json';
    }

    const response = await fetch(
      `${getApiBaseUrl()}${path}`,
      {
        method: options.method ?? 'GET',
        headers,
        body:
          options.body === undefined
            ? undefined
            : JSON.stringify(options.body),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw await createApiError(response);
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

export async function getCustomerAccounts(
  accessToken: string,
  query: CustomerAccountQuery = {},
): Promise<CustomerAccountList> {
  const parameters = new URLSearchParams();

  const normalizedSearch =
    query.search?.trim();

  if (normalizedSearch) {
    parameters.set(
      'search',
      normalizedSearch,
    );
  }

  if (query.date) {
    parameters.set(
      'date',
      query.date,
    );
  }

  parameters.set(
    'pageNumber',
    String(query.pageNumber ?? 1),
  );

  parameters.set(
    'pageSize',
    String(query.pageSize ?? 30),
  );

  return sendAccountRequest<CustomerAccountList>(
    `/api/customer-accounts?${parameters.toString()}`,
    accessToken,
  );
}

export async function getCustomerAccountDetails(
  accessToken: string,
  customerId: string,
): Promise<CustomerAccountDetails> {
  return sendAccountRequest<CustomerAccountDetails>(
    `/api/customer-accounts/${encodeURIComponent(
      customerId,
    )}`,
    accessToken,
  );
}

export async function createCustomerAccount(
  accessToken: string,
  request: CreateCustomerAccountRequest,
): Promise<CustomerAccountDetails> {
  return sendAccountRequest<CustomerAccountDetails>(
    '/api/customer-accounts',
    accessToken,
    {
      method: 'POST',
      body: request,
    },
  );
}

export async function recordCustomerPayment(
  accessToken: string,
  request: RecordCustomerPaymentRequest,
): Promise<CustomerAccountDetails> {
  return sendAccountRequest<CustomerAccountDetails>(
    '/api/customer-accounts/payments',
    accessToken,
    {
      method: 'POST',
      body: request,
    },
  );
}

export async function correctPreviousDebt(
  accessToken: string,
  request: CorrectPreviousDebtRequest,
): Promise<CustomerAccountDetails> {
  return sendAccountRequest<CustomerAccountDetails>(
    '/api/customer-accounts/previous-debt',
    accessToken,
    {
      method: 'PUT',
      body: request,
    },
  );
}