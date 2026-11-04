import {
  TotalBalanceClass,
  InfoType,
  SendJsonToTypeType,
  WalletType,
  ChainNameEnum,
  CurrencyNameEnum,
  AddressKindEnum,
  GlobalConst,
  ValueTransferType,
  UnifiedAddressClass,
  TransparentAddressClass,
  ValueTransferKindEnum,
  ServerType,
  StakeType,
  StakingActionType,
  WalletBondsType,
  StakingActionKindEnum,
  IndexerNetworkEnum,
} from '../AppState';
import RPCModule from '../RPCModule';
import WalletBondsInfoType, {
  BalancesType,
  ConfigWalletPerformanceType,
  SendProposeType,
  SendType,
  SeedType,
  SpendablebalanceType,
  StakedType,
  SyncPollType,
  SyncStatusType,
  TransparentAddressType,
  UnifiedAddressType,
  ValueTransfersType,
  WalletHeight,
  WalletInfoType,
  WalletValueTransferType,
  WalletVersionType,
  WalletZecPriceType,
} from './types';
import {
  PerformanceLevelEnum,
  ValueTransferStatusEnum,
  WalletValueTransferKindEnum,
} from './enums';
import { StakeJsonToTypeType } from '../AppState/types/ValueTransferType';
import { reverseHex32Bytes } from '../utils/hex';
import { WalletBondsStatusEnum } from '../AppState/enums/WalletBondsStatusEnum';
import { keepAwake } from '../keepAwake';
import { read } from '../store/appStore';
import {
  setAllAddresses,
  setGlobalStaked,
  setInfo,
  setLastError,
  setStaked,
  setSyncingStatus,
  setTotalBalance,
  setValueTransfersList,
  setWallet,
  setWalletBonds,
  setZingolibVersion,
} from './walletUpdates';

export type WalletServiceOptions = {
  readOnly: boolean;
  indexerServer: ServerType;
  performanceLevel: PerformanceLevelEnum;
  recoverWallet: (seed: string, birthday: number) => Promise<void>;
};

export default class WalletService {
  recoverWallet: (seed: string, birthday: number) => Promise<void>;

  updateTimerID?: NodeJS.Timeout;

  lastWalletBlockHeight: number;
  lastServerBlockHeight: number;
  /** Last info fetched successfully; reused when the server cannot be reached. */
  lastGoodInfo: InfoType | null;
  walletBirthday: number;
  walletSeed: string;
  UFVK: string;

  fetchWalletHeightLock: boolean;
  fetchWalletBirthdaySeedUfvkLock: boolean;
  fetchInfoAndServerHeightLock: boolean;
  fetchTandZandOValueTransfersLock: boolean;
  fetchTotalBalanceLock: boolean;
  fetchStakedLock: boolean;
  fetchAddressesLock: boolean;
  refreshSyncLock: boolean;
  fetchSyncStatusLock: boolean;
  fetchSyncPollLock: boolean;
  fetchZingolibVersionLock: boolean;
  getWalletSaveRequiredLock: boolean;

  inSend: boolean;

  timers: NodeJS.Timeout[];

  readOnly: boolean;
  indexerServer: ServerType;
  performanceLevel: PerformanceLevelEnum;

  walletConfigPerformanceLevel: PerformanceLevelEnum | undefined;

  blockTimes: number[];
  lastBlockTimestamp: number | null;
  lastKnownBlock: number | null;

  constructor({
    readOnly,
    indexerServer,
    performanceLevel,
    recoverWallet,
  }: WalletServiceOptions) {
    this.recoverWallet = recoverWallet;
    this.blockTimes = [
      indexerServer.chainName === ChainNameEnum.regtestChainName ? 10 : 30,
    ];
    this.lastBlockTimestamp = null;
    this.lastKnownBlock = null;

    this.lastWalletBlockHeight = 0;
    this.lastServerBlockHeight = 0;
    this.lastGoodInfo = null;
    this.walletBirthday = 0;
    this.walletSeed = '';
    this.UFVK = '';

    this.fetchWalletHeightLock = false;
    this.fetchWalletBirthdaySeedUfvkLock = false;
    this.fetchInfoAndServerHeightLock = false;
    this.fetchTandZandOValueTransfersLock = false;
    this.fetchTotalBalanceLock = false;
    this.fetchStakedLock = false;
    this.fetchAddressesLock = false;
    this.refreshSyncLock = false;
    this.fetchSyncStatusLock = false;
    this.fetchSyncPollLock = false;
    this.fetchZingolibVersionLock = false;
    this.getWalletSaveRequiredLock = false;

    this.inSend = false;

    this.timers = [];

    this.readOnly = readOnly;
    this.indexerServer = indexerServer;
    this.performanceLevel = performanceLevel;
  }

