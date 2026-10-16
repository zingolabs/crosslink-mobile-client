import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { IndexerList } from '../../utils/Utils';
import { pingIndexerServer } from '../../selectingServer';

export type Probe =
  | { state: 'checking' }
  | { state: 'online'; latency: number }
  | { state: 'offline' };

export type Probes = Record<string, Probe>;

export const withScheme = (url: string) =>
  url.includes('://') ? url : `http://${url}`;

const defaultPing = (uri: string) => pingIndexerServer(uri, 3000);

export const fastestIndexer = async (
  indexerList: IndexerList,
  pingServer: (uri: string) => Promise<number | null> = defaultPing,
): Promise<string | null> => {
  const results = await Promise.all(
    indexerList.map(async i => ({
      url: i.url,
      latency: await pingServer(withScheme(i.url)),
    })),
  );
  const online = results.filter(
    (r): r is { url: string; latency: number } => r.latency !== null,
  );
  online.sort((a, b) => a.latency - b.latency);
  return online[0]?.url ?? null;
};

const settledIn = (probes: Probes, url: string) =>
  !!probes[url] && probes[url].state !== 'checking';

export const useIndexerProbes = (
  indexerList: IndexerList,
  pingServer: (uri: string) => Promise<number | null> = defaultPing,
  initial: Probes = {},
) => {
  const [probes, setProbes] = useState<Probes>(initial);
  const [order, setOrder] = useState<string[] | null>(null);
  const runRef = useRef(0);

  const probe = useCallback(
    (urls: string[]) => {
      const run = ++runRef.current;
      setProbes(prev => ({
        ...prev,
        ...Object.fromEntries(urls.map(u => [u, { state: 'checking' }])),
      }));
      urls.forEach(async url => {
        const latency = await pingServer(withScheme(url));
        if (run !== runRef.current) {
          return;
        }
        setProbes(prev => ({
          ...prev,
          [url]:
            latency === null
              ? { state: 'offline' }
              : { state: 'online', latency },
        }));
      });
    },
    [pingServer],
  );

  const probeAll = useCallback(
    () => probe(indexerList.map(i => i.url)),
    [probe, indexerList],
  );

  const cancel = useCallback(() => {
    runRef.current++;
  }, []);

  useEffect(() => {
    const pending = indexerList
      .map(i => i.url)
      .filter(url => !settledIn(initial, url));
    if (pending.length > 0) {
      probe(pending);
    }
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probe, cancel, indexerList]);

  const online = useMemo(
    () =>
      indexerList
        .filter(i => probes[i.url]?.state === 'online')
        .sort(
          (a, b) =>
            (probes[a.url] as { latency: number }).latency -
            (probes[b.url] as { latency: number }).latency,
        ),
    [indexerList, probes],
  );
  const settled =
    indexerList.length > 0 && indexerList.every(i => settledIn(probes, i.url));
  const fastest = online[0]?.url ?? null;

  useEffect(() => {
    if (settled && order === null) {
      setOrder([
        ...online.map(i => i.url),
        ...indexerList
          .filter(i => probes[i.url]?.state === 'offline')
          .map(i => i.url),
      ]);
    }
  }, [settled, order, online, indexerList, probes]);

  const ordered = useMemo(() => {
    if (order === null) {
      return indexerList;
    }
    const byUrl = new Map(indexerList.map(i => [i.url, i]));
    return order.map(url => byUrl.get(url)!).filter(Boolean);
  }, [order, indexerList]);

  const latencyOf = (url: string) => {
    const p = probes[url];
    return p?.state === 'online' ? p.latency : null;
  };

  return { probes, ordered, online, settled, fastest, probeAll, latencyOf };
};
