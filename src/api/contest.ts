import request, { ApiResponse } from '@/utils/request';

export interface Contest {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  type: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ContestListResponse {
  list: Contest[];
  total: number;
}

export const getContestList = (
  page: number,
  size: number,
): Promise<ApiResponse<ContestListResponse>> => {
  return request.get('/contest/list', {
    params: { page, size },
  });
};
