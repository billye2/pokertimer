import { issueCode, normalizeEmail } from "@/lib/auth";
import { sendCodeEmail } from "@/lib/email";

export async function POST(req: Request) {
  const { email: raw } = await req.json().catch(() => ({}));
  const email = typeof raw === "string" ? normalizeEmail(raw) : null;
  if (!email) return Response.json({ error: "Enter a valid email." }, { status: 400 });

  const code = await issueCode(email);
  if (!code)
    return Response.json({ error: "Too many codes requested. Try again in an hour." }, { status: 429 });

  const sent = await sendCodeEmail(email, code);
  if (!sent) return Response.json({ error: "Couldn't send the email. Try again." }, { status: 502 });
  return Response.json({ ok: true });
}
