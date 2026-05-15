import request, { ApiResponse } from '@/utils/request';

export interface LeaderboardItem {
  user_id: number;
  username: string;
  avatar: string;
  role: number;
  badge: string;
  submissions: number;
  accepted: number;
  accept_rate: number;
  last_active: string;
}

export interface LeaderboardResponse {
  list: LeaderboardItem[];
  total: number;
}

export const getLeaderboard = (
  page: number = 1,
  size: number = 50
): Promise<ApiResponse<LeaderboardResponse>> => {
  return request.get('/leaderboard', { params: { page, size } });
};
