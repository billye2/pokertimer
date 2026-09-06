import "server-only";

const FROM = `Tournament Director <auth@${process.env.RESEND_EMAIL_DOMAIN ?? "cubemetrics.com"}>`;

/** Send the sign-in code. In dev without a key, logs it instead. */
export async function sendCodeEmail(to: string, code: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev] sign-in code for ${to}: ${code}`);
      return true;
    }
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: `${code} is your Tournament Director sign-in code`,
      text: `Your Tournament Director sign-in code is ${code}\n\nIt expires in 10 minutes. If you didn't request it, ignore this email.`,
    }),
  });
  return res.ok;
}
