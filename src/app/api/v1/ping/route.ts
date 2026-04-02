import { success } from "@/server/response";

export async function GET() {
  return success({ message: "pong" });
}
