import request, { ApiResponse } from '@/utils/request';

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
  created_at: string;
  updated_at: string;
}

export interface ProblemListResponse {
  list: Problem[];
  total: number;
}

export const getProblemList = (page: number, size: number, keyword?: string): Promise<ApiResponse<ProblemListResponse>> => {
  return request.get('/problem/list', {
    params: {
        page,
        size,
        keyword
    }
  });
};

export const getProblemDetail = (id: number): Promise<ApiResponse<Problem>> => {
  return request.get(`/problem/${id}`);
};
