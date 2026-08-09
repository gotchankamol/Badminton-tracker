export type Payment = {
  id: number;
  amount: number;
  shuttleCount: number | null;
  at: string | null;
};

export type Player = {
  id: number;
  name: string;
  isToday: boolean;
  hasLeft: boolean;
  payments: Payment[];
};

export type Shuttle = {
  id: number;
  numbers: string[];
  playerIds: number[];
  date: string;
  createdAt: string;
};

export type Settings = {
  price: number;
  maxShuttleNumber: number;
  dayResetHour: number;
  dayResetEnabled: boolean;
  // Raw stored round boundary (null = no explicit "end round" yet this business day).
  // Kept in the undoable state so undo/redo can "un-end" a round, not just replay it.
  roundStartAt: string | null;
};

export type AppState = {
  roster: Player[];
  shuttles: Shuttle[];
  settings: Settings;
  // ISO instant the current round started (either the business day's start, or the
  // last time someone pressed "end round" — whichever is later). Shuttles logged
  // before this belong to a previous round and drop out of the live view, but debts
  // (playerOwed) are always computed from all-time data, never from this cutoff.
  currentRoundStart: string;
};

export type BackupData = {
  price?: number;
  maxShuttleNumber?: number;
  dayResetHour?: number;
  dayResetEnabled?: boolean;
  roundStartAt?: string | null;
  roster?: Array<{
    id: number;
    name: string;
    payments?: Array<{ amount: number; shuttleCount?: number; at?: string | null }>;
  }>;
  todayIds?: number[];
  leftTodayIds?: number[];
  shuttles?: Array<{
    id: number;
    numbers?: string[];
    number?: string | number;
    playerIds: number[];
    date: string;
    createdAt?: string;
  }>;
};