  static async rpcGetZecPrice(
    withTOR: boolean,
  ): Promise<{ price: number; error: string }> {
    try {
      // create the tor client if needed
      if (withTOR) {
        const result: string = await RPCModule.createTorClientProcess();
        if (result && result.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Create Tor client error: ${result}`);
        }
      }
      // values:
      // 0   - initial/default value
      // -1  - error in zingolib.
      // -2  - error in RPCModule, likely.
      // > 0 - real value
      const start = Date.now();
      const resultStr: string = await RPCModule.zecPriceInfo(
        withTOR ? GlobalConst.true : GlobalConst.false,
      );
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > get ZEC price - ',
          Date.now() - start,
        );
      }
      //console.log(resultStr);

      if (resultStr) {
        if (resultStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error fetching price ${resultStr}`);
          return { price: -1, error: resultStr };
        } else {
          const resultJSON: WalletZecPriceType = await JSON.parse(resultStr);
          if (resultJSON.error) {
            console.log(`Error fetching price ${resultJSON.error}`);
            return { price: -1, error: resultJSON.error };
          }
          if (!resultJSON.current_price) {
            // if no exists the field or is empty
            return { price: 0, error: '' };
          }
          if (resultJSON.current_price && isNaN(resultJSON.current_price)) {
            console.log(`Error fetching price ${resultJSON.current_price}`);
            return {
              price: -1,
              error: `Error fetching price ${resultJSON.current_price}`,
            };
          } else {
            return { price: resultJSON.current_price, error: '' };
          }
        }
      } else {
        console.log('Internal Error fetching price');
        return { price: -2, error: 'Internal Error fetching price' };
      }
    } catch (error) {
      console.log(`Critical Error fetching price ${error}`);
      return { price: -2, error: `Critical Error fetching price ${error}` };
    }
  }

  static async rpcShieldFunds(): Promise<string> {
    try {
      const shieldStr: string = await RPCModule.confirmProcess();
      //console.log(shieldStr);
      if (shieldStr) {
        if (shieldStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error shield ${shieldStr}`);
          return shieldStr;
        }
      } else {
        console.log('Internal Error shield ');
        return 'Error: Internal RPC Error: shield ';
      }

      return shieldStr;
    } catch (error) {
      console.log(`Critical Error shield ${error}`);
      return `Error: ${error}`;
    }
  }

  static async rpcFetchWallet(readOnly: boolean): Promise<WalletType> {
    if (readOnly) {
      // only viewing key & birthday
      try {
        const start = Date.now();
        const ufvkStr: string = await RPCModule.getUfvkInfo();
        if (Date.now() - start > 4000) {
          console.log(
            '=========================================== > get ufvk - ',
            Date.now() - start,
          );
        }
        if (ufvkStr) {
          if (ufvkStr.toLowerCase().startsWith(GlobalConst.error)) {
            console.log(`Error ufvk ${ufvkStr}`);
            return {} as WalletType;
          }
        } else {
          console.log('Internal Error ufvk');
          return {} as WalletType;
        }
        const RPCufvk: WalletType = await JSON.parse(ufvkStr);

        const wallet: WalletType = {} as WalletType;
        if (RPCufvk.birthday) {
          wallet.birthday = RPCufvk.birthday;
        }
        if (RPCufvk.ufvk) {
          wallet.ufvk = RPCufvk.ufvk;
        }

        return wallet;
      } catch (error) {
        console.log(`Critical Error ufvk ${error}`);
        return {} as WalletType;
      }
    } else {
      // only seed & birthday
      try {
        const start2 = Date.now();
        const seedStr: string = await RPCModule.getSeedInfo();
        if (Date.now() - start2 > 4000) {
          console.log(
            '=========================================== > get seed - ',
            Date.now() - start2,
          );
        }
        if (seedStr) {
          if (seedStr.toLowerCase().startsWith(GlobalConst.error)) {
            console.log(`Error seed ${seedStr}`);
            return {} as WalletType;
          }
        } else {
          console.log('Internal Error seed');
          return {} as WalletType;
        }
        const RPCseed: SeedType = await JSON.parse(seedStr);

        const wallet: WalletType = {} as WalletType;
        if (RPCseed.seed_phrase) {
          wallet.seed = RPCseed.seed_phrase;
        }
        if (RPCseed.birthday) {
          wallet.birthday = RPCseed.birthday;
        }

        return wallet;
      } catch (error) {
        console.log(`Critical Error seed ${error}`);
        return {} as WalletType;
      }
    }
  }

  static async walletExists(): Promise<string> {
    return RPCModule.walletExists();
  }

  static async doSave(): Promise<string> {
    return RPCModule.doSave();
  }

  static async setCryptoDefaultProvider(): Promise<string> {
    return RPCModule.setCryptoDefaultProvider();
  }

  static async getVersionInfo(): Promise<string> {
    return RPCModule.getVersionInfo();
  }

  static async walletKindInfo(): Promise<string> {
    return RPCModule.walletKindInfo();
  }

  static async createTorClientProcess(): Promise<string> {
    return RPCModule.createTorClientProcess();
  }

  static async removeTorClientProcess(): Promise<string> {
    return RPCModule.removeTorClientProcess();
  }

  static async changeServerProcess(serverUri: string): Promise<string> {
    return RPCModule.changeServerProcess(serverUri);
  }

  static async setConfigWalletToProdProcess(
    performanceLevel: PerformanceLevelEnum,
    minConfirmations: string,
  ): Promise<string> {
    return RPCModule.setConfigWalletToProdProcess(
      performanceLevel,
      minConfirmations,
    );
  }

  static async loadExistingWallet(
    serverUri: string,
    chainName: string,
    performanceLevel: PerformanceLevelEnum,
    minConfirmations: string,
  ): Promise<string> {
    return RPCModule.loadExistingWallet(
      serverUri,
      chainName,
      performanceLevel,
      minConfirmations,
    );
  }

  static async createNewWallet(
    serverUri: string,
    chainName: string,
    performanceLevel: PerformanceLevelEnum,
    minConfirmations: string,
  ): Promise<string> {
    return RPCModule.createNewWallet(
      serverUri,
      chainName,
      performanceLevel,
      minConfirmations,
    );
  }

  static async restoreWalletFromSeed(
    seed: string,
    birthday: string,
    serverUri: string,
    chainName: string,
    performanceLevel: PerformanceLevelEnum,
    minConfirmations: string,
  ): Promise<string> {
    return RPCModule.restoreWalletFromSeed(
      seed,
      birthday,
      serverUri,
      chainName,
      performanceLevel,
      minConfirmations,
    );
  }

  static async parseAddressInfo(address: string): Promise<string> {
    return RPCModule.parseAddressInfo(address);
  }

  static async getDonationAddress(): Promise<string> {
    return RPCModule.getDonationAddress();
  }

  static async getZenniesDonationAddress(): Promise<string> {
    return RPCModule.getZenniesDonationAddress();
  }

  static async discoverIndexers(network: IndexerNetworkEnum): Promise<string> {
    return RPCModule.discoverIndexers(network);
  }

  static async probeIndexer(
    uri: string,
    network: IndexerNetworkEnum,
  ): Promise<string> {
    return RPCModule.probeIndexer(uri, network);
  }

  static async selectBestIndexer(network: IndexerNetworkEnum): Promise<string> {
    return RPCModule.selectBestIndexer(network);
  }

  static async inspectWallet(
    data: string,
    serverUri: string,
    platform: string,
  ): Promise<string> {
    return RPCModule.inspectWallet(data, serverUri, platform);
  }

  static async getTotalValueToAddressInfo(): Promise<string> {
    return RPCModule.getTotalValueToAddressInfo();
  }

  static async getTotalSpendsToAddressInfo(): Promise<string> {
    return RPCModule.getTotalSpendsToAddressInfo();
  }

  static async getTotalMemobytesToAddressInfo(): Promise<string> {
    return RPCModule.getTotalMemobytesToAddressInfo();
  }

  static async createNewUnifiedAddressProcess(
    receivers: string,
  ): Promise<string> {
    return RPCModule.createNewUnifiedAddressProcess(receivers);
  }

  static async createNewTransparentAddressProcess(): Promise<string> {
    return RPCModule.createNewTransparentAddressProcess();
  }

  static async checkMyAddressInfo(address: string): Promise<string> {
    return RPCModule.checkMyAddressInfo(address);
  }

  static async sendProcess(proposeJSON: string): Promise<string> {
    return RPCModule.sendProcess(proposeJSON);
  }

  static async getSpendableBalanceWithAddressInfo(
    address: string,
    zenniesForZingo: string,
  ): Promise<string> {
    return RPCModule.getSpendableBalanceWithAddressInfo(
      address,
      zenniesForZingo,
    );
  }

  async runTaskPromises(): Promise<void> {
    //console.log('+++++++++++++++++ interval update 5 secs ALL', this.timers);
    this.sanitizeTimers();

    // this run only once.
    if (this.walletConfigPerformanceLevel !== this.performanceLevel) {
      const performance = await this.getConfigWalletPerformance();
      this.walletConfigPerformanceLevel = performance;
      console.log(
        '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ PERFORMANCE LEVEL',
        performance,
      );
      if (performance !== this.performanceLevel) {
        const setConfigWallet = await RPCModule.setConfigWalletToProdProcess(
          this.performanceLevel,
          GlobalConst.minConfirmations.toString(),
        );
        console.log(
          '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ SET CONFIG WALLET',
          setConfigWallet,
        );
        if (
          setConfigWallet &&
          setConfigWallet.toLowerCase().startsWith(GlobalConst.error)
        ) {
          setLastError(`Set wallet to prod error: ${setConfigWallet}`);
        }
        // I need to be sure in this point that the performance level is the selected setting
        await RPCModule.doSave();
        const performanceChanged = await this.getConfigWalletPerformance();
        this.walletConfigPerformanceLevel = performanceChanged;
        console.log(
          '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ PERFORMANCE LEVEL CHANGED',
          performanceChanged,
        );
      }
    }

    const taskPromises: Promise<void>[] = [];

    // always the App have to fetch this. staked info.
    taskPromises.push(
      new Promise<void>(async resolve => {
        //const s = Date.now();
        await this.fetchStaked();
        //console.log('staked - ', Date.now() - s);
        resolve();
      }),
    );
    // same here. staked balance.
    taskPromises.push(
      new Promise<void>(async resolve => {
        //const s = Date.now();
        await this.fetchTotalBalance();
        //console.log('balance - ', Date.now() - s);
        resolve();
      }),
    );

    // if the wallet needs to save, means the App needs to fetch all the new data
    //if (!(await this.getWalletSaveRequired())) {
    //  console.log('***************** NOT SAVE REQUIRED: No fetching data');
    // do need this because of the sync process
    //  taskPromises.push(
    //    new Promise<void>(async resolve => {
    //      await this.fetchSyncPoll();
    //      //console.log('INTERVAL poll sync');
    //      resolve();
    //    }),
    //  );
    //} else {
    if (
      this.getWalletSaveRequiredLock ||
      this.fetchWalletHeightLock ||
      this.fetchWalletBirthdaySeedUfvkLock ||
      this.fetchInfoAndServerHeightLock ||
      this.fetchAddressesLock ||
      this.fetchTandZandOValueTransfersLock ||
      this.fetchSyncStatusLock ||
      this.fetchSyncPollLock ||
      this.fetchZingolibVersionLock ||
      this.refreshSyncLock
    ) {
      console.log('***************** LONG TASKS: No fetching data');
      // do need this because of the sync process
      taskPromises.push(
        new Promise<void>(async resolve => {
          await this.fetchSyncPoll();
          //console.log('INTERVAL poll sync');
          resolve();
        }),
      );
    } else {
      // do need this because of the sync process
      taskPromises.push(
        new Promise<void>(async resolve => {
          await this.fetchSyncPoll();
          //console.log('INTERVAL poll sync');
          resolve();
        }),
      );
      taskPromises.push(
        new Promise<void>(async resolve => {
          //const s = Date.now();
          await this.fetchWalletHeight();
          //console.log('wallet height - ', Date.now() - s);
          resolve();
        }),
      );
      taskPromises.push(
        new Promise<void>(async resolve => {
          //const s = Date.now();
          await this.fetchWalletBirthdaySeedUfvk();
          //console.log('wallet birthday - ', Date.now() - s);
          resolve();
        }),
      );
      taskPromises.push(
        new Promise<void>(async resolve => {
          //const s = Date.now();
          await this.fetchInfoAndServerHeight();
          //console.log('info & server height - ', Date.now() - s);
          resolve();
        }),
      );
      taskPromises.push(
        new Promise<void>(async resolve => {
          //const s = Date.now();
          await this.fetchAddresses();
          //console.log('addresses - ', Date.now() - s);
          resolve();
        }),
      );
      // save the wallet as required.
      taskPromises.push(
        new Promise<void>(async resolve => {
          const start = Date.now();
          await RPCModule.doSave();
          if (Date.now() - start > 4000) {
            console.log(
              '=========================================== > save wallet - ',
              Date.now() - start,
            );
          }
          resolve();
        }),
      );
      taskPromises.push(
        new Promise<void>(async resolve => {
          //const s = Date.now();
          await this.fetchTandZandOValueTransfers();
          //console.log('value transfers - ', Date.now() - s);
          resolve();
        }),
      );
    }
    //}

    Promise.allSettled(taskPromises);
  }

  // this is only for the first time when the App is booting, but
  // there are more cases:
  // - LoadedApp mounting component.
  // - App go to Foreground.
  // - Internet from Not Connected to Connected.
  // - Server change.
  async configure(): Promise<void> {
    // start the periodic updates immediately; the initial fetches below
    // fill the data in as they complete. Starting the timer only after
    // the fetches left the app without updates for the whole duration
    // of the chain when the server was slow to answer.
    if (!this.updateTimerID) {
      this.updateTimerID = setInterval(() => this.runTaskPromises(), 5 * 1000); // 5 secs
      //console.log('create update timer', this.updateVTTimerID);
      this.timers.push(this.updateTimerID);
    }

    // these fetches are independent: each has its own lock and its own
    // error handling, so they run concurrently. Serialized, a dead
    // server made the whole chain take the sum of nine timeouts.
    await Promise.allSettled([
      // takes a while to start
      this.fetchTandZandOValueTransfers(),
      this.fetchAddresses(),
      this.fetchTotalBalance(),
      this.fetchStaked(),
      this.fetchInfoAndServerHeight(),
      // I need to fetch this quickly.
      this.fetchZingolibVersion(),
      this.fetchWalletHeight(),
      this.fetchWalletBirthdaySeedUfvk(),
    ]);

    await this.sanitizeTimers();
  }

  //sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  async pauseSyncProcess(): Promise<void> {
    let returnPause: string = await RPCModule.pauseSyncProcess();
    if (
      returnPause &&
      returnPause.toLowerCase().startsWith(GlobalConst.error)
    ) {
      console.log('SYNC PAUSE ERROR', returnPause);
      if (!returnPause.toLowerCase().includes('sync is not running')) {
        setLastError(`Error sync pause: ${returnPause}`);
      }
      return;
    } else {
      console.log('pause sync process. PAUSED', returnPause);
    }
  }

  async clearTimers(): Promise<void> {
    if (this.updateTimerID) {
      clearInterval(this.updateTimerID);
      this.updateTimerID = undefined;
      //console.log('kill update timer', this.updateVTTimerID);
    }

    // and now the array of timers...
    while (this.timers.length > 0) {
      const inter = this.timers.pop();
      clearInterval(inter);
      //console.log('kill item array timers', inter);
    }
  }

  async sanitizeTimers(): Promise<void> {
    // and now the array of timers...
    let deleted: number[] = [];
    for (var i = 0; i < this.timers.length; i++) {
      if (this.updateTimerID && this.timers[i] === this.updateTimerID) {
        // do nothing
      } else {
        clearInterval(this.timers[i]);
        deleted.push(i);
        //console.log('sanitize - kill item array timers', this.timers[i]);
      }
    }
    // remove the cleared timers.
    for (var i = 0; i < deleted.length; i++) {
      this.timers.splice(deleted[i], 1);
    }
  }

  async refreshSync(fullRescan?: boolean) {
    //console.log('WALLET', this.lastWalletBlockHeight, 'SERVER', this.lastServerBlockHeight);

    if (this.refreshSyncLock && !fullRescan) {
      //console.log('REFRESH ----> in execution already');
      return;
    }
    this.refreshSyncLock = true;

    // the App can called `sync run` no matter what
    // this is handy to have the wallet fully synced
    // anytime.
    keepAwake(true);

    // This is async, so when it is done, we finish the refresh.
    if (fullRescan) {
      await this.clearTimers();
      // clean the ValueTransfer list before.
      //setValueTransfersList([], 0);
      //setTotalBalance({
      //  totalOrchardBalance: 0,
      //  totalSaplingBalance: 0,
      //  totalTransparentBalance: 0,
      //  confirmedTransparentBalance: 0,
      //  confirmedOrchardBalance: 0,
      //  confirmedSaplingBalance: 0,
      //  totalSpendableBalance: 0,
      //} as TotalBalanceClass);
      //setSyncingStatus({} as SyncStatusType);

      // the rescan in zingolib do two tasks:
      // 1. stop the sync.
      // 2. launch the rescan.
      await this.pauseSyncProcess();

      const start = Date.now();
      const rescanStr: string = await RPCModule.runRescanProcess();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > rescan run command - ',
          Date.now() - start,
        );
      }
      console.log('rescan RUN', rescanStr);
      if (rescanStr && rescanStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error rescan: ${rescanStr}`);
        setLastError(`Error rescan: ${rescanStr}`);
      }
      // The App needs to calculate heights

      await this.configure();
    } else {
      const start = Date.now();
      const syncStr: string = await RPCModule.runSyncProcess();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > sync run command - ',
          Date.now() - start,
        );
      }
      console.log('sync RUN', syncStr);
      if (syncStr && syncStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error sync: ${syncStr}`);
        if (!syncStr.toLowerCase().includes('sync is already running')) {
          setLastError(`Error sync: ${syncStr}`);
        }
      }
    }

    this.refreshSyncLock = false;
  }

  async fetchSyncStatus(): Promise<void> {
    if (this.fetchSyncStatusLock) {
      //console.log('sync status locked');
      return;
    }
    this.fetchSyncStatusLock = true;
    const start = Date.now();
    const returnStatus: string = await RPCModule.statusSyncInfo();
    if (Date.now() - start > 4000) {
      console.log(
        '=========================================== > sync status command - ',
        Date.now() - start,
      );
    }
    if (
      returnStatus &&
      returnStatus.toLowerCase().startsWith(GlobalConst.error)
    ) {
      console.log('SYNC STATUS ERROR', returnStatus);
      setLastError(`Error sync status: ${returnStatus}`);
      this.fetchSyncStatusLock = false;
      return;
    }
    let ss = {} as SyncStatusType;
    try {
      ss = await JSON.parse(returnStatus);
    } catch (error) {
      console.log('SYNC STATUS ERROR - PARSE JSON', returnStatus, error);
      setLastError(`Error sync status parse: ${error} value: ${returnStatus}`);
      this.fetchSyncStatusLock = false;
      return;
    }

    //console.log('SYNC STATUS', ss);
    console.log(
      'SYNC STATUS',
      ss.scan_ranges?.length,
      ss.percentage_total_outputs_scanned,
      ss.percentage_total_blocks_scanned,
    );

    //console.log('interval sync/rescan, secs', this.secondsBatch, 'timer', this.syncStatusTimerID);

    // store SyncStatus object for a new screen
    setSyncingStatus(ss as SyncStatusType);

    // Close the poll timer if the sync finished(checked via promise above)
    const percentage: number =
      ss.percentage_total_outputs_scanned ||
      ss.percentage_total_blocks_scanned ||
      0;
    const inR: boolean =
      !!ss.scan_ranges && ss.scan_ranges.length > 0 && percentage < 100;
    if (!inR) {
      // here we can release the screen...
      keepAwake(false);
    }

    this.fetchSyncStatusLock = false;
  }

  // do not use it for now...
  async fetchSyncPoll(): Promise<void> {
    if (this.fetchSyncPollLock) {
      console.log('***************** SYNC POLL - locked');
      return;
    }
    this.fetchSyncPollLock = true;
    const start = Date.now();
    const returnPoll: string = await RPCModule.pollSyncInfo();
    if (Date.now() - start > 4000) {
      console.log(
        '=========================================== > sync poll command - ',
        Date.now() - start,
      );
    }
    if (returnPoll && returnPoll.toLowerCase().startsWith(GlobalConst.error)) {
      console.log('SYNC POLL ERROR', returnPoll);
      setLastError(`Error sync poll: ${returnPoll}`);
      console.log(
        'HEIGHTS  ------- ',
        this.lastWalletBlockHeight,
        this.lastServerBlockHeight,
      );
      // if the error is: LightclientLockPoisoned force a rescan directly
      if (returnPoll.includes('LightclientLockPoisoned')) {
        let result: string = await RPCModule.loadExistingWallet(
          this.indexerServer.uri,
          this.indexerServer.chainName,
          this.performanceLevel,
          GlobalConst.minConfirmations.toString(),
        );
        console.log('POISONED ERROR RECOVERY', result);
        setTimeout(async () => {
          await this.refreshSync(true);
        }, 0);
      } else if (
        this.lastWalletBlockHeight - this.lastServerBlockHeight >= 100 ||
        returnPoll.includes('100 blocks ahead of best chain height')
      ) {
        // if the error is for the server vs wallet height.
        if (!this.walletSeed) {
          await this.fetchWalletBirthdaySeedUfvk();
        }
        console.log(
          '100 BLOCKS AHEAD RECOVERY',
          this.walletBirthday,
          this.walletSeed,
        );
        if (this.walletSeed) {
          this.recoverWallet(
            this.walletSeed,
            this.walletBirthday > this.lastServerBlockHeight
              ? 1
              : this.walletBirthday,
          );
        } else {
          let result: string = await RPCModule.loadExistingWallet(
            this.indexerServer.uri,
            this.indexerServer.chainName,
            this.performanceLevel,
            GlobalConst.minConfirmations.toString(),
          );
          console.log('100 BLOCKS AHEAD RECOVERY RECOVERY', result);
          setTimeout(async () => {
            await this.refreshSync(true);
          }, 0);
        }
      } else {
        // This command have an error, fine. It's worthy to try running the sync process juat in case.
        setTimeout(async () => {
          await this.refreshSync();
        }, 0);
        setTimeout(async () => {
          await this.fetchSyncStatus();
        }, 0);
      }
      this.fetchSyncPollLock = false;
      return;
    }

    if (
      returnPoll.toLowerCase().startsWith('sync task has not been launched')
    ) {
      console.log('SYNC POLL -> RUN SYNC', returnPoll);
      setTimeout(async () => {
        await this.refreshSync();
      }, 0);
      this.fetchSyncPollLock = false;
      return;
    }

    if (returnPoll.toLowerCase().startsWith('sync task is not complete')) {
      console.log('SYNC POLL -> FETCH STATUS', returnPoll);
      setTimeout(async () => {
        await this.fetchSyncStatus();
      }, 0);
      console.log('SYNC POLL -> RUN SYNC', returnPoll);
      setTimeout(async () => {
        await this.refreshSync();
      }, 0);
      this.fetchSyncPollLock = false;
      return;
    }

    let sp = {} as SyncPollType;
    try {
      sp = await JSON.parse(returnPoll);
    } catch (error) {
      console.log('SYNC POLL ERROR - PARSE JSON', returnPoll, error);
      setLastError(`Error sync poll parse: ${error} value: ${returnPoll}`);
      this.fetchSyncPollLock = false;
      return;
    }

    console.log('SYNC POLL', sp);

    console.log('SYNC POLL -> FETCH STATUS');
    setTimeout(async () => {
      await this.fetchSyncStatus();
    }, 0);

    this.fetchSyncPollLock = false;
  }

  async fetchInfoAndServerHeight(): Promise<void> {
    try {
      if (this.fetchInfoAndServerHeightLock) {
        return;
      }
      this.fetchInfoAndServerHeightLock = true;
      let infoError: boolean = false;
      const start = Date.now();
      const infoStr: string = await RPCModule.infoServerInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > info - ',
          Date.now() - start,
        );
      }
      //console.log('INFO', infoStr);
      if (infoStr) {
        if (infoStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error info & server block height ${infoStr}`);
          setLastError(`Error info: ${infoStr}`);
          infoError = true;
        }
      } else {
        console.log('Internal Error info & server block height');
        infoError = true;
      }

      if (infoError) {
        // Keep the last known good values instead of writing zeroes, so the
        // UI keeps showing stale data and `latestBlock` does not flap between
        // a real height and 0 while the server is unstable.
        setInfo({
          ...(this.lastGoodInfo ?? {
            latestBlock: 0,
            serverUri: '',
            version: '',
          }),
          serverUnreachable: true,
        } as InfoType);
        this.fetchInfoAndServerHeightLock = false;
        return;
      }

      const infoJSON: WalletInfoType = await JSON.parse(infoStr);

      const info: InfoType = {
        chainName: infoJSON.chain_name,
        latestBlock: infoJSON.latest_block_height,
        serverUri: infoJSON.server_uri || '',
        version: `${infoJSON.vendor}/${infoJSON.git_commit ? infoJSON.git_commit.substring(0, 6) : ''}/${
          infoJSON.version
        }`,
        currencyName:
          infoJSON.chain_name === ChainNameEnum.mainChainName
            ? CurrencyNameEnum.ZEC
            : CurrencyNameEnum.cTAZ,
      };

      this.recordBlock(info.latestBlock);
      setInfo(info);
      this.lastGoodInfo = info;
      this.lastServerBlockHeight = info.latestBlock;
      this.fetchInfoAndServerHeightLock = false;
    } catch (error) {
      console.log(`Critical Error info & server block height ${error}`);
      setLastError(`Error info: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
      this.fetchInfoAndServerHeightLock = false;
      return;
    }
  }

  recordBlock(block: number | undefined): void {
    if (block === undefined || block === this.lastKnownBlock) {
      return;
    }
    const now = Date.now();
    if (
      this.lastBlockTimestamp !== null &&
      this.lastKnownBlock !== null &&
      block > this.lastKnownBlock
    ) {
      const elapsedSeconds = (now - this.lastBlockTimestamp) / 1000;
      this.blockTimes.push(elapsedSeconds / (block - this.lastKnownBlock));
      if (this.blockTimes.length > 100) {
        this.blockTimes.shift();
      }
    }
    this.lastBlockTimestamp = now;
    this.lastKnownBlock = block;
  }

  getAverageBlockTime(): number {
    if (this.blockTimes.length === 0) {
      return 0;
    }
    const sum = this.blockTimes.reduce((acc, value) => acc + value, 0);
    return sum / this.blockTimes.length;
  }

  async fetchZingolibVersion(): Promise<void> {
    try {
      if (this.fetchZingolibVersionLock) {
        return;
      }
      this.fetchZingolibVersionLock = true;
      const start = Date.now();
      let zingolibStr: string = await RPCModule.getVersionInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > zingolib version - ',
          Date.now() - start,
        );
      }
      if (zingolibStr) {
        if (zingolibStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error zingolib version ${zingolibStr}`);
          setLastError(`Error zingolib version: ${zingolibStr}`);
          zingolibStr = GlobalConst.zingolibError;
        }
      } else {
        console.log('Internal Error zingolib version');
        zingolibStr = GlobalConst.zingolibNone;
      }

      setZingolibVersion(zingolibStr);
      this.fetchZingolibVersionLock = false;
    } catch (error) {
      console.log(`Critical Error zingolib version ${error}`);
      setLastError(`Error zingolib version: ${error}`);
      this.fetchZingolibVersionLock = false;
      return;
    }
  }

  // This method will get the total balances
  async fetchTotalBalance() {
    try {
      if (this.fetchTotalBalanceLock) {
        return;
      }
      this.fetchTotalBalanceLock = true;
      const start = Date.now();
      const spendableStr: string =
        await RPCModule.getSpendableBalanceTotalInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > spendable balance - ',
          Date.now() - start,
        );
      }
      //console.log(spendableStr);
      let spendableJSON: SpendablebalanceType = {} as SpendablebalanceType;
      if (spendableStr) {
        if (spendableStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error spendable balance ${spendableStr}`);
          setLastError(`Error spendable balance: ${spendableStr}`);
        } else {
          spendableJSON = await JSON.parse(spendableStr);
        }
      } else {
        console.log('Internal Error spendable balance');
      }

      const start2 = Date.now();
      const balanceStr: string = await RPCModule.getBalanceInfo();
      if (Date.now() - start2 > 4000) {
        console.log(
          '=========================================== > balance - ',
          Date.now() - start2,
        );
      }
      if (balanceStr) {
        if (balanceStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error balance ${balanceStr}`);
          setLastError(`Error balance: ${balanceStr}`);
          this.fetchTotalBalanceLock = false;
          return;
        }
      } else {
        console.log('Internal Error balance');
        this.fetchTotalBalanceLock = false;
        return;
      }
      const balanceJSON: BalancesType = await JSON.parse(balanceStr);

      //console.log('balance:', balanceJSON);

      // Total Balance
      const balance: TotalBalanceClass = {
        totalOrchardBalance: (balanceJSON.total_orchard_balance || 0) / 10 ** 8,
        totalSaplingBalance: (balanceJSON.total_sapling_balance || 0) / 10 ** 8,
        totalTransparentBalance:
          (balanceJSON.total_transparent_balance || 0) / 10 ** 8,
        confirmedOrchardBalance:
          (balanceJSON.confirmed_orchard_balance || 0) / 10 ** 8,
        confirmedSaplingBalance:
          (balanceJSON.confirmed_sapling_balance || 0) / 10 ** 8,
        confirmedTransparentBalance:
          (balanceJSON.confirmed_transparent_balance || 0) / 10 ** 8,
        // header total balance
        totalSpendableBalance: (spendableJSON.spendable_balance || 0) / 10 ** 8,
        //totalSpendableBalance: ((balanceJSON.confirmed_orchard_balance + balanceJSON.confirmed_sapling_balance) || 0) / 10 ** 8,
        stakedAmount: (balanceJSON.staked_amount || 0) / 10 ** 8,
      };
      //console.log(balance);
      setTotalBalance(balance);
      this.fetchTotalBalanceLock = false;
    } catch (error) {
      console.log(`Critical Error balances ${error}`);
      setLastError(`Error balance: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
      this.fetchTotalBalanceLock = false;
      return;
    }
  }

  async fetchStaked() {
    try {
      if (this.fetchStakedLock) return;
      this.fetchStakedLock = true;

      const rosterInfoStr: string = await RPCModule.getRosterInfo();

      if (!rosterInfoStr) {
        setLastError('Error roster_info: empty response');
        this.fetchStakedLock = false;
        return;
      }
      if (rosterInfoStr.toLowerCase().startsWith(GlobalConst.error)) {
        setLastError(`Error roster_info: ${rosterInfoStr}`);
        this.fetchStakedLock = false;
        return;
      }

      const rosterInfo = JSON.parse(rosterInfoStr) as {
        roster_members: Array<StakedType>;
      };

      const start3 = Date.now();
      const walletBondsStr: string = await RPCModule.getWalletBondsInfo();

      if (Date.now() - start3 > 4000) {
        console.log(
          '=========================================== > wallet bonds - ',
          Date.now() - start3,
        );
      }

      //console.log(valueTransfersStr);
      if (walletBondsStr) {
        if (walletBondsStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error wallet bonds ${walletBondsStr}`);
          setLastError(`Error wallet bonds: ${walletBondsStr}`);
          this.fetchStakedLock = false;
          return;
        }
      } else {
        console.log('Internal Error value transfers');
        this.fetchStakedLock = false;
        return;
      }
      const walletBondsJSON = JSON.parse(walletBondsStr) as {
        bonds: Array<WalletBondsInfoType>;
      };

      const globalStakedList: StakeType[] = (
        rosterInfo.roster_members ?? []
      ).map(m => ({
        finalizer: m.pubkey, // TODO: RENAME PLS
        votingPower: (m.voting_power || 0) / 10 ** 8,
      }));

      const walletBondsList: WalletBondsType[] = (
        walletBondsJSON.bonds ?? []
      ).map(m => ({
        txid: m.created_in_txid,
        pubKey: m.bond_key,
        amount: (m.amount_zats || 0) / 10 ** 8,
        status:
          m.status === 0
            ? WalletBondsStatusEnum.Active
            : m.status === 1
              ? WalletBondsStatusEnum.Unbonding
              : m.status === 2
                ? WalletBondsStatusEnum.Withdrawn
                : WalletBondsStatusEnum.Active, // can be an error here
        finalizer: m.finalizer,
      }));

      const stakedList: StakeType[] = (rosterInfo.roster_members ?? [])
        .filter(
          m =>
            walletBondsList.filter(
              b =>
                m.pubkey === b.finalizer &&
                (b.status === WalletBondsStatusEnum.Active ||
                  b.status === WalletBondsStatusEnum.Unbonding),
            ).length > 0,
        )
        .map(m => {
          const amount = walletBondsList
            .filter(
              b =>
                m.pubkey === b.finalizer &&
                (b.status === WalletBondsStatusEnum.Active ||
                  b.status === WalletBondsStatusEnum.Unbonding),
            )
            .reduce((acc, curr) => acc + curr.amount, 0);
          return {
            finalizer: m.pubkey,
            votingPower: amount || 0,
          };
        });

      //console.log('GLOBAL STAKED', globalStakedList);
      //console.log('STAKED', stakedList);
      //console.log('BONDS', walletBondsList);
      //console.log('ROSTER', rosterInfo);

      setStaked(stakedList);
      setGlobalStaked(globalStakedList);
      setWalletBonds(walletBondsList);

      this.fetchStakedLock = false;
    } catch (error) {
      console.log(`Critical Error staked ${error}`);
      setLastError(`Error staked: ${error}`);
      await this.clearTimers();
      await this.configure();
      this.fetchStakedLock = false;
    }
  }

  // This method will get the total balances
  async fetchAddresses() {
    try {
      if (this.fetchAddressesLock) {
        return;
      }
      this.fetchAddressesLock = true;

      // UNIFIED
      const start = Date.now();
      const unifiedAddressesStr: string =
        await RPCModule.getUnifiedAddressesInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > addresses unified - ',
          Date.now() - start,
        );
      }
      if (unifiedAddressesStr) {
        if (unifiedAddressesStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error addresses ${unifiedAddressesStr}`);
          setLastError(`Error unified addresses: ${unifiedAddressesStr}`);
          this.fetchAddressesLock = false;
          return;
        }
      } else {
        console.log('Internal Error addresses');
        this.fetchAddressesLock = false;
        return;
      }
      const unifiedAddressesJSON: UnifiedAddressType[] =
        (await JSON.parse(unifiedAddressesStr)) || [];

      // TRANSPARENT
      const start2 = Date.now();
      const transparentAddressStr: string =
        await RPCModule.getTransparentAddressesInfo();
      if (Date.now() - start2 > 4000) {
        console.log(
          '=========================================== > addresses transparent - ',
          Date.now() - start2,
        );
      }
      if (transparentAddressStr) {
        if (transparentAddressStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error addresses ${transparentAddressStr}`);
          setLastError(`Error transparent addresses: ${transparentAddressStr}`);
          this.fetchAddressesLock = false;
          return;
        }
      } else {
        console.log('Internal Error addresses');
        this.fetchAddressesLock = false;
        return;
      }
      const transparentAddressesJSON: TransparentAddressType[] =
        (await JSON.parse(transparentAddressStr)) || [];

      let allAddresses: (UnifiedAddressClass | TransparentAddressClass)[] = [];

      unifiedAddressesJSON &&
        unifiedAddressesJSON.forEach((u: UnifiedAddressType) => {
          const ua: UnifiedAddressClass = new UnifiedAddressClass(
            u.address_index,
            u.encoded_address,
            AddressKindEnum.u,
            u.has_orchard,
            u.has_sapling,
            u.has_transparent,
          );
          allAddresses.push(ua);
        });

      transparentAddressesJSON &&
        transparentAddressesJSON.forEach((u: TransparentAddressType) => {
          const t: TransparentAddressClass = new TransparentAddressClass(
            u.address_index,
            u.encoded_address,
            AddressKindEnum.t,
            u.scope,
          );
          allAddresses.push(t);
        });

      //console.log(allAddresses);

      setAllAddresses(allAddresses);
      this.fetchAddressesLock = false;
    } catch (error) {
      console.log(`Critical Error addresses ${error}`);
      setLastError(`Error addresses: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
      this.fetchAddressesLock = false;
      return;
    }
  }

  async fetchWalletHeight(): Promise<void> {
    try {
      if (this.fetchWalletHeightLock) {
        return;
      }
      this.fetchWalletHeightLock = true;
      const start = Date.now();
      const heightStr: string = await RPCModule.getLatestBlockWalletInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > wallet height - ',
          Date.now() - start,
        );
      }
      //console.log('WALLET HEIGHT', heightStr);
      if (heightStr) {
        if (heightStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error wallet height ${heightStr}`);
          setLastError(`Error wallet height: ${heightStr}`);
          this.fetchWalletHeightLock = false;
          return;
        }
      } else {
        console.log('Internal Error wallet height');
        this.fetchWalletHeightLock = false;
        return;
      }
      const heightJSON: WalletHeight = await JSON.parse(heightStr);

      this.lastWalletBlockHeight = heightJSON.height;
      this.fetchWalletHeightLock = false;
    } catch (error) {
      console.log(`Critical Error wallet height ${error}`);
      setLastError(`Error wallet height: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
      this.fetchWalletHeightLock = false;
      return;
    }
  }
  /*
  async getWalletSaveRequired(): Promise<boolean> {
    try {
      if (this.getWalletSaveRequiredLock) {
        return false;
      }
      this.getWalletSaveRequiredLock = true;
      const start = Date.now();
      const walletSaveRequiredStr: string =
        await RPCModule.getWalletSaveRequiredInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > wallet save required - ',
          Date.now() - start,
        );
      }
      if (walletSaveRequiredStr) {
        if (walletSaveRequiredStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error wallet save required ${walletSaveRequiredStr}`);
          setLastError(
            `Error wallet save required: ${walletSaveRequiredStr}`,
          );
          this.getWalletSaveRequiredLock = false;
          return false;
        }
      } else {
        console.log('Internal Error wallet save required');
        this.getWalletSaveRequiredLock = false;
        return false;
      }
      const walletSaveRequiredJSON: WalletSaveRequiredType =
        await JSON.parse(walletSaveRequiredStr);

      this.getWalletSaveRequiredLock = false;
      return walletSaveRequiredJSON.save_required;
    } catch (error) {
      console.log(`Critical Error wallet save required ${error}`);
      setLastError(`Error wallet save required: ${error}`);
      this.getWalletSaveRequiredLock = false;
      return false;
    }
  }
