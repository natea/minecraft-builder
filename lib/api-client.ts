/**
 * API Client for Frontend-Only Mode
 *
 * Generic API client for proxying requests to backend services.
 */

import type { ApiError, ApiResponse } from "./types";

// ==========================================================================
// Configuration
// ==========================================================================

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";

// ==========================================================================
// Client Implementation
// ==========================================================================

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Make authenticated API request to backend
 */
export async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions & { token?: string } = {}
): Promise<ApiResponse<T>> {
  const { token, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${BACKEND_API_URL}${endpoint}`;

  try {
    const response = await fetchWithTimeout(url, {
      ...fetchOptions,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error: ApiError = {
        error: data?.error || "Request failed",
        message: data?.message || `HTTP ${response.status}`,
        details: data?.details,
        code: String(response.status),
      };

      return {
        error,
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    const apiError: ApiError = {
      error: "Network error",
      message: error instanceof Error ? error.message : "Unknown error",
    };

    return {
      error: apiError,
      status: 0,
    };
  }
}

/**
 * GET request
 */
export async function get<T>(
  endpoint: string,
  token?: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: "GET", token });
}

/**
 * POST request
 */
export async function post<T>(
  endpoint: string,
  body: unknown,
  token?: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

/**
 * PUT request
 */
export async function put<T>(
  endpoint: string,
  body: unknown,
  token?: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
    token,
  });
}

/**
 * PATCH request
 */
export async function patch<T>(
  endpoint: string,
  body: unknown,
  token?: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}

/**
 * DELETE request
 */
export async function del<T>(
  endpoint: string,
  token?: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: "DELETE", token });
}

// ==========================================================================
// Convenience Exports
// ==========================================================================

export const api = {
  get,
  post,
  put,
  patch,
  delete: del,
  request: apiRequest,
};

export default api;
