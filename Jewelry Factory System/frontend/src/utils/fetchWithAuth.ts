// src/utils/fetchWithAuth.ts

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token is missing, invalid, or expired
    console.error('[fetchWithAuth] Unauthorized! Redirecting to login...');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
  }

  return response;
};
