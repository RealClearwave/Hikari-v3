import request, { ApiResponse } from '@/utils/request';

export interface EvalPayload {
  language: string;
  code: string;
  input: string;
}

export interface EvalResponse {
  stdout: string;
  stderr: string;
  error?: string;
  timeInfo: number;
}

export const evalCode = (
  problemId: number,
  payload: EvalPayload,
): Promise<ApiResponse<EvalResponse>> => {
  return request.post(`/problem/${problemId}/eval`, payload);
};
