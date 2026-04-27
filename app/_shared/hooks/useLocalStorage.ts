"use client";

import { useCallback, useEffect, useState } from "react"; // useCallback kept for setValue

/**
 * Drop-in replacement for useState that persists the value in localStorage.
 * Safe for SSR — falls back to the initialValue during server render.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Always start with initialValue so server and first client render match.
  // localStorage is hydrated in a useEffect (client-only) to avoid mismatch.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

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
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync to localStorage whenever the value changes (skip first render = initialValue)
  useEffect(() => {
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
