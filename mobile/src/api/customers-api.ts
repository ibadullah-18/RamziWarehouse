import type {
    ApiProblemDetails,
} from '../auth/auth-types';
import type {
    CreateCustomerRequest,
    Customer,
    CustomerQuery,
    UpdateCustomerRequest,
} from '../features/customers/customer-types';

const timeoutMilliseconds = 30000;

function getApiBaseUrl(): string {
  const value =
    process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!value) {
    throw new Error(
      'EXPO_PUBLIC_API_URL təyin edilməyib.',
    );
  }

  return value.replace(/\/+$/, '');
}

async function createApiError(
  response: Response,
): Promise<Error> {
  try {
    const problem =
      (await response.json()) as ApiProblemDetails;

    const message =
      problem.detail?.trim() ||
      problem.title?.trim();

    if (message) {
      return new Error(message);
    }
  } catch {
    // Standart xəta aşağıda qaytarılır.
  }

  if (response.status === 401) {
    return new Error(
      'Sessiyanın vaxtı bitib. Yenidən daxil olun.',
    );
  }

  if (response.status === 403) {
    return new Error(
      'Bu əməliyyat üçün icazəniz yoxdur.',
    );
  }

  return new Error(
    `Server xətası baş verdi: ${response.status}`,
  );
}

async function sendRequest<T>(
  path: string,
  accessToken: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMilliseconds);

  try {
    const response = await fetch(
      `${getApiBaseUrl()}${path}`,
      {
        method,
        headers: {
          Accept: 'application/json',
          Authorization:
            `Bearer ${accessToken}`,
          ...(body !== undefined
            ? {
                'Content-Type':
                  'application/json',
              }
            : {}),
        },
        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,
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

function createCustomerQuery(
  query: CustomerQuery,
): string {
  const parameters = new URLSearchParams();

  if (query.search?.trim()) {
    parameters.set(
      'search',
      query.search.trim(),
    );
  }

  if (query.isActive !== undefined) {
    parameters.set(
      'isActive',
      String(query.isActive),
    );
  }

  const queryString = parameters.toString();

  return queryString
    ? `?${queryString}`
    : '';
}

export async function getCustomers(
  accessToken: string,
  query: CustomerQuery = {},
): Promise<readonly Customer[]> {
  return sendRequest<readonly Customer[]>(
    `/api/Customers${createCustomerQuery(query)}`,
    accessToken,
    'GET',
  );
}

export async function getCustomerById(
  accessToken: string,
  customerId: string,
): Promise<Customer> {
  return sendRequest<Customer>(
    `/api/Customers/${encodeURIComponent(
      customerId,
    )}`,
    accessToken,
    'GET',
  );
}

export async function createCustomer(
  accessToken: string,
  request: CreateCustomerRequest,
): Promise<Customer> {
  return sendRequest<Customer>(
    '/api/Customers',
    accessToken,
    'POST',
    request,
  );
}

export async function updateCustomer(
  accessToken: string,
  customerId: string,
  request: UpdateCustomerRequest,
): Promise<Customer> {
  return sendRequest<Customer>(
    `/api/Customers/${encodeURIComponent(
      customerId,
    )}`,
    accessToken,
    'PUT',
    request,
  );
}