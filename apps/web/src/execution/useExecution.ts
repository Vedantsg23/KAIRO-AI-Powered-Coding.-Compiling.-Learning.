import { useCallback, useEffect, useRef, useState } from "react";
import { api, watchExecution } from "../api/client";
import type { Execution } from "../api/types";

/**
 * Submits a run and follows it to the end. Only the latest run is followed:
 * starting a new one stops watching the previous one.
 */
export function useExecution() {
  const [execution, setExecution] = useState<Execution | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const stopWatching = useRef<(() => void) | null>(null);

  const run = useCallback(async (languageId: string, source: string, stdin: string) => {
    stopWatching.current?.();
    setSubmitting(true);
    try {
      const accepted = await api.createExecution({ languageId, source, stdin });
      setExecution(accepted);
      stopWatching.current = watchExecution(accepted.id, (update) =>
        setExecution((current) => (current && current.id !== update.id ? current : update)),
      );
      return accepted;
    } finally {
      setSubmitting(false);
    }
  }, []);

  useEffect(() => () => stopWatching.current?.(), []);

  const busy = submitting || (execution !== null && !execution.terminal);
  return { execution, busy, run };
}
