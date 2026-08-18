import {
    ApiProblemDetails,
    AuthSession,
    LoginRequest,
    RefreshTokenRequest,
} from '../auth/auth-types';

const API_TIMEOUT_MILLISECONDS = 20_000;

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const getApiBaseUrl = (): string => {
  if (!apiBaseUrl) {
    throw new ApiError(
      'API ünvanı konfiqurasiya edilməyib.',
    );
  }

  return apiBaseUrl;
};

const readErrorMessage = async (
  response: Response,
): Promise<string> => {
  try {
    const problem =
      (await response.json()) as ApiProblemDetails;

    return (
      problem.detail ??
      problem.title ??
      'Əməliyyat yerinə yetirilə bilmədi.'
    );
  } catch {
    return 'Əməliyyat yerinə yetirilə bilmədi.';
  }
};

const postJson = async <TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> => {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, API_TIMEOUT_MILLISECONDS);

  let response: Response;

  try {
    response = await fetch(
      `${getApiBaseUrl()}${path}`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new ApiError(
        'Server cavab vermədi. Yenidən yoxlayın.',
      );
    }

    throw new ApiError(
      'Serverlə əlaqə yaratmaq mümkün olmadı.',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const message =
      await readErrorMessage(response);

    throw new ApiError(
      message,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
};

export const authApi = {
  login: (
    request: LoginRequest,
  ): Promise<AuthSession> =>
    postJson<AuthSession>(
      '/api/auth/login',
      request,
    ),

  refreshToken: (
    request: RefreshTokenRequest,
  ): Promise<AuthSession> =>
    postJson<AuthSession>(
      '/api/auth/refresh-token',
      request,
    ),

  logout: (
    request: RefreshTokenRequest,
  ): Promise<void> =>
    postJson<void>(
      '/api/auth/logout',
      request,
    ),
};