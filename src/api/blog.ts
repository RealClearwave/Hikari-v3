import request, { ApiResponse } from '@/utils/request';

export interface BlogItem {
  id: number;
  user_id: number;
  title: string;
  content: string;
  views: number;
  type: number;
  problem_id: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface BlogListResponse {
  list: BlogItem[];
  total: number;
}

export interface CreateBlogPayload {
  title: string;
  content: string;
  tags?: string[];
  problem_id?: number;
  captcha_id: string;
  captcha_answer: string;
}

export interface UpdateBlogPayload {
  title: string;
  content: string;
  tags?: string[];
  problem_id?: number;
}

export interface CreateBlogResponse {
  id: number;
}

export const getBlogList = (
  page: number,
  size: number,
  type?: number,
  problemId?: number,
): Promise<ApiResponse<BlogListResponse>> => {
  return request.get('/blog/list', {
    params: { page, size, type, problem_id: problemId },
  });
};

export const createBlog = (payload: CreateBlogPayload): Promise<ApiResponse<CreateBlogResponse>> => {
  return request.post('/blog', payload);
};

export interface BlogDetail extends BlogItem {
  username: string;
  avatar: string;
  role: number;
  badge: string;
  accepted_count: number;
}

export const getBlogDetail = (id: number): Promise<ApiResponse<BlogDetail>> => {
  return request.get(`/blog/${id}`);
};

export const deleteBlog = (id: number): Promise<ApiResponse<{ ok: boolean }>> => {
  return request.delete(`/blog/${id}`);
};

export const updateBlog = (id: number, payload: UpdateBlogPayload): Promise<ApiResponse<{ ok: boolean }>> => {
  return request.put(`/blog/${id}`, payload);
};

export interface BlogReplyItem {
  id: number;
  article_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  username: string;
  avatar: string;
  role: number;
  badge: string;
  accepted_count: number;
}

export interface BlogReplyListResponse {
  list: BlogReplyItem[];
}

export interface CreateBlogReplyPayload {
  content: string;
  captcha_id: string;
  captcha_answer: string;
}

export interface CreateBlogReplyResponse {
  id: number;
}

export const getBlogReplyList = (id: number): Promise<ApiResponse<BlogReplyListResponse>> => {
  return request.get(`/blog/${id}/reply`);
};

export const createBlogReply = (
  id: number,
  payload: CreateBlogReplyPayload,
): Promise<ApiResponse<CreateBlogReplyResponse>> => {
  return request.post(`/blog/${id}/reply`, payload);
};

export const deleteBlogReply = (
  id: number,
  replyId: number,
): Promise<ApiResponse<{ ok: boolean }>> => {
  return request.delete(`/blog/${id}/reply/${replyId}`);
};
