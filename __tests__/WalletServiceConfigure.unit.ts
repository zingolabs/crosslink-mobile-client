/**
 * @format
 */

import WalletService from '../app/wallet/WalletService';
import { PerformanceLevelEnum } from '../app/wallet/enums';

jest.mock('../app/RPCModule/RPCModule', () => ({}));

const buildService = (): WalletService =>
  new WalletService({
    readOnly: false,
    indexerServer: { uri: 'http://localhost', chainName: 'test' } as any,
    performanceLevel: PerformanceLevelEnum.Medium,
    recoverWallet: jest.fn(),
  });

const never = (): Promise<never> => new Promise(() => undefined);

describe('WalletService.configure', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('starts the periodic update timer before the initial fetches finish', async () => {
    jest.useFakeTimers();
    const service = buildService();

    // the server is not answering; every fetch hangs
    jest
      .spyOn(service, 'fetchTandZandOValueTransfers')
      .mockImplementation(never);
    jest.spyOn(service, 'fetchAddresses').mockImplementation(never);
    jest.spyOn(service, 'fetchTotalBalance').mockImplementation(never);
    jest.spyOn(service, 'fetchStaked').mockImplementation(never);
    jest.spyOn(service, 'fetchInfoAndServerHeight').mockImplementation(never);
    jest.spyOn(service, 'fetchZingolibVersion').mockImplementation(never);
    jest.spyOn(service, 'fetchTandZandOMessages').mockImplementation(never);
    jest.spyOn(service, 'fetchWalletHeight').mockImplementation(never);
    jest
      .spyOn(service, 'fetchWalletBirthdaySeedUfvk')
      .mockImplementation(never);

    const configured = service.configure();

    // the 5 second update interval must already be running while the
    // fetches are still in flight
    expect((service as any).updateTimerID).toBeDefined();

    // the hanging fetches never settle, so `configured` is still pending
    // here — that is the point of the test
    expect(configured).toBeInstanceOf(Promise);

    await service.clearTimers();
    jest.clearAllTimers();
  });

  test('configures once even when a fetch rejects unexpectedly', async () => {
    const service = buildService();
    jest
      .spyOn(service, 'fetchTandZandOValueTransfers')
      .mockRejectedValue(new Error('unexpected'));
    for (const name of [
      'fetchAddresses',
      'fetchTotalBalance',
      'fetchStaked',
      'fetchInfoAndServerHeight',
      'fetchZingolibVersion',
      'fetchTandZandOMessages',
      'fetchWalletHeight',
      'fetchWalletBirthdaySeedUfvk',
    ] as const) {
      jest.spyOn(service, name).mockResolvedValue(undefined);
    }

    await expect(service.configure()).resolves.toBeUndefined();
    await service.clearTimers();
  });
});
