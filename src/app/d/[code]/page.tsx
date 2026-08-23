"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DisplayBoard } from "@/components/display-board";
import { useNow } from "@/hooks/use-now";
import type { DisplaySnapshot } from "@/lib/display-snapshot";

const POLL_MS = 5_000;
const STALE_AFTER_MS = 3 * 60_000;

/** Remote display: follows a share code over the network, read-only. */
export default function RemoteDisplayPage() {
  const params = useParams<{ code: string }>();
  const now = useNow(1000);
  const [snapshot, setSnapshot] = useState<DisplaySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/display/${params.code}`, {
          cache: "no-store",
        });
        if (stopped) return;
        if (res.ok) {
          setSnapshot((await res.json()) as DisplaySnapshot);
          setError(null);
        } else if (res.status === 404) {
          setError("This display link isn't live. Ask the director to open the tournament while online.");
        } else if (res.status === 503) {
          setError("Display sync isn't configured on this server.");
        }
      } catch {
        // Keep showing the last snapshot; staleness banner handles it.
      }
    };
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [params.code]);

  if (!snapshot) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-8 text-center text-muted-foreground">
        {error ?? "Connecting to the tournament…"}
      </div>
    );
  }

  const age = now - snapshot.updatedAt;

  return (
    <DisplayBoard
      name={snapshot.name}
      currency={snapshot.currency}
      clock={snapshot.clock}
      periods={snapshot.periods}
      playersLeft={snapshot.playersLeft}
      entries={snapshot.entries}
      pool={snapshot.pool}
      avg={snapshot.avg}
      payouts={snapshot.payouts}
      staleSinceMs={age > STALE_AFTER_MS ? age : null}
    />
  );
}
