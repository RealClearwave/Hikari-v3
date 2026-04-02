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

export interface UpdateProfilePayload {
  username: string;
  email: string;
  avatar: string;
}

export const getMyProfile = (): Promise<ApiResponse<User>> => {
  return request.get('/user/profile');
};

export const updateMyProfile = (payload: UpdateProfilePayload): Promise<ApiResponse<User>> => {
  return request.put('/user/profile', payload);
};

export type UserDetail = User;

export const getUserDetail = (id: number): Promise<ApiResponse<UserDetail>> => {
  return request.get(`/user/${id}`);
};

export interface UserRankRow {
  userId: number;
  username: string;
  avatar: string;
  rating: number;
  accepted: number;
  submissions: number;
}

export interface UserListResponse {
  list: UserRankRow[];
  total: number;
}

export const getUserList = (
  page: number,
  size: number,
): Promise<ApiResponse<UserListResponse>> => {
  return request.get('/user/list', {
    params: { page, size },
  });
};
