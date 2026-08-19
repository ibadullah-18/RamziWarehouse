import { ApiProblemDetails } from '../auth/auth-types';
import {
    ChangeUserPasswordRequest,
    CreateUserRequest,
    UpdateUserRequest,
    WarehouseUser,
} from '../features/users/user-types';

const requestTimeoutMilliseconds = 30000;

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
    // Response JSON formatında deyilsə,
    // aşağıdakı standart xəta qaytarılacaq.
  }

  if (response.status === 401) {
    return new Error(
      'Sessiyanın vaxtı bitib. Yenidən daxil olun.',
    );
  }

  if (response.status === 403) {
    return new Error(
      'Bu əməliyyatı etmək üçün Admin icazəsi lazımdır.',
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
  }, requestTimeoutMilliseconds);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(
      `${getApiBaseUrl()}${path}`,
      {
        method,
        headers,
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw await createApiError(response);
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

export async function getUsers(
  accessToken: string,
  search?: string,
): Promise<WarehouseUser[]> {
  const normalizedSearch = search?.trim();

  const query = normalizedSearch
    ? `?search=${encodeURIComponent(
        normalizedSearch,
      )}`
    : '';

  return sendRequest<WarehouseUser[]>(
    `/api/users${query}`,
    accessToken,
    'GET',
  );
}

export async function getUserById(
  accessToken: string,
  userId: string,
): Promise<WarehouseUser> {
  return sendRequest<WarehouseUser>(
    `/api/users/${userId}`,
    accessToken,
    'GET',
  );
}

export async function createUser(
  accessToken: string,
  request: CreateUserRequest,
): Promise<WarehouseUser> {
  return sendRequest<WarehouseUser>(
    '/api/users',
    accessToken,
    'POST',
    request,
  );
}

export async function updateUser(
  accessToken: string,
  userId: string,
  request: UpdateUserRequest,
): Promise<WarehouseUser> {
  return sendRequest<WarehouseUser>(
    `/api/users/${userId}`,
    accessToken,
    'PUT',
    request,
  );
}

export async function changeUserPassword(
  accessToken: string,
  userId: string,
  request: ChangeUserPasswordRequest,
): Promise<void> {
  await sendRequest<void>(
    `/api/users/${userId}/password`,
    accessToken,
    'PUT',
    request,
  );
}