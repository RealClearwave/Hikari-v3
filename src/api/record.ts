import request, { ApiResponse } from '@/utils/request';

export interface RecordItem {
  id: number;
  user_id: number;
  problem_id: number;
  contest_id: number;
  language: string;
  status: number;
  time_used: number;
  memory_used: number;
  error_info: string;
  created_at: string;
  username?: string;
  avatar?: string;
  role?: number;
  badge?: string;
  accepted_count?: number;
}

export interface RecordStats {
  status_counts: Record<string, number>;
}

export interface RecordListResponse {
  list: RecordItem[];
  total: number;
  stats?: RecordStats;
}

export interface SubmitRecordPayload {
  problem_id: number;
  contest_id?: number;
  language: string;
  code: string;
  captcha_id: string;
  captcha_answer: string;
  status?: number;
  time_used?: number;
  memory_used?: number;
  error_info?: string;
}

export interface SubmitRecordResponse {
  id: number;
  status: number;
}

export interface RecordDetail {
  id: number;
  user_id: number;
  problem_id: number;
  contest_id: number;
  language: string;
  code: string;
  status: number;
  time_used: number;
  memory_used: number;
  error_info: string;
  created_at: string;
  username: string;
  avatar: string;
  role: number;
  badge: string;
  accepted_count: number;
  problem_title: string;
}

export interface RecordDetailResponse {
  record: RecordDetail;
}

export const getRecordList = (
  page: number,
  size: number,
  problemId?: number,
  userId?: number,
): Promise<ApiResponse<RecordListResponse>> => {
  return request.get('/record/list', {
    params: {
      page,
      size,
      problem_id: problemId,
      user_id: userId,
    },
  });
};

export const submitRecord = (
  payload: SubmitRecordPayload,
): Promise<ApiResponse<SubmitRecordResponse>> => {
  return request.post('/record/submit', payload);
};

export const getRecordDetail = (id: number): Promise<ApiResponse<RecordDetailResponse>> => {
  return request.get(`/record/${id}`);
};
