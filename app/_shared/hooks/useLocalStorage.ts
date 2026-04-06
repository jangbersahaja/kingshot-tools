"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Drop-in replacement for useState that persists the value in localStorage.
 * Safe for SSR — falls back to the initialValue during server render.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Read from localStorage lazily (only on the client)
  const readStored = useCallback((): T => {
    if (typeof window === "undefined") return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const [storedValue, setStoredValue] = useState<T>(readStored);

  // Sync to localStorage whenever the value changes
  useEffect(() => {
    if (typeof window === "undefined") return;
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
