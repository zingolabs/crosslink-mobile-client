/**
 * @format
 */

import 'react-native';

import 'react-native';

import { IndexerNetworkEnum, GlobalConst } from '../app/AppState';
import {
  discoverIndexers,
  probeIndexer,
  selectBestIndexer,
  hostOf,
} from '../app/indexers';
import RPCModule from '../app/RPCModule';

const report = (uris: string[]) =>
  JSON.stringify({
    indexers: uris.map((uri, i) => ({
      uri,
      latency_ms: 10 + i,
      tip_height: 82439,
      tip_age_secs: 12,
      source: i === 0 ? 'builtin' : 'peer',
    })),
    errors: [],
  });

describe('Indexers - test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('discoverIndexers probes the stable network by default', async () => {
    (RPCModule.discoverIndexers as jest.Mock).mockResolvedValue(
      report(['http://88.198.67.189:18234']),
    );
    const { indexers, errors } = await discoverIndexers();
    expect(RPCModule.discoverIndexers).toHaveBeenCalledWith(
      IndexerNetworkEnum.stable,
    );
    expect(errors).toEqual([]);
    expect(indexers).toEqual([
      {
        uri: 'http://88.198.67.189:18234',
        latencyMs: 10,
        tipHeight: 82439,
        tipAgeSecs: 12,
        fromPeers: false,
      },
    ]);
  });

  test('discoverIndexers passes an explicit nightly selection through', async () => {
    (RPCModule.discoverIndexers as jest.Mock).mockResolvedValue(
      report(['http://45.32.186.234:18234']),
    );
    await discoverIndexers(IndexerNetworkEnum.nightly);
    expect(RPCModule.discoverIndexers).toHaveBeenCalledWith(
      IndexerNetworkEnum.nightly,
    );
  });

  test('discoverIndexers keeps an error response as an error', async () => {
    (RPCModule.discoverIndexers as jest.Mock).mockResolvedValue(
      `${GlobalConst.error} no indexer answered`,
    );
    const { indexers, errors } = await discoverIndexers();
    expect(indexers).toEqual([]);
    expect(errors).toHaveLength(1);
  });

  test('probeIndexer answers the first probed indexer or null', async () => {
    (RPCModule.probeIndexer as jest.Mock).mockResolvedValue(
      report(['http://70.34.220.94:18234']),
    );
    const found = await probeIndexer('http://70.34.220.94:18234');
    expect(RPCModule.probeIndexer).toHaveBeenCalledWith(
      'http://70.34.220.94:18234',
      IndexerNetworkEnum.stable,
    );
    expect(found?.uri).toBe('http://70.34.220.94:18234');
    (RPCModule.probeIndexer as jest.Mock).mockResolvedValue(
      JSON.stringify({ indexers: [], errors: ['down'] }),
    );
    expect(await probeIndexer('http://70.34.220.94:18234')).toBeNull();
  });

  test('selectBestIndexer answers the chosen uri and null on error', async () => {
    (RPCModule.selectBestIndexer as jest.Mock).mockResolvedValue(
      'http://88.198.67.189:18234/',
    );
    expect(await selectBestIndexer()).toBe('http://88.198.67.189:18234/');
    expect(RPCModule.selectBestIndexer).toHaveBeenCalledWith(
      IndexerNetworkEnum.stable,
    );
    (RPCModule.selectBestIndexer as jest.Mock).mockResolvedValue(
      `${GlobalConst.error} no indexer answered the probe`,
    );
    expect(await selectBestIndexer(IndexerNetworkEnum.nightly)).toBeNull();
  });

  test('hostOf keeps the host of a uri with or without scheme', () => {
    expect(hostOf('http://88.198.67.189:18234')).toBe('88.198.67.189');
    expect(hostOf('88.198.67.189:18234')).toBe('88.198.67.189');
    expect(hostOf('not a uri')).toBe('not a uri');
  });
});
