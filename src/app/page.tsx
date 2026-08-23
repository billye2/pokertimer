"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { exportBackup, importBackup } from "@/lib/backup";
import { db } from "@/lib/db";
import { ensurePresets } from "@/lib/presets";

export default function HomePage() {
  useEffect(() => {
    void ensurePresets();
  }, []);

  const tournaments = useLiveQuery(
    () => db.tournaments.orderBy("createdAt").reverse().toArray(),
    []
  );
  const live = tournaments?.filter((t) => t.status === "live") ?? [];
  const finished = tournaments?.filter((t) => t.status === "finished") ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <section className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Run the game like a pro.
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Clock, blinds, buy-ins, seating, and payouts — everything a
            tournament director needs, fully offline.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild size="lg">
              <Link href="/new">New tournament</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/structures">Blind structures</Link>
            </Button>
          </div>
        </section>

        {live.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Live now
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {live.map((t) => (
                <Link key={t.id} href={`/t/${t.id}`}>
                  <Card className="transition-colors hover:border-primary/50">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {t.config.name}
                        <Badge>Live</Badge>
                      </CardTitle>
                      <CardDescription>
                        {new Date(t.createdAt).toLocaleDateString()} · $
                        {t.config.buyIn} buy-in
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mb-10 text-sm text-muted-foreground">
          <button
            className="underline-offset-4 hover:text-foreground hover:underline"
            onClick={async () => {
              const blob = await exportBackup();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `shuffleup-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export backup
          </button>
          <span className="mx-2">·</span>
          <label className="cursor-pointer underline-offset-4 hover:text-foreground hover:underline">
            Import backup
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await importBackup(await file.text());
                  alert("Backup imported.");
                } catch (err) {
                  alert(`Import failed: ${err instanceof Error ? err.message : err}`);
                }
                e.target.value = "";
              }}
            />
          </label>
        </section>

        {finished.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Past tournaments
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {finished.map((t) => (
                <Link key={t.id} href={`/t/${t.id}`}>
                  <Card className="transition-colors hover:border-primary/50">
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <div className="font-medium">{t.config.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="secondary">Finished</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
