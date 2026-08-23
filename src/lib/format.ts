/** "12:34" or "1:02:03" for longer spans. Ceils to the next whole second. */
export function fmtClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtMoney(n: number, currency = "$"): string {
  const rounded = Math.round(n * 100) / 100;
  const str = Number.isInteger(rounded)
    ? rounded.toLocaleString("en-US")
    : rounded.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return `${currency}${str}`;
}

/** Chip amounts for the big screen: 1000 → "1,000", 100000 → "100K". */
export function fmtChips(n: number): string {
  if (n >= 100_000 && n % 1000 === 0) return `${(n / 1000).toLocaleString("en-US")}K`;
  return n.toLocaleString("en-US");
}

export function fmtBlinds(sb: number, bb: number, ante: number): string {
  const base = `${fmtChips(sb)} / ${fmtChips(bb)}`;
  return ante > 0 ? `${base} (${fmtChips(ante)})` : base;
}

export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
