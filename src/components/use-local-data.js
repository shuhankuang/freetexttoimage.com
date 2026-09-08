"use client";

import { useMemo, useSyncExternalStore } from "react";

function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener("forma:data", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("forma:data", callback);
  };
}

export function useLocalData(key) {
  const raw = useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(key) || "null"; } catch { return "null"; }
  }, () => null);
  return useMemo(() => {
    try { return { ready: raw !== null, value: JSON.parse(raw) }; }
    catch { return { ready: true, value: null }; }
  }, [raw]);
}
