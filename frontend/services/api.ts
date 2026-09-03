/* eslint-disable @typescript-eslint/no-explicit-any */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanBaseUrl = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${cleanBaseUrl}${cleanEndpoint}`;
    const headers = { ...this.getHeaders(), ...options.headers };
    const config = { ...options, headers };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Clear token on unauthorized and dispatch global auth event
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          window.dispatchEvent(new CustomEvent("unauthorized"));
        }
      }
      
      if (!response.ok) {
        let errMsg = "An error occurred";
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch {
          errMsg = await response.text();
        }
        throw new Error(errMsg);
      }
      
      // Handle empty responses or delete requests
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json() as T;
    } catch (error) {
      console.error(`API Request failed on ${endpoint}:`, error);
      throw error;
    }
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
}

export const api = new ApiClient();
export default api;
