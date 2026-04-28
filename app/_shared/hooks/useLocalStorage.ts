"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drop-in replacement for useState that persists the value in localStorage.
 * Safe for SSR — falls back to the initialValue during server render.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Always start with initialValue so server and first client render match.
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  // Track whether we've finished reading from localStorage yet.
  const hydrated = useRef(false);

  // Hydrate from localStorage after mount (client only)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        setStoredValue(JSON.parse(raw) as T);
      }
    } catch {
      // Corrupted data — keep initialValue
    }
    hydrated.current = true;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync to localStorage whenever the value changes — but only after hydration,
  // so we never overwrite stored data with the initialValue on first mount.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // Quota exceeded or private browsing — silently ignore
    }
  }, [key, storedValue]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const next =
        typeof value === "function" ? (value as (p: T) => T)(prev) : value;
      return next;
    });
  }, []);

  return [storedValue, setValue];
}
