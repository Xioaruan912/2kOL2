import { useCallback, useEffect, useState } from "react";

type Listener = () => void;

/** 基于 localStorage 的轻量外部 store，多个组件之间自动同步 */
export function createStoredList(key: string, validate?: (values: string[]) => string[]) {
  const listeners = new Set<Listener>();
  let cache: string[] | null = null;

  const read = (): string[] => {
    if (cache) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      cache = validate ? validate(Array.isArray(parsed) ? parsed : []) : Array.isArray(parsed) ? parsed : [];
    } catch {
      cache = [];
    }
    return cache;
  };

  const write = (next: string[]) => {
    cache = next;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // 隐私模式下写入失败不阻塞交互
    }
    listeners.forEach((listener) => listener());
  };

  return {
    get: read,
    set: write,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    use(): [string[], (next: string[]) => void] {
      const [value, setValue] = useState<string[]>(read);
      useEffect(() => {
        setValue(read());
        return this.subscribe(() => setValue(read()));
      }, []);
      return [value, write];
    },
  };
}

export const favoritesStore = createStoredList("courtside.favorites.v1");
export const compareStore = createStoredList("courtside.compare.v1", (list) =>
  Array.from(new Set(list)).slice(0, 3),
);

export function useFavorites() {
  const [ids, setIds] = favoritesStore.use();
  const toggle = useCallback(
    (id: string) => {
      const current = favoritesStore.get();
      favoritesStore.set(
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      );
    },
    [],
  );
  return { ids, setIds, toggle, isFavorite: (id: string) => ids.includes(id) };
}

export function useCompare() {
  const [ids, setIds] = compareStore.use();
  const toggle = useCallback((id: string) => {
    const current = compareStore.get();
    if (current.includes(id)) {
      compareStore.set(current.filter((item) => item !== id));
      return { ok: true as const };
    }
    if (current.length >= 3) {
      return { ok: false as const, reason: "最多同时对比 3 名球员" };
    }
    compareStore.set([...current, id]);
    return { ok: true as const };
  }, []);
  const clear = useCallback(() => compareStore.set([]), []);
  return { ids, setIds, toggle, clear, has: (id: string) => ids.includes(id) };
}

/* ------------------------------------------------------------------ Toast */

export interface ToastMessage {
  id: number;
  text: string;
  tone: "neutral" | "accent" | "danger";
}

let toastSeq = 0;
let toasts: ToastMessage[] = [];
const toastListeners = new Set<Listener>();

export function pushToast(text: string, tone: ToastMessage["tone"] = "neutral") {
  toastSeq += 1;
  const toast: ToastMessage = { id: toastSeq, text, tone };
  toasts = [...toasts, toast].slice(-3);
  toastListeners.forEach((listener) => listener());
  window.setTimeout(() => {
    toasts = toasts.filter((item) => item.id !== toast.id);
    toastListeners.forEach((listener) => listener());
  }, 2600);
}

export function useToasts(): ToastMessage[] {
  const [value, setValue] = useState<ToastMessage[]>(toasts);
  useEffect(() => {
    setValue(toasts);
    const unsub = (() => {
      const listener = () => setValue(toasts);
      toastListeners.add(listener);
      return () => toastListeners.delete(listener);
    })();
    return () => {
      unsub();
    };
  }, []);
  return value;
}
