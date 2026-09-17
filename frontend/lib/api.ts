// API helpers


import { useAuthStore } from '../store/useAuthStore';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  
  // --- LOCAL DEV ONLY: Bypassing strict token check & redirect ---
  // if (!token) {
  //   // Force wipe the frontend state just to be completely sure.
  //   localStorage.removeItem('civicresponse-auth');
  //   localStorage.removeItem('sb-yryjzyyxytyzqzpqyxyz-auth-token'); 
  //   window.location.href = '/login';
  //   throw new Error("FRONTEND_NO_SESSION: Redirecting to login...");
  // }
  const authToken = token || 'dev-bypass-token';

  let headers = {
    ...options.headers,
    'Authorization': `Bearer ${authToken}`,
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

  // --- LOCAL DEV ONLY: Commented out 401 redirect to login ---
  // if (response.status === 401) {
  //   useAuthStore.getState().logout();
  //   localStorage.removeItem('civicresponse-auth');
  //   localStorage.removeItem('sb-yryjzyyxytyzqzpqyxyz-auth-token');
  //   if (window.location.pathname !== '/login') {
  //     window.location.href = '/login';
  //   }
  // }

  return response;
}
