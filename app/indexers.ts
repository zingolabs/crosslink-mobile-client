import { GlobalConst, IndexerNetworkEnum } from './AppState';
import RPCModule from './RPCModule';

export { IndexerNetworkEnum };

export type Indexer = {
  uri: string;
  latencyMs: number;
  tipHeight: number | null;
  tipAgeSecs: number | null;
  fromPeers: boolean;
};

export type IndexerReport = {
  indexers: Indexer[];
  errors: string[];
};

export type Discover = (network?: IndexerNetworkEnum) => Promise<IndexerReport>;
export type Probe = (
  uri: string,
  network?: IndexerNetworkEnum,
) => Promise<Indexer | null>;
export type SelectBest = (
  network?: IndexerNetworkEnum,
) => Promise<string | null>;

type RawIndexer = {
  uri: string;
  latency_ms: number;
  tip_height: number | null;
  tip_age_secs: number | null;
  source: string;
};

type RawReport = {
  indexers: RawIndexer[];
  errors: string[];
};

const fromRaw = (raw: RawIndexer): Indexer => ({
  uri: raw.uri,
  latencyMs: raw.latency_ms,
  tipHeight: raw.tip_height,
  tipAgeSecs: raw.tip_age_secs,
  fromPeers: raw.source === 'peer',
});

export const parseIndexerReport = (resp: string): IndexerReport => {
  if (!resp || resp.toLowerCase().startsWith(GlobalConst.error)) {
    return { indexers: [], errors: [resp || 'Error: empty response'] };
  }
  try {
    const raw = JSON.parse(resp) as RawReport;
    return { indexers: raw.indexers.map(fromRaw), errors: raw.errors };
  } catch (e) {
    return {
      indexers: [],
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }
};

export const discoverIndexers: Discover = async (
  network = IndexerNetworkEnum.stable,
) => parseIndexerReport(await RPCModule.discoverIndexers(network));

export const probeIndexer: Probe = async (
  uri,
  network = IndexerNetworkEnum.stable,
) =>
  parseIndexerReport(await RPCModule.probeIndexer(uri, network)).indexers[0] ??
  null;

export const selectBestIndexer: SelectBest = async (
  network = IndexerNetworkEnum.stable,
) => {
  const uri: string = await RPCModule.selectBestIndexer(network);
  if (!uri || uri.toLowerCase().startsWith(GlobalConst.error)) {
    return null;
  }
  return uri;
};

export const hostOf = (uri: string) => {
  try {
    return new URL(uri.includes('://') ? uri : `http://${uri}`).hostname;
  } catch {
    return uri;
  }
};
