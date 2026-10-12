// Mock session persisted in localStorage (same key as the template). Scores live in Supabase.
import { useSyncExternalStore } from "react";

export interface User {
  name: string; // máx. 10 caracteres, en mayúsculas
}

const USER_KEY = "av_user";

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
