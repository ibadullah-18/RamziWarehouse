export interface DashboardSummary {
  todayOrdersCount: number;
  waitingPreparationCount: number;
  readyForDeliveryCount: number;
  pendingReturnsCount: number;
  generatedAtUtc: string;
}

interface ApiProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
}

export class DashboardApiError extends Error {
  status?: number;

  constructor(
    message: string,
    status?: number,
  ) {
    super(message);

    this.name = 'DashboardApiError';
    this.status = status;
  }
}

function getApiBaseUrl() {
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_URL
      ?.trim()
      .replace(/\/+$/, '');

  if (!apiBaseUrl) {
    throw new DashboardApiError(
      'Mobil API ünvanı konfiqurasiya edilməyib.',
    );
  }

  return apiBaseUrl;
}

async function readProblemDetails(
  response: Response,
): Promise<ApiProblemDetails | null> {
  try {
    const responseText = await response.text();

    if (!responseText) {
      return null;
    }

    return JSON.parse(
      responseText,
    ) as ApiProblemDetails;
  } catch {
    return null;
  }
}

export async function getDashboardSummary(
  accessToken: string,
): Promise<DashboardSummary> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 20000);

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/api/dashboard/summary`,
      {
        method: 'GET',

        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },

        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const problem =
        await readProblemDetails(response);

      throw new DashboardApiError(
        problem?.detail ??
          problem?.title ??
          'Dashboard məlumatları alınmadı.',
        response.status,
      );
    }

    return await response.json() as DashboardSummary;
  } catch (error) {
    if (error instanceof DashboardApiError) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new DashboardApiError(
        'Server cavab vermək üçün çox gecikdi.',
      );
    }

    throw new DashboardApiError(
      'Backend ilə əlaqə yaratmaq mümkün olmadı.',
    );
  } finally {
    clearTimeout(timeoutId);
  }
}