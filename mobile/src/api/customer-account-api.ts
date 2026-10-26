import { Platform } from "react-native";

import { ApiProblemDetails } from "../auth/auth-types";
import {
  AccountDay,
  AdjustDebtRequest,
  AccountHistoryMonth,
  CustomerAccountDetails,
  CustomerAccountList,
  CustomerAccountQuery,
  CustomerMonth,
  DailyDebtItem,
  SettlementRequest,
} from "../features/customer-accounts/customer-account-types";
import { authenticatedFetch } from "./authenticated-fetch";

type AccountApiProblemDetails = ApiProblemDetails & {
  errors?: Record<string, string[]>;
};

type AccountApiRequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
};

export type AccountApiError = Error & { statusCode: number };

const requestTimeoutMilliseconds = 30000;

function getApiBaseUrl(): string {
  const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!configuredApiUrl) {
    throw new Error("EXPO_PUBLIC_API_URL təyin edilməyib.");
  }

  const normalizedApiUrl = configuredApiUrl.replace(/\/+$/, "");

  if (Platform.OS === "web") {
    return normalizedApiUrl.replace("://10.0.2.2", "://localhost");
  }

  return normalizedApiUrl;
}

async function createApiError(response: Response): Promise<Error> {
  try {
    const problem = (await response.json()) as AccountApiProblemDetails;

    if (problem.detail?.trim()) {
      return new Error(problem.detail.trim());
    }

    if (problem.errors) {
      const firstMessage = Object.values(problem.errors).flat().find(Boolean);

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
    return new Error("Sessiyanın vaxtı bitib. Yenidən daxil olun.");
  }

  if (response.status === 403) {
    return new Error("Bu açot əməliyyatı üçün icazəniz yoxdur.");
  }

  return new Error(`Server sorğunu icra etmədi. Kod: ${response.status}`);
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
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await authenticatedFetch(`${getApiBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw Object.assign(await createApiError(response), {
        statusCode: response.status,
      });
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Server gec cavab verdi. Yenidən yoxlayın.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** One açot day: the roster with old/daily debt, payments and the totals. */
export function getAccountDay(accessToken: string, date: string) {
  return sendAccountRequest<AccountDay>(
    `/api/customer-accounts/day?date=${encodeURIComponent(date)}`,
    accessToken,
  );
}

export function startAccountDay(accessToken: string) {
  return sendAccountRequest<AccountDay>(
    "/api/customer-accounts/day/start",
    accessToken,
    { method: "POST" },
  );
}

export function closeAccountDay(accessToken: string) {
  return sendAccountRequest<AccountDay>(
    "/api/customer-accounts/day/close",
    accessToken,
    { method: "POST" },
  );
}

/** Saves today's daily debts; only the differences are posted. */
export function saveDailyDebts(accessToken: string, items: DailyDebtItem[]) {
  return sendAccountRequest<AccountDay>(
    "/api/customer-accounts/day/debts",
    accessToken,
    { method: "PUT", body: { items } },
  );
}

export function completeSettlement(
  accessToken: string,
  request: SettlementRequest,
) {
  return sendAccountRequest<CustomerAccountDetails>(
    "/api/customer-accounts/settlements",
    accessToken,
    { method: "POST", body: request },
  );
}

export function getCustomerAccounts(
  accessToken: string,
  query: CustomerAccountQuery = {},
) {
  const parameters = new URLSearchParams();
  const normalizedSearch = query.search?.trim();

  if (normalizedSearch) parameters.set("search", normalizedSearch);
  if (query.date) parameters.set("date", query.date);
  parameters.set("pageNumber", String(query.pageNumber ?? 1));
  parameters.set("pageSize", String(query.pageSize ?? 100));

  return sendAccountRequest<CustomerAccountList>(
    `/api/customer-accounts?${parameters.toString()}`,
    accessToken,
  );
}

/** Loads every page of the account customers (Sədərək shops and anyone with a balance). */
export async function getAllCustomerAccounts(
  accessToken: string,
  search?: string,
) {
  const items: CustomerAccountList["items"] = [];
  let page = 1;
  let total = 0;
  do {
    const result = await getCustomerAccounts(accessToken, {
      search,
      pageNumber: page++,
      pageSize: 100,
    });
    items.push(...result.items);
    total = result.totalCount;
    if (result.items.length === 0) break;
  } while (items.length < total);
  return items;
}

export function getCustomerAccountDetails(
  accessToken: string,
  customerId: string,
) {
  return sendAccountRequest<CustomerAccountDetails>(
    `/api/customer-accounts/${encodeURIComponent(customerId)}`,
    accessToken,
  );
}

export function getAccountHistory(accessToken: string, month: string) {
  return sendAccountRequest<AccountHistoryMonth>(
    `/api/customer-accounts/history?month=${encodeURIComponent(month)}`,
    accessToken,
  );
}

export function getCustomerMonth(
  accessToken: string,
  customerId: string,
  month: string,
) {
  return sendAccountRequest<CustomerMonth>(
    `/api/customer-accounts/${encodeURIComponent(customerId)}/month?month=${encodeURIComponent(month)}`,
    accessToken,
  );
}

/** Sədərək customer page: add to or set the old debt or today's daily debt. */
export function adjustDebt(accessToken: string, body: AdjustDebtRequest) {
  return sendAccountRequest<CustomerAccountDetails>(
    "/api/customer-accounts/adjust",
    accessToken,
    { method: "POST", body },
  );
}

export function correctPreviousDebt(
  accessToken: string,
  body: { customerId: string; correctedPreviousDebt: number; reason: string },
) {
  return sendAccountRequest<CustomerAccountDetails>(
    "/api/customer-accounts/previous-debt",
    accessToken,
    { method: "PUT", body },
  );
}

export function correctDailyDebt(
  accessToken: string,
  body: { customerId: string; amount: number; reason: string; date?: string },
) {
  return sendAccountRequest<CustomerAccountDetails>(
    "/api/customer-accounts/daily-debt",
    accessToken,
    { method: "PUT", body },
  );
}

export function correctAccountPayment(
  accessToken: string,
  body: {
    customerId: string;
    entryId: string;
    expectedAmount: number;
    expectedPaymentMethod: string | null;
    amount: number;
    paymentMethod: "cash" | "card";
    reason: string;
  },
) {
  return sendAccountRequest<CustomerAccountDetails>(
    "/api/customer-accounts/payments",
    accessToken,
    { method: "PUT", body },
  );
}
