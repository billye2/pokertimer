"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { db } from "@/lib/db";
import { newId, newShareCode } from "@/lib/id";
import { ensurePresets } from "@/lib/presets";
import { fmtBlinds } from "@/lib/format";
import type { PayoutMode, TournamentConfig } from "@/lib/types";

export default function NewTournamentPage() {
  const router = useRouter();
  useEffect(() => {
    void ensurePresets();
  }, []);

  const structures = useLiveQuery(() => db.structures.toArray(), []);

  const [name, setName] = useState("Home Game");
  const [buyIn, setBuyIn] = useState(50);
  const [startingStack, setStartingStack] = useState(10000);
  const [tableSize, setTableSize] = useState(9);
  const [structureId, setStructureId] = useState("preset-standard-20");

  const [rebuyOn, setRebuyOn] = useState(false);
  const [rebuyAmount, setRebuyAmount] = useState(50);
  const [rebuyStack, setRebuyStack] = useState(10000);
  const [rebuyLastPeriodIdx, setRebuyLastPeriodIdx] = useState<number | null>(null);
  const [reentry, setReentry] = useState(true);

  const [addonOn, setAddonOn] = useState(false);
  const [addonAmount, setAddonAmount] = useState(25);
  const [addonStack, setAddonStack] = useState(15000);

  const [bountyOn, setBountyOn] = useState(false);
  const [bountyAmount, setBountyAmount] = useState(10);

  const [payoutKind, setPayoutKind] = useState<"auto" | "pcts">("auto");
  const [pctsText, setPctsText] = useState("50, 30, 20");
  const [roundTo, setRoundTo] = useState(5);

  const structure = structures?.find((s) => s.id === structureId);

  const levelOptions = useMemo(() => {
    if (!structure) return [];
    const opts: { periodIdx: number; label: string }[] = [];
    let n = 0;
    structure.periods.forEach((p, i) => {
      if (p.type === "level") {
        n++;
        opts.push({ periodIdx: i, label: `Level ${n} · ${fmtBlinds(p.sb, p.bb, p.ante)}` });
      }
    });
    return opts;
  }, [structure]);

  const defaultRebuyEnd = useMemo(() => {
    if (!structure) return 0;
    const firstBreak = structure.periods.findIndex((p) => p.type === "break");
    return firstBreak > 0 ? firstBreak - 1 : structure.periods.length - 1;
  }, [structure]);

  async function create() {
    if (!structure) return;
    let mode: PayoutMode = { kind: "auto" };
    if (payoutKind === "pcts") {
      const pcts = pctsText
        .split(/[,\s]+/)
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0);
      const sum = pcts.reduce((a, b) => a + b, 0);
      if (pcts.length === 0 || Math.abs(sum - 100) > 0.01) {
        alert(`Custom percentages must sum to 100 (currently ${sum}).`);
        return;
      }
      mode = { kind: "pcts", pcts };
    }
    const config: TournamentConfig = {
      id: newId(),
      name: name.trim() || "Home Game",
      createdAt: Date.now(),
      currency: "$",
      buyIn,
      startingStack,
      tableSize,
      rebuy: rebuyOn
        ? {
            amount: rebuyAmount,
            stack: rebuyStack,
            maxPerPlayer: null,
            lastPeriodIdx: rebuyLastPeriodIdx ?? defaultRebuyEnd,
            reentry,
          }
        : null,
      addon: addonOn ? { amount: addonAmount, stack: addonStack } : null,
      bounty: bountyOn ? { amount: bountyAmount } : null,
      payouts: { mode, roundTo },
      structure: { ...structure, id: newId(), preset: false },
    };
    await db.tournaments.add({
      id: config.id,
      createdAt: config.createdAt,
      status: "live",
      finishedAt: null,
      config,
      shareCode: newShareCode(),
    });
    router.push(`/t/${config.id}`);
  }

  const num =
    (setter: (n: number) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setter(Math.max(0, Number(e.target.value) || 0));

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">New tournament</h1>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="buyin">Buy-in ($)</Label>
                <Input id="buyin" type="number" value={buyIn} onChange={num(setBuyIn)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stack">Starting stack</Label>
                <Input
                  id="stack"
                  type="number"
                  value={startingStack}
                  onChange={num(setStartingStack)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Table size</Label>
                <Select
                  value={String(tableSize)}
                  onValueChange={(v) => setTableSize(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[6, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}-handed
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Blind structure</Label>
                <Select value={structureId} onValueChange={setStructureId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {structures?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Rebuys & re-entries</CardTitle>
                <CardDescription>Extra bullets during the early levels</CardDescription>
              </div>
              <Switch checked={rebuyOn} onCheckedChange={setRebuyOn} />
            </CardHeader>
            {rebuyOn && (
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Rebuy amount ($)</Label>
                  <Input type="number" value={rebuyAmount} onChange={num(setRebuyAmount)} />
                </div>
                <div className="grid gap-2">
                  <Label>Rebuy stack</Label>
                  <Input type="number" value={rebuyStack} onChange={num(setRebuyStack)} />
                </div>
                <div className="grid gap-2">
                  <Label>Available through</Label>
                  <Select
                    value={String(rebuyLastPeriodIdx ?? defaultRebuyEnd)}
                    onValueChange={(v) => setRebuyLastPeriodIdx(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {levelOptions.map((o) => (
                        <SelectItem key={o.periodIdx} value={String(o.periodIdx)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={reentry} onCheckedChange={setReentry} id="reentry" />
                  <Label htmlFor="reentry">Allow re-entry after busting</Label>
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Add-on</CardTitle>
                <CardDescription>One extra purchase at the end of the rebuy period</CardDescription>
              </div>
              <Switch checked={addonOn} onCheckedChange={setAddonOn} />
            </CardHeader>
            {addonOn && (
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Add-on amount ($)</Label>
                  <Input type="number" value={addonAmount} onChange={num(setAddonAmount)} />
                </div>
                <div className="grid gap-2">
                  <Label>Add-on stack</Label>
                  <Input type="number" value={addonStack} onChange={num(setAddonStack)} />
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bounties</CardTitle>
                <CardDescription>Flat cash bounty for every knockout</CardDescription>
              </div>
              <Switch checked={bountyOn} onCheckedChange={setBountyOn} />
            </CardHeader>
            {bountyOn && (
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Bounty amount ($)</Label>
                  <Input type="number" value={bountyAmount} onChange={num(setBountyAmount)} />
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payouts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Scheme</Label>
                <Select
                  value={payoutKind}
                  onValueChange={(v) => setPayoutKind(v as "auto" | "pcts")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Standard (by field size)</SelectItem>
                    <SelectItem value="pcts">Custom percentages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Round payouts to ($)</Label>
                <Input type="number" value={roundTo} onChange={num(setRoundTo)} />
              </div>
              {payoutKind === "pcts" && (
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Percentages (1st, 2nd, …) — must sum to 100</Label>
                  <Input value={pctsText} onChange={(e) => setPctsText(e.target.value)} />
                </div>
              )}
            </CardContent>
          </Card>

          <Button size="lg" onClick={create} disabled={!structure}>
            Create tournament
          </Button>
        </div>
      </main>
    </div>
  );
}
