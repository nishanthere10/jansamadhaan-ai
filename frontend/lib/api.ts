// API helpers
import { useAuthStore } from '../store/useAuthStore';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  if (!token) {
    useAuthStore.getState().logout();
    throw new Error('FRONTEND_NO_SESSION: Please sign in.');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body instanceof FormData) {
    headers.delete('Content-Type');
  } else if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    useAuthStore.getState().logout();
  }
  return response;
}
