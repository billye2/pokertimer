"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { db } from "@/lib/db";
import { generateStructure } from "@/lib/generator";

export function GenerateStructureDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(5);
  const [players, setPlayers] = useState(18);
  const [stack, setStack] = useState(10000);
  const [levelMin, setLevelMin] = useState(20);
  const [breakEvery, setBreakEvery] = useState(4);
  const [breakMin, setBreakMin] = useState(10);
  const [antes, setAntes] = useState(true);

  async function generate() {
    const s = generateStructure({
      targetHours: hours,
      players,
      startingStack: stack,
      levelMinutes: levelMin,
      breakEveryLevels: breakEvery,
      breakMinutes: breakMin,
      antes,
    });
    await db.structures.add(s);
    setOpen(false);
    router.push(`/structures/${s.id}`);
  }

  const num =
    (setter: (n: number) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setter(Math.max(0, Number(e.target.value) || 0));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Generate…</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Generate a structure</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label>Target length (hours)</Label>
            <Input type="number" value={hours} onChange={num(setHours)} />
          </div>
          <div className="grid gap-1">
            <Label>Players</Label>
            <Input type="number" value={players} onChange={num(setPlayers)} />
          </div>
          <div className="grid gap-1">
            <Label>Starting stack</Label>
            <Input type="number" value={stack} onChange={num(setStack)} />
          </div>
          <div className="grid gap-1">
            <Label>Level minutes</Label>
            <Input type="number" value={levelMin} onChange={num(setLevelMin)} />
          </div>
          <div className="grid gap-1">
            <Label>Break every (levels)</Label>
            <Input type="number" value={breakEvery} onChange={num(setBreakEvery)} />
          </div>
          <div className="grid gap-1">
            <Label>Break minutes</Label>
            <Input type="number" value={breakMin} onChange={num(setBreakMin)} />
          </div>
          <div className="col-span-2 flex items-center gap-3 pt-1">
            <Switch id="gen-antes" checked={antes} onCheckedChange={setAntes} />
            <Label htmlFor="gen-antes">Big-blind antes in later levels</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={generate} disabled={hours <= 0 || levelMin <= 0}>
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
