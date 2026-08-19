import type {
  ApiProblemDetails,
} from '../auth/auth-types';
import type {
  AttendanceList,
  AttendanceQuery,
  AttendanceRecord,
} from '../features/attendance/attendance-types';

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

  return new Error(
    `Server xətası baş verdi: ${response.status}`,
  );
}

async function sendRequest<T>(
  path: string,
  accessToken: string,
  method: 'GET' | 'POST',
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
          Authorization: `Bearer ${accessToken}`,
        },
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

function createAttendanceQuery(
  query: AttendanceQuery,
): string {
  const parameters = new URLSearchParams();

  if (query.search?.trim()) {
    parameters.set('search', query.search.trim());
  }

  if (query.userId) {
    parameters.set('userId', query.userId);
  }

  if (query.fromDate) {
    parameters.set('fromDate', query.fromDate);
  }

  if (query.toDate) {
    parameters.set('toDate', query.toDate);
  }

  parameters.set(
    'pageNumber',
    String(query.pageNumber ?? 1),
  );

  parameters.set(
    'pageSize',
    String(query.pageSize ?? 100),
  );

  return parameters.toString();
}

export async function getAttendanceRecords(
  accessToken: string,
  query: AttendanceQuery = {},
): Promise<AttendanceList> {
  const queryString =
    createAttendanceQuery(query);

  return sendRequest<AttendanceList>(
    `/api/attendance?${queryString}`,
    accessToken,
    'GET',
  );
}

export async function getMyTodayAttendance(
  accessToken: string,
): Promise<AttendanceRecord | null> {
  return sendRequest<AttendanceRecord | null>(
    '/api/attendance/me/today',
    accessToken,
    'GET',
  );
}

export async function checkInAttendance(
  accessToken: string,
): Promise<AttendanceRecord> {
  return sendRequest<AttendanceRecord>(
    '/api/attendance/check-in',
    accessToken,
    'POST',
  );
}

export async function checkOutAttendance(
  accessToken: string,
): Promise<AttendanceRecord> {
  return sendRequest<AttendanceRecord>(
    '/api/attendance/check-out',
    accessToken,
    'POST',
  );
}