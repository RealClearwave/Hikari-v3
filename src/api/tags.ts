import request, { ApiResponse } from '@/utils/request';

export interface Tag {
  id: number;
  name: string;
  color: string;
  problem_count?: number;
  created_at: string;
}

export const getTags = (): Promise<ApiResponse<{ list: Tag[] }>> => {
  return request.get('/tags');
};

export const adminGetTags = (): Promise<ApiResponse<{ list: Tag[] }>> => {
  return request.get('/admin/tags');
};

export const adminCreateTag = (name: string, color: string): Promise<ApiResponse<{ id: number }>> => {
  return request.post('/admin/tags', { name, color });
};

export const adminUpdateTag = (id: number, name?: string, color?: string): Promise<ApiResponse<null>> => {
  return request.put('/admin/tags', { id, name, color });
};

export const adminDeleteTag = (id: number): Promise<ApiResponse<null>> => {
  return request.delete(`/admin/tags?id=${id}`);
};
