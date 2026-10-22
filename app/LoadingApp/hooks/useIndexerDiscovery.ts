import { useCallback, useEffect, useRef, useState } from 'react';

import { Discover, IndexerReport, discoverIndexers } from '../../indexers';

export const useIndexerDiscovery = (
  discover: Discover = discoverIndexers,
  initial?: IndexerReport,
) => {
  const [report, setReport] = useState<IndexerReport | null>(initial ?? null);
  const [discovering, setDiscovering] = useState(initial === undefined);
  const runRef = useRef(0);
  const startedRef = useRef(initial !== undefined);

  const refresh = useCallback(async () => {
    const run = ++runRef.current;
    setDiscovering(true);
    const next = await discover();
    if (run !== runRef.current) {
      return;
    }
    setReport(next);
    setDiscovering(false);
  }, [discover]);

  const cancel = useCallback(() => {
    runRef.current++;
  }, []);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      refresh();
    }
    return cancel;
  }, [refresh, cancel]);

  const indexers = report?.indexers ?? [];
  return { report, indexers, discovering, refresh };
};
