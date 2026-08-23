/** UUIDs everywhere so local data can merge into a cloud account later. */
export function newId(): string {
  return crypto.randomUUID();
}

/** Short unguessable share code for display links. */
export function newShareCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
