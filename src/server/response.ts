import { NextResponse } from "next/server";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ code: 0, msg: "success", data }, { status });
}

export function fail(msg: string, status = 400, code = status) {
  return NextResponse.json({ code, msg, data: null }, { status });
}
