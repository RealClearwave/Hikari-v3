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

export interface ContestProblemItem {
  problem_id: number;
  display_id: string;
  title: string;
  ac_count: number;
  submit_count: number;
}

export interface ContestSubmissionItem {
  id: number;
  user_id: number;
  username: string;
  role: number;
  badge: string;
  accepted_count: number;
  problem_id: number;
  display_id: string;
  language: string;
  status: number;
  time_used: number;
  memory_used: number;
  created_at: string;
}

export interface ContestStandingItem {
  user_id: number;
  username: string;
  role: number;
  badge: string;
  solved: number;
  accepted: number;
  submissions: number;
  wrong_attempts: number;
}

export interface ContestDetailResponse {
  contest: Contest & {
    creator_name: string;
    creator_role: number;
    creator_badge: string;
    creator_accepted_count: number;
  };
  problems: ContestProblemItem[];
  submissions: ContestSubmissionItem[];
  standings: ContestStandingItem[];
}

export const getContestList = (
  page: number,
  size: number,
): Promise<ApiResponse<ContestListResponse>> => {
  return request.get('/contest/list', {
    params: { page, size },
  });
};

export const getContestDetail = (id: number): Promise<ApiResponse<ContestDetailResponse>> => {
  return request.get(`/contest/${id}`);
};
