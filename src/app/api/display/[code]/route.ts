import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const TTL_SECONDS = 60 * 60 * 12; // display links live for 12 hours after the last push
const MAX_BODY_BYTES = 64 * 1024;
const CODE_RE = /^[a-z2-9]{6,32}$/;

function redis(): Redis | null {
  if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    return null;
  }
  return Redis.fromEnv();
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/display/[code]">
) {
  const { code } = await ctx.params;
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "bad code" }, { status: 400 });
  }
  const r = redis();
  if (!r) {
    return NextResponse.json({ error: "sync not configured" }, { status: 503 });
  }
  const snapshot = await r.get(`display:${code}`);
  if (!snapshot) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(snapshot, {
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/display/[code]">
) {
  const { code } = await ctx.params;
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "bad code" }, { status: 400 });
  }
  const r = redis();
  if (!r) {
    return NextResponse.json({ error: "sync not configured" }, { status: 503 });
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  await r.set(`display:${code}`, body, { ex: TTL_SECONDS });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/display/[code]">
) {
  const { code } = await ctx.params;
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "bad code" }, { status: 400 });
  }
  const r = redis();
  if (!r) {
    return NextResponse.json({ error: "sync not configured" }, { status: 503 });
  }
  await r.del(`display:${code}`);
  return NextResponse.json({ ok: true });
}
