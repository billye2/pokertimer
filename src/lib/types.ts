export interface LevelPeriod {
  type: "level";
  sb: number;
  bb: number;
  ante: number; // big-blind ante; 0 = none
  durationMin: number;
}

export interface BreakPeriod {
  type: "break";
  durationMin: number;
  /** Prompt to race off chip denominations below this value during the break. */
  chipRaceBelow?: number;
}

export type Period = LevelPeriod | BreakPeriod;

export interface Structure {
  id: string;
  name: string;
  preset?: boolean; // seeded read-only presets; copy to edit
  periods: Period[];
  createdAt: number;
  updatedAt: number;
}

export interface ChipDenom {
  value: number;
  color: string; // CSS color for display
  label: string; // e.g. "25", "1K"
  count: number; // how many physical chips in the set
}

export interface Chipset {
  id: string;
  name: string;
  chips: ChipDenom[];
  createdAt: number;
  updatedAt: number;
}

export interface RebuyConfig {
  amount: number;
  stack: number;
  maxPerPlayer: number | null; // null = unlimited
  /** Rebuys/re-entries allowed through the end of this period index. */
  lastPeriodIdx: number;
  reentry: boolean; // may eliminated players re-enter during the window?
}

export interface AddonConfig {
  amount: number;
  stack: number;
}

export interface BountyConfig {
  amount: number; // flat bounty per knockout, collected per entry
}

export type PayoutMode =
  | { kind: "auto" } // standard table by field size
  | { kind: "pcts"; pcts: number[] }; // fixed percentages, must sum to 100

export interface PayoutSettings {
  mode: PayoutMode;
  roundTo: number; // round payouts to a multiple of this (e.g. 5)
}

export interface TournamentConfig {
  id: string;
  name: string;
  createdAt: number;
  currency: string; // display symbol, e.g. "$"
  buyIn: number;
  startingStack: number;
  tableSize: number; // max seats per table
  rebuy: RebuyConfig | null;
  addon: AddonConfig | null;
  bounty: BountyConfig | null;
  payouts: PayoutSettings;
  structure: Structure; // embedded snapshot, safe to edit live
}

export interface PlayerProfile {
  id: string;
  name: string;
  createdAt: number;
}
