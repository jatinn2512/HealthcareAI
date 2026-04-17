import { getAccessToken, getApiBaseUrl, saveAuthSession, clearAuthSession, REFRESH_TOKEN_KEY } from './auth';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface ApiErrorResponse {
  detail?: string | { msg?: string }[] | unknown;
  message?: string;
}

export interface UserProfileData {
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg?: number | null;
  activity_level: string | null;
  eyesight_left?: string | null;
  eyesight_right?: string | null;
  disability_status?: string | null;
  chronic_conditions?: string | null;
  allergies?: string | null;
  smoking_status?: string | null;
  alcohol_intake?: string | null;
  medical_notes?: string | null;
}

export interface CurrentUserData {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  gender: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  profile?: UserProfileData | null;
}

export class ApiClient {
  private baseUrl: string;
  private static isRefreshing = false;
  private static refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.baseUrl = getApiBaseUrl();
  }

  private static onRefreshed(token: string): void {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private static subscribeToRefresh(callback: (token: string) => void): void {
    this.refreshSubscribers.push(callback);
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleTokenRefresh(): Promise<string | null> {
    if (ApiClient.isRefreshing) {
      return new Promise((resolve) => {
        ApiClient.subscribeToRefresh((token) => resolve(token));
      });
    }

    ApiClient.isRefreshing = true;

    try {
      const refreshToken = this.getStoredRefreshToken();
      if (!refreshToken) {
        clearAuthSession();
        return null;
      }

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        clearAuthSession();
        return null;
      }

      const data = (await response.json()) as { access_token: string; refresh_token: string };
      saveAuthSession(data.access_token, data.refresh_token);
      ApiClient.onRefreshed(data.access_token);
      return data.access_token;
    } catch {
      clearAuthSession();
      return null;
    } finally {
      ApiClient.isRefreshing = false;
    }
  }

  private getStoredRefreshToken(): string | null {
    try {
      return window.localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private parseErrorMessage(payload: unknown, fallback: string): string {
    if (typeof payload === 'object' && payload && 'detail' in payload) {
      const detail = (payload as { detail?: unknown }).detail;

      if (typeof detail === 'string') {
        return detail.trim() || fallback;
      }

      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        if (typeof first === 'object' && first && 'msg' in first) {
          const msg = (first as { msg?: unknown }).msg;
          if (typeof msg === 'string') {
            return msg.trim() || fallback;
          }
        }
      }
    }

    if (typeof payload === 'object' && payload && 'message' in payload) {
      const msg = (payload as { message?: unknown }).message;
      if (typeof msg === 'string') {
        return msg.trim() || fallback;
      }
    }

    return fallback;
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit & { retryOnUnauth?: boolean }
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const { retryOnUnauth = true, ...fetchOptions } = options || {};

    const headers = {
      ...this.getAuthHeaders(),
      ...(fetchOptions.headers as Record<string, string>),
    };

    try {
      let response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 with token refresh
      if (response.status === 401 && retryOnUnauth) {
        const newToken = await this.handleTokenRefresh();
        if (newToken) {
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${newToken}`,
          };

          response = await fetch(url, {
            ...fetchOptions,
            headers: retryHeaders,
          });
        } else {
          clearAuthSession();
          window.location.href = '/';
          return { status: 401, error: 'Session expired. Please login again.' };
        }
      }

      let data: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        const errorMessage = this.parseErrorMessage(
          data,
          `API Error: ${response.statusText || 'Unknown error'}`
        );
        return {
          status: response.status,
          error: errorMessage,
        };
      }

      return {
        data: data as T,
        status: response.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return {
        status: 0,
        error: errorMessage,
      };
    }
  }

  // Auth endpoints
  async register(payload: {
    full_name: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<CurrentUserData>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      retryOnUnauth: false,
    });
  }

  async login(payload: { email: string; password: string }): Promise<
    ApiResponse<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>
  > {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      retryOnUnauth: false,
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const refreshToken = this.getStoredRefreshToken();
    if (!refreshToken) {
      return { status: 200, data: { message: 'Logged out' } };
    }

    return this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async getCurrentUser(): Promise<
    ApiResponse<CurrentUserData>
  > {
    return this.request('/auth/me', { method: 'GET' });
  }

  async updateProfile(payload: {
    full_name?: string;
    phone?: string;
    age?: number;
    gender?: string;
    height_cm?: number;
    weight_kg?: number;
    activity_level?: string;
    eyesight_left?: string;
    eyesight_right?: string;
    disability_status?: string;
    chronic_conditions?: string;
    allergies?: string;
    smoking_status?: string;
    alcohol_intake?: string;
    medical_notes?: string;
  }): Promise<
    ApiResponse<CurrentUserData>
  > {
    return this.request('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // Plans endpoints
  async listPlans(): Promise<
    ApiResponse<
      Array<{
        code: string;
        name: string;
        monthly_price_inr: number;
        yearly_price_inr: number;
        description: string;
        is_active: boolean;
        features: Array<{ feature_key: string; feature_label: string }>;
      }>
    >
  > {
    return this.request('/plans', { method: 'GET' });
  }

  async getMySubscription(): Promise<
    ApiResponse<{
      plan_code: string;
      plan_name: string;
      billing_cycle: string;
      status: string;
      started_at: string;
      ends_at: string | null;
    }>
  > {
    return this.request('/plans/me', { method: 'GET' });
  }

  async subscribeToPlan(payload: {
    plan_code: string;
    billing_cycle: 'monthly' | 'yearly';
  }): Promise<
    ApiResponse<{
      plan_code: string;
      plan_name: string;
      billing_cycle: string;
      status: string;
      started_at: string;
      ends_at: string | null;
    }>
  > {
    return this.request('/plans/me', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Generic GET for extensibility
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'GET' });
  }

  // Generic POST for extensibility
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // Generic PATCH for extensibility
  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
