import request, { ApiResponse } from '@/utils/request';

export interface BlogItem {
  id: number;
  user_id: number;
  title: string;
  content: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface BlogListResponse {
  list: BlogItem[];
  total: number;
}

export const getBlogList = (
  page: number,
  size: number,
): Promise<ApiResponse<BlogListResponse>> => {
  return request.get('/blog/list', {
    params: { page, size },
  });
};

export interface BlogDetail extends BlogItem {
  username: string;
  avatar: string;
}

export const getBlogDetail = (id: number): Promise<ApiResponse<BlogDetail>> => {
  return request.get(`/blog/${id}`);
};
