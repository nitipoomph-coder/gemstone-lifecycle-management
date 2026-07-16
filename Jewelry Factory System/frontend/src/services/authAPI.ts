// src/services/authAPI.ts
import { API_BASE_URL } from '../config/api';

const API_BASE = API_BASE_URL;

export const authAPI = {
  login: async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (data.success && data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Connection to server failed' };
    }
  },
  verifyAdmin: async (password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/verify-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      return await response.json();
    } catch (error) {
      console.error('Verify Admin error:', error);
      return { success: false, message: 'Connection to server failed' };
    }
  }
};
