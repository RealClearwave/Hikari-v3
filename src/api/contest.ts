import request, { ApiResponse } from '@/utils/request';

export interface Contest {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  type: number;
  password?: string;
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

export interface ContestProblemResult {
  display_id: string;
  attempts: number;
  solved: boolean;
  solve_time_minutes: number;
}

export interface ContestStandingItem {
  rank: number;
  user_id: number;
  username: string;
  role: number;
  badge: string;
  solved: number;
  penalty: number; // ACM penalty time in minutes
  submissions: number;
  problems: Record<string, ContestProblemResult>;
}

export interface ContestDetailResponse {
  contest: Contest & {
    creator_name: string;
    creator_role: number;
    creator_badge: string;
    creator_accepted_count: number;
    has_password: boolean;
    participant_count: number;
  };
  user_joined: boolean;
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

export const joinContest = (
  id: number,
  password?: string,
): Promise<ApiResponse<{ joined: boolean; contest_id: number; message: string }>> => {
  return request.post(`/contest/${id}/join`, { password: password || '' });
};

export const checkContestJoined = (
  id: number,
): Promise<ApiResponse<{ joined: boolean; contest_id: number }>> => {
  return request.get(`/contest/${id}/join`);
};

export interface CreateContestParams {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  type?: number;
  password?: string;
  problem_ids?: number[];
}

export const createContest = (params: CreateContestParams): Promise<ApiResponse<{ id: number }>> => {
  return request.post('/admin/contest', params);
};
