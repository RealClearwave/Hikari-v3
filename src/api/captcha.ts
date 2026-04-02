import request, { ApiResponse } from '@/utils/request';

export interface CaptchaData {
  captcha_id: string;
  challenge: string;
  expires_in: number;
}

export const getCaptcha = (): Promise<ApiResponse<CaptchaData>> => {
  return request.get('/captcha');
};
