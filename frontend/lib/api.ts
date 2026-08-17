const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  code?: string;
  requestId?: string;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setAuthCookies(accessToken: string, refreshToken?: string, role?: string) {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 7;
  document.cookie = `auth_token=${encodeURIComponent(accessToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  if (refreshToken) {
    document.cookie = `refresh_token=${encodeURIComponent(refreshToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
  if (role) {
    document.cookie = `auth_role=${encodeURIComponent(role)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

export function clearAuthCookies() {
  if (typeof document === 'undefined') return;
  document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'refresh_token=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'auth_role=; path=/; max-age=0; SameSite=Lax';
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  let token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || getCookie('auth_token') : null;

  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new Error(err.message || 'Network connection error');
  }

  // Handle 401 Unauthorized with automatic refresh token flow
  if (response.status === 401 && typeof window !== 'undefined' && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/register')) {
    const storedRefreshToken = localStorage.getItem('refresh_token') || getCookie('refresh_token');

    if (storedRefreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          });

          const refreshData = await refreshRes.json();

          if (refreshRes.ok && refreshData.success && refreshData.data?.accessToken) {
            const newAccessToken = refreshData.data.accessToken;
            const newRefreshToken = refreshData.data.refreshToken || storedRefreshToken;
            const user = refreshData.data.user;

            localStorage.setItem('auth_token', newAccessToken);
            localStorage.setItem('refresh_token', newRefreshToken);
            if (user) {
              localStorage.setItem('auth_user', JSON.stringify(user));
              setAuthCookies(newAccessToken, newRefreshToken, user.role);
            }

            isRefreshing = false;
            onRefreshed(newAccessToken);

            // Retry the original request with new token
            headers['Authorization'] = `Bearer ${newAccessToken}`;
            response = await fetch(url, { ...options, headers });
          } else {
            throw new Error('Refresh failed');
          }
        } catch {
          isRefreshing = false;
          refreshSubscribers = [];
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_user');
          clearAuthCookies();
        }
      } else {
        // Wait for token refresh to complete
        const retryOriginalRequest = new Promise<ApiResponse<T>>((resolve, reject) => {
          addRefreshSubscriber(async (newToken: string) => {
            try {
              headers['Authorization'] = `Bearer ${newToken}`;
              const retryRes = await fetch(url, { ...options, headers });
              const retryData = await retryRes.json();
              resolve(retryData);
            } catch (e) {
              reject(e);
            }
          });
        });
        return retryOriginalRequest;
      }
    } else {
      // No refresh token available, clean up stale access token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      clearAuthCookies();
    }
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(`HTTP Error ${response.status}`);
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}
