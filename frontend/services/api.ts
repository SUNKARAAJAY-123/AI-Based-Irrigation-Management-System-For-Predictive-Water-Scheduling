/* eslint-disable @typescript-eslint/no-explicit-any */

const FALLBACK_PRODUCTION_URL = "https://ai-based-irrigation-management-system.onrender.com";

/**
 * Dynamically resolves the active API Base URL.
 * Automatically overrides to production Render backend if running in a non-localhost browser environment
 * (e.g. Vercel deployments) even if the JS bundle was compiled with a localhost fallback.
 */
function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.endsWith(".local");

    // If running in browser on a production/Vercel domain but envUrl is missing or points to localhost
    if (!isLocalhost && (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
      return FALLBACK_PRODUCTION_URL;
    }
  }

  const activeUrl = envUrl || FALLBACK_PRODUCTION_URL;
  return activeUrl.endsWith("/") ? activeUrl.slice(0, -1) : activeUrl;
}

const MAX_RETRIES = 3;
const COLD_START_TIMEOUT_MS = 45000; // 45s timeout per attempt to accommodate Render container cold-start

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    // Attempt to load token from localStorage
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    
    return headers;
  }

  /**
   * Constructs a clean, absolute URL without duplicate or missing slashes.
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }

  /**
   * Primary request executor with cold-start retry handling for Render free tier.
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = this.buildUrl(endpoint);
    const headers = { ...this.getHeaders(), ...options.headers };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), COLD_START_TIMEOUT_MS);

      try {
        const config: RequestInit = {
          ...options,
          headers,
          signal: controller.signal,
        };

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        if (response.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            window.dispatchEvent(new CustomEvent("unauthorized"));
          }
        }

        // Retry on 502/503/504 server spin-up codes if retries remain
        if ([502, 503, 504].includes(response.status) && attempt < MAX_RETRIES) {
          this.notifyColdStart(attempt);
          await this.delay(attempt * 2500);
          continue;
        }

        if (!response.ok) {
          let errMsg = `Request failed with status ${response.status}`;
          try {
            const errData = await response.json();
            errMsg = errData.detail || errMsg;
          } catch {
            errMsg = await response.text();
          }
          throw new Error(errMsg);
        }

        if (response.status === 204) {
          return {} as T;
        }

        return (await response.json()) as T;
      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;

        // Check if error is network failure or timeout (likely Render cold-start spin-down)
        const isNetworkOrTimeout =
          error.name === "AbortError" ||
          error.name === "TypeError" ||
          error.message?.includes("Failed to fetch");

        if (isNetworkOrTimeout && attempt < MAX_RETRIES) {
          this.notifyColdStart(attempt);
          await this.delay(attempt * 2500);
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error(`API Request to ${endpoint} failed after ${MAX_RETRIES} attempts.`);
  }

  private notifyColdStart(attempt: number): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("server-waking", {
          detail: { attempt, message: "Backend server is spinning up. Retrying..." },
        })
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  patch<T>(endpoint: string, body: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  getBaseUrl(): string {
    return getApiBaseUrl();
  }

  async getBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
    const url = this.buildUrl(endpoint);
    const headers = { ...this.getHeaders(), ...options.headers };

    const response = await fetch(url, { ...options, headers, method: "GET" });
    if (!response.ok) {
      throw new Error(`Failed to fetch blob from ${endpoint}: ${response.statusText}`);
    }
    return await response.blob();
  }
}

export const api = new ApiClient();
export default api;
