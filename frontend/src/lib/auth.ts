const ACCESS_TOKEN_KEY = "curasync-access-token";
export const REFRESH_TOKEN_KEY = "curasync-refresh-token";
const USER_NAME_KEY = "health-companion-user-name";

export const getApiBaseUrl = (): string => {
  const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const base = envBase || "http://localhost:8000/api";
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

export const getAccessToken = (): string | null => {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const isAuthenticated = (): boolean => Boolean(getAccessToken());

export const saveAuthSession = (accessToken: string, refreshToken: string, userName?: string): void => {
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (userName?.trim()) {
      window.localStorage.setItem(USER_NAME_KEY, userName.trim());
    }
  } catch {
    // Ignore storage errors in private modes.
  }
};

export const clearAuthSession = (): void => {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_NAME_KEY);
  } catch {
    // Ignore storage errors in private modes.
  }
};