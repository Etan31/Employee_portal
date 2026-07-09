import { useEffect, useState } from "react";
import { logError } from "../utils/logger.js";

/**
 * Load a data module lazily via dynamic import.
 * Usage: const { data, loading, error } = useAsyncData(() => import("../data/policies.js"));
 * `data` is the module namespace (destructure its named exports).
 */
export function useAsyncData(loader) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    loader()
      .then((mod) => {
        if (active) setState({ data: mod, loading: false, error: null });
      })
      .catch((error) => {
        logError("Data load failed:", error);
        if (active) setState({ data: null, loading: false, error });
      });
    return () => {
      active = false;
    };
    // loader is expected to be a stable inline import call; run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
