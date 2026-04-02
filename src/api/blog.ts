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
