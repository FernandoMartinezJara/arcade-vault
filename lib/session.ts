// Mock session and scores persisted in localStorage (same keys as the template).
import { useSyncExternalStore } from "react";

export interface User {
  name: string; // máx. 10 caracteres, en mayúsculas
}

export interface ScoreEntry {
  game: string; // Game.id
  score: number;
  name: string; // iniciales escritas en el modal (máx. 10, mayúsculas)
  at: number; // Date.now()
}

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: keep working without persisting.
  }
}

// useSyncExternalStore needs a stable snapshot, so cache the parsed user per raw value.
let cachedRaw: string | null = null;
let cachedUser: User | null = null;

function getUserSnapshot(): User | null {
  const raw = read(USER_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedUser = raw ? (JSON.parse(raw) as User) : null;
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
}

function getServerSnapshot(): User | null {
  return null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === USER_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useUser(): User | null {
  return useSyncExternalStore(subscribe, getUserSnapshot, getServerSnapshot);
}

export function login(user: User): void {
  write(USER_KEY, JSON.stringify(user));
  notify();
}

export function logout(): void {
  write(USER_KEY, null);
  notify();
}

function readScores(): ScoreEntry[] {
  try {
    const parsed: unknown = JSON.parse(read(SCORES_KEY) || "[]");
    return Array.isArray(parsed) ? (parsed as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveScore(entry: Omit<ScoreEntry, "at">): void {
  const all = readScores();
  all.push({ ...entry, at: Date.now() });
  write(SCORES_KEY, JSON.stringify(all));
}

export function getBestScore(gameId: string, name: string): number | null {
  const scores = readScores()
    .filter((s) => s.game === gameId && s.name === name)
    .map((s) => s.score);
  return scores.length ? Math.max(...scores) : null;
}
