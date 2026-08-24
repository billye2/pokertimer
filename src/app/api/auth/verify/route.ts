import { createSession, normalizeEmail, redeemCode } from "@/lib/auth";

export async function POST(req: Request) {
  const { email: raw, code } = await req.json().catch(() => ({}));
  const email = typeof raw === "string" ? normalizeEmail(raw) : null;
  if (!email || typeof code !== "string")
    return Response.json({ error: "Invalid request." }, { status: 400 });

  if (!(await redeemCode(email, code.trim())))
    return Response.json({ error: "Wrong or expired code." }, { status: 401 });

  await createSession(email);
  return Response.json({ ok: true, email });
}
