import request, { ApiResponse } from '@/utils/request';

export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
  role: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  email: string;
}

export const login = (data: LoginPayload): Promise<ApiResponse<LoginResponse>> => {
  return request.post('/user/login', data);
};

export const register = (data: RegisterPayload): Promise<ApiResponse<null>> => {
  return request.post('/user/register', data);
};
