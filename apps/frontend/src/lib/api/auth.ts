/**
 * Authentication API hooks.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  kvkk_data_processing_consent: boolean;
  kvkk_marketing_consent: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  tokens: {
    access_token: string;
    refresh_token: string;
  };
}

// Query keys
export const authKeys = {
  me: ['auth', 'me'] as const,
};

// Register
export function useRegister() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await apiClient.post<User>('/v1/auth/register', data);
      return response.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

// Login
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiClient.post<AuthResult>('/v1/auth/login', data);
      return response.data;
    },
    onSuccess: (result) => {
      // Store tokens
      localStorage.setItem('access_token', result.tokens.access_token);
      localStorage.setItem('refresh_token', result.tokens.refresh_token);
      
      // Update user cache
      queryClient.setQueryData(authKeys.me, result.user);
    },
  });
}

// Logout
export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      await apiClient.post('/v1/auth/logout', { refresh_token: refreshToken });
    },
    onSuccess: () => {
      // Clear tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Clear user cache
      queryClient.setQueryData(authKeys.me, null);
      queryClient.clear();
    },
  });
}

// Get current user
export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      
      const response = await apiClient.get<User>('/v1/auth/me');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
