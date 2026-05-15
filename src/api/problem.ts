import request, { ApiResponse } from '@/utils/request';

export interface ProblemTag {
  id: number;
  name: string;
  color: string;
}

export interface Problem {
  id: number;
  title: string;
  description: string;
  input_format: string;
  output_format: string;
  sample_cases: string;
  time_limit: number;
  memory_limit: number;
  difficulty: number;
  is_public: boolean;
  created_by: number;
  created_by_name?: string;
  submission_count?: number;
  accepted_count?: number;
  acceptance_rate?: number;
  tags?: ProblemTag[];
  created_at: string;
  updated_at: string;
}

export interface ProblemListResponse {
  list: Problem[];
  total: number;
}

export const getProblemList = (page: number, size: number, keyword?: string, tagId?: number): Promise<ApiResponse<ProblemListResponse>> => {
  const params: Record<string, string | number> = { page, size };
  if (keyword) params.keyword = keyword;
  if (tagId && tagId > 0) params.tag_id = tagId;
  return request.get('/problem/list', { params });
};

export const getProblemDetail = (id: number): Promise<ApiResponse<Problem>> => {
  return request.get(`/problem/${id}`);
};

export interface CreateProblemParams {
  title: string;
  description: string;
  input_format?: string;
  output_format?: string;
  sample_cases?: Array<{ input: string; output: string }>;
  time_limit: number;
  memory_limit: number;
  difficulty: number;
  is_public?: boolean;
  tag_ids?: number[];
}

export const createProblem = (params: CreateProblemParams): Promise<ApiResponse<{ id: number }>> => {
  return request.post('/admin/problem', params);
};
