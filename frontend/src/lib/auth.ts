const ACCESS_TOKEN_KEY = "curasync-access-token";
export const REFRESH_TOKEN_KEY = "curasync-refresh-token";
const HOSPITAL_ACCESS_TOKEN_KEY = "curasync-hospital-access-token";
export const HOSPITAL_REFRESH_TOKEN_KEY = "curasync-hospital-refresh-token";
const USER_NAME_KEY = "health-companion-user-name";

export const getApiBaseUrl = (): string => {
  const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const base = envBase || "http://localhost:8000/api";
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

export const isHospitalAuthPath = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/hospital");
};

const accessKeyForPath = (): string => (isHospitalAuthPath() ? HOSPITAL_ACCESS_TOKEN_KEY : ACCESS_TOKEN_KEY);

const refreshKeyForPath = (): string => (isHospitalAuthPath() ? HOSPITAL_REFRESH_TOKEN_KEY : REFRESH_TOKEN_KEY);

export const getAccessToken = (): string | null => {
  try {
    return window.localStorage.getItem(accessKeyForPath());
  } catch {
    return null;
  }
};

export const getRefreshToken = (): string | null => {
  try {
    return window.localStorage.getItem(refreshKeyForPath());
  } catch {
    return null;
  }
};

export const isAuthenticated = (): boolean => Boolean(getAccessToken());

export const saveAuthSession = (accessToken: string, refreshToken: string, userName?: string): void => {
  try {
    const accessKey = accessKeyForPath();
    const refreshKey = refreshKeyForPath();
    window.localStorage.setItem(accessKey, accessToken);
    window.localStorage.setItem(refreshKey, refreshToken);
    if (userName?.trim()) {
      window.localStorage.setItem(USER_NAME_KEY, userName.trim());
    }
  } catch {
    // Ignore storage errors in private modes.
  }
};

export const clearAuthSession = (): void => {
  try {
    window.localStorage.removeItem(accessKeyForPath());
    window.localStorage.removeItem(refreshKeyForPath());
    window.localStorage.removeItem(USER_NAME_KEY);
  } catch {
    // Ignore storage errors in private modes.
  }
};

/** Clears both patient and hospital tokens (e.g. full reset tooling). */
export const clearAllAuthPortals = (): void => {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(HOSPITAL_ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(HOSPITAL_REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_NAME_KEY);
  } catch {
    // Ignore storage errors in private modes.
  }
};