*/
  async getConfigWalletPerformance(): Promise<
    PerformanceLevelEnum | undefined
  > {
    try {
      const start = Date.now();
      const configWalletPerformanceStr: string =
        await RPCModule.getConfigWalletPerformanceInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > wallet config performance - ',
          Date.now() - start,
        );
      }
      if (configWalletPerformanceStr) {
        if (
          configWalletPerformanceStr.toLowerCase().startsWith(GlobalConst.error)
        ) {
          console.log(
            `Error wallet config performance ${configWalletPerformanceStr}`,
          );
          setLastError(
            `Error wallet config performance: ${configWalletPerformanceStr}`,
          );
          return;
        }
      } else {
        console.log('Internal Error wallet config performance');
        return;
      }
      const configWalletPerformanceJSON: ConfigWalletPerformanceType =
        await JSON.parse(configWalletPerformanceStr);

      return configWalletPerformanceJSON.performance_level;
    } catch (error) {
      console.log(`Critical Error wallet config performance ${error}`);
      setLastError(`Error wallet config performance: ${error}`);
      return;
    }
  }

  async getWalletVersion(): Promise<number | undefined> {
    try {
      const start = Date.now();
      const walletVersionStr: string = await RPCModule.getWalletVersionInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > wallet version - ',
          Date.now() - start,
        );
      }
      if (walletVersionStr) {
        if (walletVersionStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error wallet version ${walletVersionStr}`);
          setLastError(`Error wallet version: ${walletVersionStr}`);
          return;
        }
      } else {
        console.log('Internal Error wallet version');
        return;
      }
      const walletVersionJSON: WalletVersionType =
        await JSON.parse(walletVersionStr);

      return walletVersionJSON.read_version;
    } catch (error) {
      console.log(`Critical Error wallet version ${error}`);
      setLastError(`Error wallet version: ${error}`);
      return;
    }
  }

  async fetchWalletBirthdaySeedUfvk(): Promise<void> {
    try {
      if (this.fetchWalletBirthdaySeedUfvkLock) {
        return;
      }
      this.fetchWalletBirthdaySeedUfvkLock = true;
      const wallet = await WalletService.rpcFetchWallet(this.readOnly);

      if (wallet) {
        this.walletBirthday = wallet.birthday;
        this.walletSeed = wallet.seed || '';
        this.UFVK = wallet.ufvk || '';
        setWallet(wallet);
      }
      this.fetchWalletBirthdaySeedUfvkLock = false;
    } catch (error) {
      console.log(`Critical Error wallet birthday ${error}`);
      setLastError(`Error wallet birthday: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
      this.fetchWalletBirthdaySeedUfvkLock = false;
      return;
    }
  }

  // Fetch all T and Z and O ValueTransfers
  async fetchTandZandOValueTransfers() {
    try {
      if (this.fetchTandZandOValueTransfersLock) {
        //console.log('VT LOCKKKKKKKKKKKKKKKKKKKKKKK');
        return;
      }
      this.fetchTandZandOValueTransfersLock = true;
      // first to get the last server block.
      const start = Date.now();
      const heightStr: string = await RPCModule.getLatestBlockServerInfo(
        this.indexerServer.uri,
      );
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > server height - ',
          Date.now() - start,
        );
      }
      //console.log('GET SERVER HEIGHT', heightStr);
      if (heightStr) {
        if (heightStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error server height ${heightStr}`);
          setLastError(`Error server height: ${heightStr}`);
        } else {
          this.lastServerBlockHeight = Number(heightStr);
        }
      } else {
        console.log('Internal Error server height');
      }

      //console.log('SERVER HEIGHT', this.lastServerBlockHeight);

      const start2 = Date.now();
      const valueTransfersStr: string = await RPCModule.getValueTransfersList();

      if (Date.now() - start2 > 4000) {
        console.log(
          '=========================================== > value transfers - ',
          Date.now() - start2,
        );
      }
      //console.log(valueTransfersStr);
      if (valueTransfersStr) {
        if (valueTransfersStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error value transfers ${valueTransfersStr}`);
          setLastError(`Error value transfers: ${valueTransfersStr}`);
          this.fetchTandZandOValueTransfersLock = false;
          return;
        }
      } else {
        console.log('Internal Error value transfers');
        this.fetchTandZandOValueTransfersLock = false;
        return;
      }
      const valueTransfersJSON: ValueTransfersType =
        await JSON.parse(valueTransfersStr);

      //console.log(valueTransfersJSON.wallet_events);

      let vtList: ValueTransferType[] = [];

      // oscar idea and I think it is the correct way to build the history of
      // value transfers.
      valueTransfersJSON &&
        valueTransfersJSON.wallet_events &&
        valueTransfersJSON.wallet_events.forEach(
          (vt: WalletValueTransferType) => {
            const currentValueTransferList: ValueTransferType =
              {} as ValueTransferType;

            currentValueTransferList.txid = vt.txid;
            currentValueTransferList.time = vt.datetime;
            currentValueTransferList.kind =
              vt.kind === WalletValueTransferKindEnum.memoToSelf
                ? ValueTransferKindEnum.MemoToSelf
                : vt.kind === WalletValueTransferKindEnum.sendToSelf
                  ? ValueTransferKindEnum.SendToSelf
                  : vt.kind === WalletValueTransferKindEnum.received
                    ? ValueTransferKindEnum.Received
                    : vt.kind === WalletValueTransferKindEnum.sent
                      ? ValueTransferKindEnum.Sent
                      : vt.kind === WalletValueTransferKindEnum.shield
                        ? ValueTransferKindEnum.Shield
                        : vt.kind === WalletValueTransferKindEnum.rejection
                          ? ValueTransferKindEnum.Rejection
                          : vt.kind === WalletValueTransferKindEnum.createBond
                            ? ValueTransferKindEnum.CreateBond
                            : vt.kind ===
                                WalletValueTransferKindEnum.beginUnbond
                              ? ValueTransferKindEnum.BeginUnbond
                              : vt.kind ===
                                  WalletValueTransferKindEnum.withdrawBond
                                ? ValueTransferKindEnum.WithdrawBond
                                : vt.kind ===
                                    WalletValueTransferKindEnum.retargetDelegationBond
                                  ? ValueTransferKindEnum.RetargetDelegationBond
                                  : ValueTransferKindEnum.Unknown; // error
            currentValueTransferList.fee =
              (!vt.transaction_fee ? 0 : vt.transaction_fee) / 10 ** 8;
            currentValueTransferList.zecPrice = !vt.zec_price
              ? 0
              : vt.zec_price;
            if (
              vt.status === ValueTransferStatusEnum.calculated ||
              vt.status === ValueTransferStatusEnum.transmitted ||
              vt.status === ValueTransferStatusEnum.mempool ||
              vt.status === ValueTransferStatusEnum.failed
            ) {
              currentValueTransferList.confirmations = 0;
            } else if (vt.status === ValueTransferStatusEnum.confirmed) {
              currentValueTransferList.confirmations =
                this.lastServerBlockHeight &&
                this.lastServerBlockHeight >= this.lastWalletBlockHeight
                  ? this.lastServerBlockHeight - vt.blockheight + 1
                  : this.lastWalletBlockHeight - vt.blockheight + 1;
            } else {
              // impossible case... I guess.
              currentValueTransferList.confirmations = 0;
            }
            currentValueTransferList.blockheight = vt.blockheight;
            currentValueTransferList.status = vt.status;
            currentValueTransferList.address = !vt.recipient_address
              ? undefined
              : vt.recipient_address;
            currentValueTransferList.amount =
              (!vt.value ? 0 : vt.value) / 10 ** 8;
            currentValueTransferList.memos =
              !vt.memos || vt.memos.length === 0 || !vt.memos.join('')
                ? undefined
                : vt.memos;
            currentValueTransferList.poolType = !vt.pool_received
              ? undefined
              : vt.pool_received;
            if (vt.staking_action === null) {
              currentValueTransferList.stakingAction = null;
            } else {
              currentValueTransferList.stakingAction = {
                kind: vt.staking_action?.kind,
                unique_public_key: vt.staking_action?.unique_public_key,
                val:
                  (!vt.staking_action?.val ? 0 : vt.staking_action.val) /
                  10 ** 8,
                target: vt.staking_action?.target,
              } as StakingActionType;
            }

            if (vt.txid.startsWith('xxxxxxxxx')) {
              console.log('server', this.lastServerBlockHeight);
              console.log('wallet', this.lastWalletBlockHeight);
              console.log('valuetransfer zingolib: ', vt);
              console.log('valuetransfer zingo', currentValueTransferList);
              console.log('--------------------------------------------------');
            }
            //if (vt.status === ValueTransferStatusEnum.calculated) {
            //  console.log('CALCULATED ))))))))))))))))))))))))))))))))))');
            //  console.log(vt);
            //}
            //if (vt.status === ValueTransferStatusEnum.transmitted) {
            //  console.log('TRANSMITTED ))))))))))))))))))))))))))))))))))');
            //  console.log(vt);
            //}
            //if (currentValueTransferList.kind === ValueTransferKindEnum.WithdrawBond) {
            //  console.log('))))))))))))))))))))))))))))))))))');
            //  console.log(vt);
            //  console.log(currentValueTransferList);
            //}

            //console.log(currentValueTransferList);
            vtList.push(currentValueTransferList);
          },
        );

      //console.log(vtList);

      setValueTransfersList(vtList, vtList.length);
      this.fetchTandZandOValueTransfersLock = false;
    } catch (error) {
      console.log(`Critical Error value transfers ${error}`);
      setLastError(`Error value transfers: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
      this.fetchTandZandOValueTransfersLock = false;
      return;
    }
  }

  // Send a transaction using the already constructed sendJson structure
  async sendTransaction(sendJson: Array<SendJsonToTypeType>): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      // clear the timers - Tasks.
      await this.clearTimers();
      // sending
      this.setInSend(true);
      // keep awake the screen/device while sending.
      keepAwake(true);
      // sometimes we need the result of send as well
      let sendError: string = '';
      let sendTxids: string = '';
      try {
        console.log('send JSON', sendJson);
        // creating the propose
        const proposeStr: string = await RPCModule.sendProcess(
          JSON.stringify(sendJson),
        );
        if (proposeStr) {
          if (proposeStr.toLowerCase().startsWith(GlobalConst.error)) {
            console.log(`Error propose ${proposeStr}`);
            sendError = proposeStr;
          }
        } else {
          console.log('Internal Error propose');
          sendError = 'Error: Internal RPC Error: propose';
        }
        if (!sendError) {
          const proposeJSON: SendProposeType = await JSON.parse(proposeStr);
          if (proposeJSON.error) {
            console.log(`Error propose ${proposeJSON.error}`);
            sendError = proposeJSON.error;
          }
          if (!sendError) {
            // creating the transaction
            const sendStr: string = await RPCModule.confirmProcess();
            if (sendStr) {
              if (sendStr.toLowerCase().startsWith(GlobalConst.error)) {
                console.log(`Error confirm ${sendStr}`);
                sendError = sendStr;
              }
            } else {
              console.log('Internal Error confirm');
              sendError = 'Error: Internal RPC Error: confirm';
            }
            if (!sendError) {
              const sendJSON: SendType = await JSON.parse(sendStr);
              if (sendJSON.error) {
                console.log(`Error confirm ${sendJSON.error}`);
                sendError = sendJSON.error;
              } else if (sendJSON.txids && sendJSON.txids.length > 0) {
                sendTxids = sendJSON.txids.join(', ');
              }
            }
          }
        }
      } catch (error) {
        console.log(`Critical Error send ${error}`);
        sendError = `Error: send ${error}`;
      }

      // create the tasks
      await this.configure();
      this.setInSend(false);

      await this.refreshSync();

      if (sendTxids) return resolve(sendTxids);
      return reject(sendError || 'Error: send failed');
    });
  }

  // Send a staking transaction using the already constructed stakeJson structure
  async sendStakingTransaction(
    stakeJson: StakeJsonToTypeType,
  ): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      await this.clearTimers();
      this.setInSend(true);
      keepAwake(true);

      let sendError = '';
      let sendTxids = '';

      try {
        //console.log('stake JSON', stakeJson);

        const action = stakeJson.stakingAction;

        let proposeStr = '';

        if (action.kind === StakingActionKindEnum.CreateBond) {
          const payload = {
            amount_zats: action.val,
            finalizer_address: reverseHex32Bytes(action.target), // ONLY PLACE WHERE IT SHOULD BE USED
          };

          proposeStr = await RPCModule.stakeProcess(JSON.stringify(payload));
        } else {
          sendError = `Error: Unsupported stakingAction.kind ${action.kind}`;
        }

        if (!sendError) {
          if (proposeStr) {
            if (proposeStr.toLowerCase().startsWith(GlobalConst.error)) {
              console.log(`Error staking propose ${proposeStr}`);
              sendError = proposeStr;
            }
          } else {
            console.log('Internal Error staking propose');
            sendError = 'Error: Internal RPC Error: staking propose';
          }
        }

        if (!sendError) {
          const proposeJSON: SendProposeType = JSON.parse(proposeStr);
          if (proposeJSON.error) {
            console.log(`Error staking propose ${proposeJSON.error}`);
            sendError = proposeJSON.error;
          }
        }

        if (!sendError) {
          const sendStr: string = await RPCModule.confirmProcess();

          if (sendStr) {
            if (sendStr.toLowerCase().startsWith(GlobalConst.error)) {
              console.log(`Error staking confirm ${sendStr}`);
              sendError = sendStr;
            }
          } else {
            console.log('Internal Error staking confirm');
            sendError = 'Error: Internal RPC Error: staking confirm';
          }

          if (!sendError) {
            const sendJSON: SendType = JSON.parse(sendStr);
            if (sendJSON.error) {
              sendError = sendJSON.error;
            } else if (sendJSON.txids && sendJSON.txids.length > 0) {
              sendTxids = sendJSON.txids.join(', ');
            }
          }
        }
      } catch (error) {
        console.log(`Critical Error stake ${error}`);
        sendError = `Error: stake ${error}`;
      }

      await this.configure();
      this.setInSend(false);

      await this.refreshSync();

      if (sendTxids) return resolve(sendTxids);
      return reject(sendError || 'Error: staking failed');
    });
  }

  async sendBeginUnstakingTx(bondCreateTxid: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      await this.clearTimers();
      this.setInSend(true);
      keepAwake(true);

      let sendError = '';
      let sendTxids = '';

      try {
        if (!/^[0-9a-fA-F]{64}$/.test(bondCreateTxid)) {
          sendError = 'Error: begin_unstake requires a 64-hex create bond txid';
        }

        // 1) propose begin_unstake
        let proposeStr = '';
        if (!sendError) {
          proposeStr = await RPCModule.beginUnstakeProcess(bondCreateTxid);

          if (!proposeStr) {
            sendError = 'Error: Internal RPC Error: begin_unstake propose';
          } else if (proposeStr.toLowerCase().startsWith(GlobalConst.error)) {
            sendError = proposeStr;
          } else {
            const proposeJSON: SendProposeType = JSON.parse(proposeStr);
            if (proposeJSON.error) sendError = proposeJSON.error;
          }
        }

        // 2) confirm
        if (!sendError) {
          const sendStr: string = await RPCModule.confirmProcess();

          if (!sendStr) {
            sendError = 'Error: Internal RPC Error: confirm';
          } else if (sendStr.toLowerCase().startsWith(GlobalConst.error)) {
            sendError = sendStr;
          } else {
            const sendJSON: SendType = JSON.parse(sendStr);
            if (sendJSON.error) {
              sendError = sendJSON.error;
            } else if (sendJSON.txids?.length) {
              sendTxids = sendJSON.txids.join(', ');
            } else {
              sendError = 'Error: confirm returned no txids';
            }
          }
        }
      } catch (e) {
        sendError = `Error: begin_unstake ${e}`;
      }

      await this.configure();
      this.setInSend(false);

      await this.refreshSync();

      if (sendTxids) return resolve(sendTxids);
      return reject(sendError || 'Error: begin unstake failed');
    });
  }

  async sendWithdrawBondTx(bondCreateTxid: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      await this.clearTimers();
      this.setInSend(true);
      keepAwake(true);

      let sendError = '';
      let sendTxids = '';

      try {
        if (!/^[0-9a-fA-F]{64}$/.test(bondCreateTxid)) {
          sendError =
            'Error: withdraw_stake requires a 64-hex create bond txid';
        }

        if (!sendError) {
          const respStr = await RPCModule.withdrawStakeProcess(bondCreateTxid);

          if (!respStr) {
            sendError = 'Error: Internal RPC Error: withdraw_stake';
          } else if (respStr.toLowerCase().startsWith(GlobalConst.error)) {
            sendError = respStr;
          } else {
            let respJSON: any;
            try {
              respJSON = JSON.parse(respStr);
            } catch {
              sendError = `Error: withdraw_stake returned non-JSON: ${respStr}`;
            }

            if (!sendError) {
              if (respJSON?.error) {
                sendError = String(respJSON.error);
              } else if (
                typeof respJSON?.txid === 'string' &&
                respJSON.txid.length
              ) {
                sendTxids = respJSON.txid;
              } else if (
                Array.isArray(respJSON?.txids) &&
                respJSON.txids.length
              ) {
                sendTxids = respJSON.txids.join(', ');
              } else {
                sendError = 'Error: withdraw_stake returned no txid';
              }
            }
          }
        }
      } catch (e: any) {
        sendError = `Error: withdraw_stake ${e?.message ?? String(e)}`;
      }

      await this.configure();
      this.setInSend(false);

      await this.refreshSync();

      if (sendTxids) return resolve(sendTxids);
      return reject(sendError || 'Error: withdraw_stake failed');
    });
  }

  async sendRetargetBondTx(
    bondCreateTxid: string,
    finalizer: string,
  ): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      await this.clearTimers();
      this.setInSend(true);
      keepAwake(true);

      let sendError = '';
      let sendTxids = '';

      try {
        if (!/^[0-9a-fA-F]{64}$/.test(bondCreateTxid)) {
          sendError = 'Error: Retarget_Bond requires a 64-hex create bond txid';
        }

        // 1) propose Retarget_Bond
        let proposeStr = '';
        if (!sendError) {
          proposeStr = await RPCModule.retargetBondProcess(
            bondCreateTxid,
            finalizer,
          );

          if (!proposeStr) {
            sendError = 'Error: Internal RPC Error: Retarget_Bond propose';
          } else if (proposeStr.toLowerCase().startsWith(GlobalConst.error)) {
            sendError = proposeStr;
          } else {
            const proposeJSON: SendProposeType = JSON.parse(proposeStr);
            if (proposeJSON.error) sendError = proposeJSON.error;
          }
        }

        // 2) confirm
        if (!sendError) {
          const sendStr: string = await RPCModule.confirmProcess();

          if (!sendStr) {
            sendError = 'Error: Internal RPC Error: confirm';
          } else if (sendStr.toLowerCase().startsWith(GlobalConst.error)) {
            sendError = sendStr;
          } else {
            const sendJSON: SendType = JSON.parse(sendStr);
            if (sendJSON.error) {
              sendError = sendJSON.error;
            } else if (sendJSON.txids?.length) {
              sendTxids = sendJSON.txids.join(', ');
            } else {
              sendError = 'Error: confirm returned no txids';
            }
          }
        }
      } catch (e) {
        sendError = `Error: Retarget_Bond ${e}`;
      }

      await this.configure();
      this.setInSend(false);

      await this.refreshSync();

      if (sendTxids) return resolve(sendTxids);
      return reject(sendError || 'Error: Retarget_Bond failed');
    });
  }

  async requestFaucetFunds(address: string) {
    const response = await RPCModule.requestFaucetFundsProcess(address);

    if (response && response.toLowerCase().startsWith(GlobalConst.error)) {
      console.log('Error: request faucet funds', response);
      return response;
    }

    if (response && response !== GlobalConst.false) {
      return response;
    } else {
      return 'Error: Internal RPC Error: requestfaucetdonation';
    }
  }

  async changeWallet() {
    const exists = await RPCModule.walletExists();

    //console.log('jc change wallet', exists);
    if (exists && exists !== GlobalConst.false) {
      await this.pauseSyncProcess();
      await RPCModule.doSaveBackup();
      const result = await RPCModule.deleteExistingWallet();

      if (!(result && result !== GlobalConst.false)) {
        return read().translate('rpc.deletewallet-error') as string;
      }
    } else {
      return read().translate('rpc.walletnotfound-error') as string;
    }
    return '';
  }

  async changeWalletNoBackup() {
    const exists = await RPCModule.walletExists();

    //console.log('jc change wallet', exists);
    if (exists && exists !== GlobalConst.false) {
      await this.pauseSyncProcess();
      const result = await RPCModule.deleteExistingWallet();

      if (!(result && result !== GlobalConst.false)) {
        return read().translate('rpc.deletewallet-error') as string;
      }
    } else {
      return read().translate('rpc.walletnotfound-error') as string;
    }
    return '';
  }

  async restoreBackup() {
    const existsBackup = await RPCModule.walletBackupExists();

    //console.log('jc restore backup', existsBackup);
    if (existsBackup && existsBackup !== GlobalConst.false) {
      const existsWallet = await RPCModule.walletExists();

      //console.log('jc restore wallet', existsWallet);
      if (existsWallet && existsWallet !== GlobalConst.false) {
        await this.pauseSyncProcess();
        await RPCModule.restoreExistingWalletBackup();
      } else {
        return read().translate('rpc.walletnotfound-error') as string;
      }
    } else {
      return read().translate('rpc.backupnotfound-error') as string;
    }
    return '';
  }

  setInSend(value: boolean): void {
    this.inSend = value;
  }

  getInSend(): boolean {
    return this.inSend;
  }

  setReadOnly(value: boolean): void {
    this.readOnly = value;
  }

  getReadOnly(): boolean {
    return this.readOnly;
  }
}
