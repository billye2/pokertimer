"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "@/lib/db";
import { newId } from "@/lib/id";
import type { LevelPeriod, Period, Structure } from "@/lib/types";

/** Common blind ladder for auto-suggesting the next level. */
const LADDER = [
  25, 50, 75, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1500, 2000, 2500,
  3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000, 30000, 40000, 50000,
];

function nextLevelAfter(periods: Period[]): LevelPeriod {
  const lastLevel = [...periods].reverse().find((p) => p.type === "level") as
    | LevelPeriod
    | undefined;
  if (!lastLevel) return { type: "level", sb: 25, bb: 50, ante: 0, durationMin: 20 };
  const i = LADDER.indexOf(lastLevel.sb);
  const sb = i >= 0 && i + 1 < LADDER.length ? LADDER[i + 1] : lastLevel.sb * 2;
  const bb = sb * 2;
  return {
    type: "level",
    sb,
    bb,
    ante: lastLevel.ante > 0 ? bb : 0,
    durationMin: lastLevel.durationMin,
  };
}

export default function StructureEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [structure, setStructure] = useState<Structure | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void db.structures.get(params.id).then((s) => {
      setStructure(s ?? null);
      setLoaded(true);
    });
  }, [params.id]);

  if (!loaded) return null;
  if (!structure) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          Structure not found.
        </main>
      </div>
    );
  }

  const readonly = !!structure.preset;

  const update = (fn: (s: Structure) => Structure) => {
    setStructure((prev) => (prev ? fn(prev) : prev));
  };

  const setPeriod = (idx: number, p: Period) =>
    update((s) => ({
      ...s,
      periods: s.periods.map((old, i) => (i === idx ? p : old)),
    }));

  async function save() {
    if (!structure || readonly) return;
    await db.structures.put({ ...structure, updatedAt: Date.now() });
    router.push("/structures");
  }

  async function duplicate() {
    if (!structure) return;
    const now = Date.now();
    const id = newId();
    await db.structures.add({
      ...structure,
      id,
      name: `${structure.name} (copy)`,
      preset: false,
      createdAt: now,
      updatedAt: now,
    });
    router.push(`/structures/${id}`);
  }

  async function remove() {
    if (!structure || readonly) return;
    await db.structures.delete(structure.id);
    router.push("/structures");
  }

  let levelNo = 0;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {readonly ? (
              <>
                <h1 className="text-2xl font-bold tracking-tight">{structure.name}</h1>
                <Badge variant="secondary">Preset — duplicate to edit</Badge>
              </>
            ) : (
              <Input
                className="w-72 text-lg font-semibold"
                value={structure.name}
                onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={duplicate}>
              Duplicate
            </Button>
            {!readonly && (
              <>
                <Button variant="destructive" onClick={remove}>
                  Delete
                </Button>
                <Button onClick={save}>Save</Button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">SB</th>
                <th className="px-3 py-2 text-left font-medium">BB</th>
                <th className="px-3 py-2 text-left font-medium">BB ante</th>
                <th className="px-3 py-2 text-left font-medium">Minutes</th>
                <th className="px-3 py-2 text-left font-medium">Race off below</th>
                {!readonly && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {structure.periods.map((p, i) => {
                if (p.type === "level") levelNo++;
                const numCell = (
                  value: number,
                  set: (n: number) => void,
                  width = "w-24"
                ) =>
                  readonly ? (
                    <span className="tabular-nums">{value.toLocaleString()}</span>
                  ) : (
                    <Input
                      type="number"
                      className={`${width} h-8`}
                      value={value}
                      onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))}
                    />
                  );
                return (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {p.type === "level" ? `L${levelNo}` : "☕"}
                    </td>
                    <td className="px-3 py-1.5">
                      {readonly ? (
                        p.type
                      ) : (
                        <Select
                          value={p.type}
                          onValueChange={(v) =>
                            setPeriod(
                              i,
                              v === "level"
                                ? { type: "level", sb: 25, bb: 50, ante: 0, durationMin: p.durationMin }
                                : { type: "break", durationMin: 10 }
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="level">Level</SelectItem>
                            <SelectItem value="break">Break</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    {p.type === "level" ? (
                      <>
                        <td className="px-3 py-1.5">
                          {numCell(p.sb, (n) => setPeriod(i, { ...p, sb: n }))}
                        </td>
                        <td className="px-3 py-1.5">
                          {numCell(p.bb, (n) => setPeriod(i, { ...p, bb: n }))}
                        </td>
                        <td className="px-3 py-1.5">
                          {numCell(p.ante, (n) => setPeriod(i, { ...p, ante: n }))}
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-1.5 text-muted-foreground" colSpan={3}>
                        Break
                      </td>
                    )}
                    <td className="px-3 py-1.5">
                      {numCell(p.durationMin, (n) => setPeriod(i, { ...p, durationMin: n }), "w-20")}
                    </td>
                    <td className="px-3 py-1.5">
                      {p.type === "break" ? (
                        numCell(p.chipRaceBelow ?? 0, (n) =>
                          setPeriod(i, { ...p, chipRaceBelow: n || undefined })
                        , "w-20")
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    {!readonly && (
                      <td className="px-3 py-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            update((s) => ({
                              ...s,
                              periods: s.periods.filter((_, j) => j !== i),
                            }))
                          }
                        >
                          ✕
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!readonly && (
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                update((s) => ({ ...s, periods: [...s.periods, nextLevelAfter(s.periods)] }))
              }
            >
              Add level
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                update((s) => ({
                  ...s,
                  periods: [...s.periods, { type: "break", durationMin: 10 }],
                }))
              }
            >
              Add break
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
