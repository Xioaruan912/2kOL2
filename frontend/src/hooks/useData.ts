import { useEffect, useState } from "react";
import {
  getCatalog,
  getDataMode,
  getPlayerDetail,
  getPriceHistory,
  subscribeDataMode,
} from "../data/repository";
import type { DataSourceMode, PlayerDetail, PlayerSummary, PriceHistory } from "../data/types";

interface CatalogState {
  catalog: PlayerSummary[] | null;
  loading: boolean;
  error: string | null;
}

export function useCatalog(): CatalogState & { reload: () => void } {
  const [state, setState] = useState<CatalogState>({ catalog: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    getCatalog()
      .then((catalog) => {
        if (alive) setState({ catalog, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (alive) {
          setState({
            catalog: null,
            loading: false,
            error: error instanceof Error ? error.message : "球员数据加载失败",
          });
        }
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  return { ...state, reload: () => setTick((value) => value + 1) };
}

interface DetailState {
  detail: PlayerDetail | null;
  loading: boolean;
  error: string | null;
}

export function usePlayerDetail(id: string | undefined): DetailState & { reload: () => void } {
  const [state, setState] = useState<DetailState>({ detail: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) {
      setState({ detail: null, loading: false, error: "缺少球员 ID" });
      return;
    }
    let alive = true;
    setState({ detail: null, loading: true, error: null });
    getPlayerDetail(id)
      .then((detail) => {
        if (alive) setState({ detail, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (alive) {
          setState({
            detail: null,
            loading: false,
            error: error instanceof Error ? error.message : "球员详情加载失败",
          });
        }
      });
    return () => {
      alive = false;
    };
  }, [id, tick]);

  return { ...state, reload: () => setTick((value) => value + 1) };
}

export function useDataMode(): DataSourceMode {
  const [mode, setMode] = useState<DataSourceMode>(getDataMode());
  useEffect(() => subscribeDataMode(() => setMode(getDataMode())), []);
  return mode;
}


interface PriceHistoryState {
  history: PriceHistory | null;
  loading: boolean;
  error: string | null;
}

export function usePriceHistory(
  id: string | undefined,
  days: number,
): PriceHistoryState & { reload: () => void } {
  const [state, setState] = useState<PriceHistoryState>({ history: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) {
      setState({ history: null, loading: false, error: "缺少球员 ID" });
      return;
    }
    let alive = true;
    setState({ history: null, loading: true, error: null });
    getPriceHistory(id, days)
      .then((history) => {
        if (alive) setState({ history, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (alive) {
          setState({
            history: null,
            loading: false,
            error: error instanceof Error ? error.message : "身价走势加载失败",
          });
        }
      });
    return () => {
      alive = false;
    };
  }, [id, days, tick]);

  return { ...state, reload: () => setTick((value) => value + 1) };
}
