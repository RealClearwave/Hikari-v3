import { generateCaptcha } from "@/server/captcha";
import { success } from "@/server/response";

export async function GET() {
  return success(generateCaptcha());
}
