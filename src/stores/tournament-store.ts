import { create } from "zustand";
import {
  appendEvent,
  db,
  deleteEvent,
  loadEvents,
  type TournamentRecord,
} from "@/lib/db";
import {
  foldEvents,
  type EventBody,
  type LiveState,
  type TournamentEvent,
} from "@/lib/events";
import { newShareCode } from "@/lib/id";
import type { TournamentConfig } from "@/lib/types";

/** Events that undo should never remove (clock ticks along regardless). */
const UNDOABLE = new Set<TournamentEvent["type"]>([
  "entrant/buy-in",
  "entrant/re-entry",
  "entrant/rebuy",
  "entrant/addon",
  "entrant/eliminate",
  "entrant/remove",
  "seat/assign",
  "seat/draw",
  "table/break",
  "payouts/override",
  "payouts/clear-override",
  "deal/set",
  "deal/clear",
  "tournament/finish",
]);

interface TournamentStore {
  id: string | null;
  config: TournamentConfig | null;
  status: TournamentRecord["status"] | null;
  shareCode: string | null;
  events: TournamentEvent[];
  state: LiveState | null;
  loading: boolean;

  load: (id: string) => Promise<void>;
  dispatch: (body: EventBody) => Promise<void>;
  /** Undo the last player/seat/payout action (never clock events). Returns what was undone. */
  undo: () => Promise<TournamentEvent | null>;
  lastUndoable: () => TournamentEvent | null;
  updateConfig: (config: TournamentConfig) => Promise<void>;
  /** Replace the display share code so the old link stops working. Returns the new code. */
  regenerateShareCode: () => Promise<string | null>;
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  id: null,
  config: null,
  status: null,
  shareCode: null,
  events: [],
  state: null,
  loading: false,

  load: async (id: string) => {
    set({ loading: true });
    const record = await db.tournaments.get(id);
    if (!record) {
      set({
        id: null,
        config: null,
        status: null,
        shareCode: null,
        events: [],
        state: null,
        loading: false,
      });
      return;
    }
    let shareCode = record.shareCode ?? null;
    if (!shareCode) {
      // Backfill tournaments created before share links existed.
      shareCode = newShareCode();
      await db.tournaments.update(id, { shareCode });
    }
    const events = await loadEvents(id);
    set({
      id,
      config: record.config,
      status: record.status,
      shareCode,
      events,
      state: foldEvents(events),
      loading: false,
    });
  },

  dispatch: async (body: EventBody) => {
    const { id, events } = get();
    if (!id) return;
    const evt: TournamentEvent = {
      ...body,
      seq: events.length > 0 ? events[events.length - 1].seq + 1 : 1,
      at: Date.now(),
    };
    await appendEvent(id, evt);
    const next = [...events, evt];
    set({ events: next, state: foldEvents(next) });
    if (evt.type === "tournament/finish") {
      await db.tournaments.update(id, { status: "finished", finishedAt: evt.at });
      set({ status: "finished" });
    }
  },

  undo: async () => {
    const { id, events } = get();
    if (!id) return null;
    for (let i = events.length - 1; i >= 0; i--) {
      const evt = events[i];
      if (UNDOABLE.has(evt.type)) {
        await deleteEvent(id, evt.seq);
        const next = events.filter((e) => e.seq !== evt.seq);
        set({ events: next, state: foldEvents(next) });
        if (evt.type === "tournament/finish") {
          await db.tournaments.update(id, { status: "live", finishedAt: null });
          set({ status: "live" });
        }
        return evt;
      }
    }
    return null;
  },

  lastUndoable: () => {
    const { events } = get();
    for (let i = events.length - 1; i >= 0; i--) {
      if (UNDOABLE.has(events[i].type)) return events[i];
    }
    return null;
  },

  updateConfig: async (config: TournamentConfig) => {
    const { id } = get();
    if (!id) return;
    await db.tournaments.update(id, { config });
    set({ config });
  },

  regenerateShareCode: async () => {
    const { id, shareCode: oldCode } = get();
    if (!id) return null;
    const shareCode = newShareCode();
    await db.tournaments.update(id, { shareCode });
    set({ shareCode });
    if (oldCode) {
      // Best effort: drop the old snapshot so the old link 404s right away
      // instead of showing a stale board until its TTL runs out.
      void fetch(`/api/display/${oldCode}`, { method: "DELETE", keepalive: true }).catch(
        () => {}
      );
    }
    return shareCode;
  },
}));
