// API helpers


import { useAuthStore } from '../store/useAuthStore';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  
  if (!token) {
    // Force wipe the frontend state just to be completely sure.
    localStorage.removeItem('civicresponse-auth');
    localStorage.removeItem('sb-yryjzyyxytyzqzpqyxyz-auth-token'); 
    window.location.href = '/login';
    throw new Error("FRONTEND_NO_SESSION: Redirecting to login...");
  }

  let headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } as Record<string, string>;

  // Let browser set content type automatically for FormData (file uploads)
  if (options.body instanceof FormData) {
    const newHeaders = { ...headers } as Record<string, string>;
    delete newHeaders['Content-Type'];
    headers = newHeaders;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  return response;
}
