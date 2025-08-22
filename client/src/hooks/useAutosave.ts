// Shared, generic autosave with debounce + statuses.
import { useEffect, useMemo, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

function debounce<F extends (...args: any[]) => void>(fn: F, ms: number) {
  let t: any;
  return (...args: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function useAutosaveObject<T extends object>(
  initial: T,
  saveFn: (next: T) => Promise<any>,
  debounceMs = 400
) {
  const [value, setValue] = useState<T>(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const latest = useRef(value);

  useEffect(() => { 
    setValue(initial); 
    latest.current = initial;
  }, [JSON.stringify(initial)]);

  const doSave = useMemo(() => debounce(async (next: T) => {
    setStatus("saving");
    try {
      await saveFn(next);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1200);
    } catch (error) {
      console.error('Autosave failed:', error);
      setStatus("error");
    }
  }, debounceMs), [saveFn, debounceMs]);

  const update = (patch: Partial<T>) => {
    const next = { ...latest.current, ...patch } as T;
    latest.current = next;
    setValue(next);
    doSave(next);
  };

  return { value, setValue, update, status };
}