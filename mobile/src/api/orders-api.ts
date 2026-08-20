import {
  OrderListItem,
  OrderQuery,
  PagedResult,
} from '../features/orders/order-types';

interface ApiProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
}

export class OrdersApiError extends Error {
  status?: number;

  constructor(
    message: string,
    status?: number,
  ) {
    super(message);

    this.name = 'OrdersApiError';
    this.status = status;
  }
}

function getApiBaseUrl() {
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_URL
      ?.trim()
      .replace(/\/+$/, '');

  if (!apiBaseUrl) {
    throw new OrdersApiError(
      'Mobil API ünvanı konfiqurasiya edilməyib.',
    );
  }

  return apiBaseUrl;
}

function createQueryString(
  query: OrderQuery,
): string {
  const parameters =
    new URLSearchParams();

  const normalizedSearch =
    query.search?.trim();

  if (normalizedSearch) {
    parameters.set(
      'search',
      normalizedSearch,
    );
  }

  if (
    query.status !== null &&
    query.status !== undefined
  ) {
    parameters.set(
      'status',
      query.status.toString(),
    );
  }

  if (query.fromDate) {
    parameters.set(
      'fromDate',
      query.fromDate,
    );
  }

  if (query.toDate) {
    parameters.set(
      'toDate',
      query.toDate,
    );
  }

  parameters.set(
    'pageNumber',
    (query.pageNumber ?? 1).toString(),
  );

  parameters.set(
    'pageSize',
    (query.pageSize ?? 20).toString(),
  );

  return parameters.toString();
}

async function readProblemDetails(
  response: Response,
): Promise<ApiProblemDetails | null> {
  try {
    const responseText =
      await response.text();

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

export async function getOrders(
  accessToken: string,
  query: OrderQuery,
): Promise<PagedResult<OrderListItem>> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 20000);

  try {
    const queryString =
      createQueryString(query);

    const response = await fetch(
      `${getApiBaseUrl()}/api/Orders?${queryString}`,
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

      throw new OrdersApiError(
        problem?.detail ??
          problem?.title ??
          'Qaimələr alınmadı.',
        response.status,
      );
    }

    return await response.json() as PagedResult<OrderListItem>;
  } catch (error) {
    if (error instanceof OrdersApiError) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new OrdersApiError(
        'Server cavab vermək üçün çox gecikdi.',
      );
    }

    throw new OrdersApiError(
      'Backend ilə əlaqə yaratmaq mümkün olmadı.',
    );
  } finally {
    clearTimeout(timeoutId);
  }
}