"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { AppHeader } from "@/components/app-header";
import { GenerateStructureDialog } from "@/components/generate-structure-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { newId } from "@/lib/id";
import { ensurePresets } from "@/lib/presets";
import type { Structure } from "@/lib/types";

function summary(s: Structure): string {
  const levels = s.periods.filter((p) => p.type === "level").length;
  const totalMin = s.periods.reduce((a, p) => a + p.durationMin, 0);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${levels} levels · ${h}h${m ? ` ${m}m` : ""} total`;
}

export default function StructuresPage() {
  const router = useRouter();
  useEffect(() => {
    void ensurePresets();
  }, []);
  const structures = useLiveQuery(() => db.structures.toArray(), []);
  const presets = structures?.filter((s) => s.preset) ?? [];
  const custom = structures?.filter((s) => !s.preset) ?? [];

  async function createBlank() {
    const now = Date.now();
    const id = newId();
    await db.structures.add({
      id,
      name: "New structure",
      periods: [
        { type: "level", sb: 25, bb: 50, ante: 0, durationMin: 20 },
        { type: "level", sb: 50, bb: 100, ante: 0, durationMin: 20 },
      ],
      createdAt: now,
      updatedAt: now,
    });
    router.push(`/structures/${id}`);
  }

  const grid = (items: Structure[]) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((s) => (
        <Link key={s.id} href={`/structures/${s.id}`}>
          <Card className="transition-colors hover:border-primary/50">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-muted-foreground">{summary(s)}</div>
              </div>
              {s.preset && <Badge variant="secondary">Preset</Badge>}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Blind structures</h1>
          <div className="flex gap-2">
            <GenerateStructureDialog />
            <Button onClick={createBlank}>New structure</Button>
          </div>
        </div>
        {custom.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Yours
            </h2>
            {grid(custom)}
          </section>
        )}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Presets
          </h2>
          {grid(presets)}
        </section>
      </main>
    </div>
  );
}
