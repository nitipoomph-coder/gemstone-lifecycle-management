// src/services/authAPI.ts

const API_BASE = 'http://localhost:3001/api';

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
  }
};
