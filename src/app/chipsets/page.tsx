"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maxPlayers, stackBreakdown } from "@/lib/chips";
import { db } from "@/lib/db";
import { fmtChips } from "@/lib/format";
import { newId } from "@/lib/id";
import type { Chipset } from "@/lib/types";

const DEFAULT_COLORS = [
  "#2e7d32", // green 25
  "#1a1a1a", // black 100
  "#7b1fa2", // purple 500
  "#f9a825", // yellow 1000
  "#c62828", // red 5000
];

function persistChipset(cs: Chipset) {
  return db.chipsets.put({ ...cs, updatedAt: Date.now() });
}

export default function ChipsetsPage() {
  const chipsets = useLiveQuery(() => db.chipsets.toArray(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stack, setStack] = useState(10000);
  const [players, setPlayers] = useState(9);

  const selected = chipsets?.find((c) => c.id === selectedId) ?? null;

  async function createChipset() {
    const now = Date.now();
    const cs: Chipset = {
      id: newId(),
      name: "My chip set",
      chips: [
        { value: 25, color: DEFAULT_COLORS[0], label: "25", count: 150 },
        { value: 100, color: DEFAULT_COLORS[1], label: "100", count: 150 },
        { value: 500, color: DEFAULT_COLORS[2], label: "500", count: 100 },
        { value: 1000, color: DEFAULT_COLORS[3], label: "1K", count: 100 },
      ],
      createdAt: now,
      updatedAt: now,
    };
    await db.chipsets.add(cs);
    setSelectedId(cs.id);
  }

  async function updateChipset(cs: Chipset) {
    await persistChipset(cs);
  }

  const breakdown = selected
    ? stackBreakdown(selected, stack, players)
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Chip sets</h1>
          <Button onClick={createChipset}>New chip set</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
          <div className="flex flex-col gap-2">
            {chipsets?.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  c.id === selectedId
                    ? "border-primary/60 bg-primary/10"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-muted-foreground">
                  {c.chips.length} denominations
                </div>
              </button>
            ))}
            {chipsets?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Describe your physical chips once — get stack setups for any
                player count.
              </p>
            )}
          </div>

          {selected ? (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <Input
                    className="max-w-64 font-semibold"
                    value={selected.name}
                    onChange={(e) =>
                      void updateChipset({ ...selected, name: e.target.value })
                    }
                  />
                </CardHeader>
                <CardContent className="grid gap-2">
                  <div className="grid grid-cols-[1fr_5rem_6rem_6rem_2rem] items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <span>Color</span>
                    <span>Label</span>
                    <span>Value</span>
                    <span>Count</span>
                    <span />
                  </div>
                  {selected.chips
                    .slice()
                    .sort((a, b) => a.value - b.value)
                    .map((chip, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_5rem_6rem_6rem_2rem] items-center gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={chip.color}
                            onChange={(e) =>
                              void updateChipset({
                                ...selected,
                                chips: selected.chips.map((c) =>
                                  c === chip ? { ...c, color: e.target.value } : c
                                ),
                              })
                            }
                            className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                          />
                          <span
                            className="inline-block h-5 w-5 rounded-full border-2 border-dashed border-white/40"
                            style={{ backgroundColor: chip.color }}
                          />
                        </div>
                        <Input
                          className="h-8"
                          value={chip.label}
                          onChange={(e) =>
                            void updateChipset({
                              ...selected,
                              chips: selected.chips.map((c) =>
                                c === chip ? { ...c, label: e.target.value } : c
                              ),
                            })
                          }
                        />
                        <Input
                          className="h-8"
                          type="number"
                          value={chip.value}
                          onChange={(e) =>
                            void updateChipset({
                              ...selected,
                              chips: selected.chips.map((c) =>
                                c === chip
                                  ? { ...c, value: Number(e.target.value) || 0 }
                                  : c
                              ),
                            })
                          }
                        />
                        <Input
                          className="h-8"
                          type="number"
                          value={chip.count}
                          onChange={(e) =>
                            void updateChipset({
                              ...selected,
                              chips: selected.chips.map((c) =>
                                c === chip
                                  ? { ...c, count: Number(e.target.value) || 0 }
                                  : c
                              ),
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void updateChipset({
                              ...selected,
                              chips: selected.chips.filter((c) => c !== chip),
                            })
                          }
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const maxVal = Math.max(
                          0,
                          ...selected.chips.map((c) => c.value)
                        );
                        const nextVal = maxVal > 0 ? maxVal * 5 : 25;
                        void updateChipset({
                          ...selected,
                          chips: [
                            ...selected.chips,
                            {
                              value: nextVal,
                              color:
                                DEFAULT_COLORS[
                                  selected.chips.length % DEFAULT_COLORS.length
                                ],
                              label: nextVal >= 1000 ? `${nextVal / 1000}K` : String(nextVal),
                              count: 100,
                            },
                          ],
                        });
                      }}
                    >
                      Add denomination
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (confirm(`Delete ${selected.name}?`)) {
                          await db.chipsets.delete(selected.id);
                          setSelectedId(null);
                        }
                      }}
                    >
                      Delete set
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Stack calculator</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                    <div className="grid gap-1">
                      <Label>Starting stack</Label>
                      <Input
                        type="number"
                        value={stack}
                        onChange={(e) =>
                          setStack(Math.max(0, Number(e.target.value) || 0))
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label>Players</Label>
                      <Input
                        type="number"
                        value={players}
                        onChange={(e) =>
                          setPlayers(Math.max(1, Number(e.target.value) || 1))
                        }
                      />
                    </div>
                  </div>
                  {breakdown && breakdown.lines.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-3">
                        {breakdown.lines.map((l) => (
                          <div
                            key={l.value}
                            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                          >
                            <span
                              className="inline-block h-6 w-6 rounded-full border-2 border-dashed border-white/40"
                              style={{ backgroundColor: l.color }}
                            />
                            <span className="text-sm">
                              <span className="font-semibold tabular-nums">
                                {l.perPlayer}×
                              </span>{" "}
                              {l.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p
                        className={`text-sm ${
                          breakdown.exact
                            ? "text-muted-foreground"
                            : "text-destructive"
                        }`}
                      >
                        {breakdown.exact
                          ? `Each player gets exactly ${fmtChips(breakdown.stackValue)}.`
                          : `Closest achievable stack is ${fmtChips(breakdown.stackValue)} — adjust denominations or counts.`}{" "}
                        This set seats up to {maxPlayers(selected, stack)} players
                        at {fmtChips(stack)}.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Add denominations to see a stack breakdown.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Select or create a chip set.
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
