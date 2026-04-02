import axios from 'axios';
import type { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// 定义接口返回格式，同后端 response.Response 一致
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

const request: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 如果有 token，在此处附加上 Authorization header
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data;
    
    // 如果代码为 0，视为成功
    if (res.code === 0) {
      return res as any; // 这里的泛型退化直接返回剥壳后的数据，或者根据组件内类型直接处理
    }
    
    // 其他错误统一抛出
    return Promise.reject(new Error(res.msg || 'Request Error'));
  },
  (error: AxiosError) => {
    const responseData = error.response?.data as Partial<ApiResponse> | undefined;

    // 判断是否 401 认证过期等
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // 可选：跳转登入页等 window.location.href = '/user/login';
    }

    const message = responseData?.msg || error.message || 'Request Error';
    return Promise.reject(new Error(message));
  }
);

export default request;
